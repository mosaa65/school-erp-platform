"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Lock, LockOpen, PencilLine, RefreshCw, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  apiClient,
  type AssessmentPeriodComponentListItem,
  type CreateStudentPeriodComponentScorePayload,
  type CreateStudentPeriodResultPayload,
  type StudentPeriodComponentScoreListItem,
  type StudentPeriodResultListItem,
} from "@/lib/api/client";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { formatStudentEnrollmentOptionLabel } from "@/lib/student-enrollment-display";

type MonthlyResultsWorkspaceMode = "results" | "scores" | "bulk";

type MonthlyResultsWorkspaceProps = {
  mode: MonthlyResultsWorkspaceMode;
};

type ResultFormState = {
  assessmentPeriodId: string;
  subjectId: string;
  studentEnrollmentId: string;
  notes: string;
  isActive: boolean;
};

type ScoreFormState = {
  studentPeriodResultId: string;
  assessmentPeriodComponentId: string;
  rawScore: string;
  finalScore: string;
  notes: string;
  isActive: boolean;
};

type BulkDraftMap = Record<string, Record<string, string>>;

const PAGE_SIZE = 12;

const DEFAULT_RESULT_FORM: ResultFormState = {
  assessmentPeriodId: "",
  subjectId: "",
  studentEnrollmentId: "",
  notes: "",
  isActive: true,
};

const DEFAULT_SCORE_FORM: ScoreFormState = {
  studentPeriodResultId: "",
  assessmentPeriodComponentId: "",
  rawScore: "0",
  finalScore: "",
  notes: "",
  isActive: true,
};

function scoreIsEditable(component: AssessmentPeriodComponentListItem | undefined) {
  return component?.entryMode !== "AGGREGATED_PERIODS";
}

function entryModeLabel(entryMode: AssessmentPeriodComponentListItem["entryMode"]) {
  switch (entryMode) {
    case "MANUAL":
      return "يدوي";
    case "AUTO_ATTENDANCE":
      return "الحضور والغياب";
    case "AUTO_HOMEWORK":
      return "الواجبات";
    case "AUTO_EXAM":
      return "الاختبارات";
    case "AGGREGATED_PERIODS":
      return "محصلة";
  }
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function MonthlyResultsWorkspace({ mode }: MonthlyResultsWorkspaceProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useRbac();

  const canCreateResult = hasPermission("student-period-results.create");
  const canUpdateResult = hasPermission("student-period-results.update");
  const canDeleteResult = hasPermission("student-period-results.delete");
  const canLockResult = hasPermission("student-period-results.lock");
  const canUnlockResult = hasPermission("student-period-results.unlock");
  const canCalculate = hasPermission("student-period-results.calculate");
  const canCreateScore = hasPermission("student-period-component-scores.create");
  const canUpdateScore = hasPermission("student-period-component-scores.update");
  const canDeleteScore = hasPermission("student-period-component-scores.delete");

  const isResultsMode = mode === "results";
  const isScoresMode = mode === "scores";
  const isBulkMode = mode === "bulk";

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [periodFilter, setPeriodFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [resultFilter, setResultFilter] = React.useState("all");
  const [lockedFilter, setLockedFilter] = React.useState<"all" | "locked" | "unlocked">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filterDraft, setFilterDraft] = React.useState({
    period: "all",
    section: "all",
    subject: "all",
    result: "all",
    locked: "all" as "all" | "locked" | "unlocked",
    active: "all" as "all" | "active" | "inactive",
  });
  const [editingResult, setEditingResult] = React.useState<StudentPeriodResultListItem | null>(null);
  const [editingScore, setEditingScore] = React.useState<StudentPeriodComponentScoreListItem | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [resultForm, setResultForm] = React.useState(DEFAULT_RESULT_FORM);
  const [scoreForm, setScoreForm] = React.useState(DEFAULT_SCORE_FORM);
  const [bulkDrafts, setBulkDrafts] = React.useState<BulkDraftMap>({});

  const periodsQuery = useQuery({
    queryKey: ["monthly-results-period-options"],
    queryFn: async () =>
      (
        await apiClient.listMonthlyAssessmentPeriods({
          page: 1,
          limit: 200,
          isActive: true,
        })
      ).data,
  });

  const sectionsQuery = useQuery({
    queryKey: ["monthly-results-section-options"],
    queryFn: async () => (await apiClient.listSections({ page: 1, limit: 100, isActive: true })).data,
  });

  const subjectsQuery = useQuery({
    queryKey: ["monthly-results-subject-options"],
    queryFn: async () => (await apiClient.listSubjects({ page: 1, limit: 100, isActive: true })).data,
  });

  const selectedPeriodForForm = React.useMemo(
    () => (periodsQuery.data ?? []).find((item) => item.id === resultForm.assessmentPeriodId),
    [periodsQuery.data, resultForm.assessmentPeriodId],
  );

  const enrollmentsQuery = useQuery({
    queryKey: ["monthly-results-enrollment-options", selectedPeriodForForm?.academicYearId ?? "all"],
    queryFn: async () =>
      (
        await apiClient.listStudentEnrollments({
          page: 1,
          limit: 200,
          academicYearId: selectedPeriodForForm?.academicYearId,
          isActive: true,
        })
      ).data,
  });

  const resultsQuery = useQuery({
    queryKey: ["monthly-results", page, search, periodFilter, sectionFilter, subjectFilter, lockedFilter, activeFilter],
    queryFn: async () =>
      apiClient.listMonthlyStudentResults({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        assessmentPeriodId: periodFilter === "all" ? undefined : periodFilter,
        sectionId: sectionFilter === "all" ? undefined : sectionFilter,
        subjectId: subjectFilter === "all" ? undefined : subjectFilter,
        isLocked: lockedFilter === "all" ? undefined : lockedFilter === "locked",
        isActive: activeFilter === "all" ? undefined : activeFilter === "active",
      }),
  });

  const filteredMonthlyResults = React.useMemo(
    () => (resultsQuery.data?.data ?? []).filter((item) => item.assessmentPeriod.category === "MONTHLY"),
    [resultsQuery.data?.data],
  );

  const componentsQuery = useQuery({
    queryKey: ["monthly-results-period-components", periodFilter, resultForm.assessmentPeriodId, scoreForm.studentPeriodResultId],
    queryFn: async () => {
      const assessmentPeriodId =
        periodFilter !== "all"
          ? periodFilter
          : resultForm.assessmentPeriodId ||
            filteredMonthlyResults.find((item) => item.id === scoreForm.studentPeriodResultId)?.assessmentPeriodId;

      if (!assessmentPeriodId) {
        return { data: [] as AssessmentPeriodComponentListItem[] };
      }

      return apiClient.listMonthlyAssessmentComponents({
        page: 1,
        limit: 100,
        assessmentPeriodId,
        isActive: true,
      });
    },
  });

  const scoresQuery = useQuery({
    queryKey: ["monthly-result-scores", page, search, periodFilter, subjectFilter, resultFilter, activeFilter],
    enabled: !isResultsMode,
    queryFn: async () =>
      apiClient.listMonthlyStudentComponentScores({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        studentPeriodResultId: resultFilter === "all" ? undefined : resultFilter,
        assessmentPeriodId: periodFilter === "all" ? undefined : periodFilter,
        subjectId: subjectFilter === "all" ? undefined : subjectFilter,
        isActive: activeFilter === "all" ? undefined : activeFilter === "active",
      }),
  });
  const filteredMonthlyScores = React.useMemo(
    () =>
      (scoresQuery.data?.data ?? []).filter(
        (item) => item.studentPeriodResult.assessmentPeriod.category === "MONTHLY",
      ),
    [scoresQuery.data?.data],
  );

  const bulkComponents = React.useMemo(
    () => (componentsQuery.data?.data ?? []).filter((item) => scoreIsEditable(item)),
    [componentsQuery.data?.data],
  );
  const bulkRows = React.useMemo(
    () =>
      filteredMonthlyResults.filter(
        (item) =>
          (periodFilter === "all" || item.assessmentPeriodId === periodFilter) &&
          (subjectFilter === "all" || item.subjectId === subjectFilter) &&
          (sectionFilter === "all" || item.studentEnrollment.sectionId === sectionFilter),
      ),
    [filteredMonthlyResults, periodFilter, sectionFilter, subjectFilter],
  );

  const bulkScoreMap = React.useMemo(() => {
    const map = new Map<string, StudentPeriodComponentScoreListItem>();
    for (const item of scoresQuery.data?.data ?? []) {
      map.set(`${item.studentPeriodResultId}:${item.assessmentPeriodComponentId}`, item);
    }
    return map;
  }, [scoresQuery.data?.data]);

  const createResultMutation = useMutation({
    mutationFn: (payload: CreateStudentPeriodResultPayload) => apiClient.createMonthlyStudentResult(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-results"] });
      setActionSuccess("تم إنشاء نتيجة شهرية.");
      handleCloseForm();
    },
  });

  const updateResultMutation = useMutation({
    mutationFn: (params: { id: string; payload: CreateStudentPeriodResultPayload }) =>
      apiClient.updateMonthlyStudentResult(params.id, params.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-results"] });
      setActionSuccess("تم تحديث النتيجة الشهرية.");
      handleCloseForm();
    },
  });

  const deleteResultMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteMonthlyStudentResult(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-results"] });
      setActionSuccess("تم حذف النتيجة الشهرية.");
    },
  });

  const lockResultMutation = useMutation({
    mutationFn: (id: string) => apiClient.lockMonthlyStudentResult(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-results"] });
      setActionSuccess("تم اعتماد النتيجة الشهرية.");
    },
  });

  const unlockResultMutation = useMutation({
    mutationFn: (id: string) => apiClient.unlockMonthlyStudentResult(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-results"] });
      setActionSuccess("تم فك اعتماد النتيجة الشهرية.");
    },
  });

  const createScoreMutation = useMutation({
    mutationFn: (payload: CreateStudentPeriodComponentScorePayload) => apiClient.createMonthlyStudentComponentScore(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-result-scores"] });
      setActionSuccess("تم إنشاء درجة المكوّن الشهري.");
      handleCloseForm();
    },
  });

  const updateScoreMutation = useMutation({
    mutationFn: (params: { id: string; payload: CreateStudentPeriodComponentScorePayload }) =>
      apiClient.updateMonthlyStudentComponentScore(params.id, params.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-result-scores"] });
      setActionSuccess("تم تحديث درجة المكوّن الشهري.");
      handleCloseForm();
    },
  });

  const deleteScoreMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteMonthlyStudentComponentScore(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-result-scores"] });
      setActionSuccess("تم حذف درجة المكوّن الشهري.");
    },
  });

  const calculateMutation = useMutation({
    mutationFn: () =>
      apiClient.calculateMonthlyStudentResults({
        assessmentPeriodId: periodFilter,
        sectionId: sectionFilter === "all" ? undefined : sectionFilter,
        subjectId: subjectFilter === "all" ? undefined : subjectFilter,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-results"] });
      void queryClient.invalidateQueries({ queryKey: ["monthly-result-scores"] });
      setActionSuccess(`تمت إعادة الحساب. نتائج ${result.updatedResults} ومكونات ${result.updatedComponents}.`);
    },
  });

  const ensureResultsMutation = useMutation({
    mutationFn: async () => {
      if (periodFilter === "all" || sectionFilter === "all" || subjectFilter === "all") {
        throw new Error("اختر الفترة والشعبة والمادة أولًا.");
      }
      const period = (periodsQuery.data ?? []).find((item) => item.id === periodFilter);
      const enrollments = await apiClient.listStudentEnrollments({
        page: 1,
        limit: 200,
        academicYearId: period?.academicYearId,
        sectionId: sectionFilter,
        isActive: true,
      });
      let count = 0;
      for (const enrollment of enrollments.data) {
        const exists = filteredMonthlyResults.some(
          (item) =>
            item.assessmentPeriodId === periodFilter &&
            item.subjectId === subjectFilter &&
            item.studentEnrollmentId === enrollment.id,
        );
        if (exists) continue;
        await apiClient.createMonthlyStudentResult({
          assessmentPeriodId: periodFilter,
          subjectId: subjectFilter,
          studentEnrollmentId: enrollment.id,
          status: "DRAFT",
          isActive: true,
        });
        count += 1;
      }
      return count;
    },
    onSuccess: (count) => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-results"] });
      setActionSuccess(count > 0 ? `تم إنشاء ${count} نتيجة شهرية ناقصة.` : "كل النتائج الشهرية موجودة.");
    },
  });

  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      let changed = 0;
      for (const row of bulkRows) {
        for (const component of bulkComponents) {
          const draftValue = bulkDrafts[row.id]?.[component.id];
          if (draftValue === undefined || draftValue === "") {
            continue;
          }
          const rawScore = Number(draftValue);
          if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > component.maxScore) {
            throw new Error(`درجة ${component.name} للطالب ${row.studentEnrollment.student.fullName} غير صالحة.`);
          }
          const key = `${row.id}:${component.id}`;
          const existing = bulkScoreMap.get(key);
          const payload: CreateStudentPeriodComponentScorePayload = {
            studentPeriodResultId: row.id,
            assessmentPeriodComponentId: component.id,
            rawScore,
            finalScore: rawScore,
            isActive: true,
          };
          if (existing) {
            await apiClient.updateMonthlyStudentComponentScore(existing.id, payload);
          } else {
            await apiClient.createMonthlyStudentComponentScore(payload);
          }
          changed += 1;
        }
      }
      return changed;
    },
    onSuccess: (changed) => {
      void queryClient.invalidateQueries({ queryKey: ["monthly-result-scores"] });
      setActionSuccess(changed > 0 ? `تم حفظ ${changed} درجة شهرية.` : "لا توجد تغييرات جديدة للحفظ.");
    },
  });

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    setPage(1);
  }, [periodFilter, sectionFilter, subjectFilter, resultFilter, lockedFilter, activeFilter]);

  React.useEffect(() => {
    if (!isBulkMode || bulkRows.length === 0) {
      return;
    }
    setBulkDrafts((prev) => {
      const next: BulkDraftMap = {};
      for (const row of bulkRows) {
        next[row.id] = {};
        for (const component of bulkComponents) {
          const existing = bulkScoreMap.get(`${row.id}:${component.id}`);
          next[row.id][component.id] = prev[row.id]?.[component.id] ?? String(existing?.rawScore ?? "");
        }
      }
      return next;
    });
  }, [bulkComponents, bulkRows, bulkScoreMap, isBulkMode]);

  function handleCloseForm() {
    setIsFormOpen(false);
    setEditingResult(null);
    setEditingScore(null);
    setResultForm(DEFAULT_RESULT_FORM);
    setScoreForm(DEFAULT_SCORE_FORM);
    setFormError(null);
  }

  function openCreate() {
    setActionSuccess(null);
    setFormError(null);
    setEditingResult(null);
    setEditingScore(null);
    if (isResultsMode || isBulkMode) {
      setResultForm({
        ...DEFAULT_RESULT_FORM,
        assessmentPeriodId: periodFilter === "all" ? "" : periodFilter,
        subjectId: subjectFilter === "all" ? "" : subjectFilter,
      });
    } else {
      setScoreForm({
        ...DEFAULT_SCORE_FORM,
        studentPeriodResultId: resultFilter === "all" ? "" : resultFilter,
      });
    }
    setIsFormOpen(true);
  }

  function openEditResult(item: StudentPeriodResultListItem) {
    setEditingResult(item);
    setEditingScore(null);
    setResultForm({
      assessmentPeriodId: item.assessmentPeriodId,
      subjectId: item.subjectId,
      studentEnrollmentId: item.studentEnrollmentId,
      notes: item.notes ?? "",
      isActive: item.isActive,
    });
    setIsFormOpen(true);
  }

  function openEditScore(item: StudentPeriodComponentScoreListItem) {
    setEditingScore(item);
    setEditingResult(null);
    setScoreForm({
      studentPeriodResultId: item.studentPeriodResultId,
      assessmentPeriodComponentId: item.assessmentPeriodComponentId,
      rawScore: String(item.rawScore),
      finalScore: String(item.finalScore),
      notes: item.notes ?? "",
      isActive: item.isActive,
    });
    setIsFormOpen(true);
  }

  function handleSubmit() {
    setActionSuccess(null);
    if (isResultsMode || isBulkMode) {
      if (!resultForm.assessmentPeriodId || !resultForm.subjectId || !resultForm.studentEnrollmentId) {
        setFormError("الفترة الشهرية والمادة والطالب مطلوبة.");
        return;
      }
      const payload: CreateStudentPeriodResultPayload = {
        assessmentPeriodId: resultForm.assessmentPeriodId,
        subjectId: resultForm.subjectId,
        studentEnrollmentId: resultForm.studentEnrollmentId,
        status: "DRAFT",
        notes: resultForm.notes.trim() || undefined,
        isActive: resultForm.isActive,
      };
      if (editingResult) {
        updateResultMutation.mutate({ id: editingResult.id, payload });
      } else {
        createResultMutation.mutate(payload);
      }
      return;
    }

    if (!scoreForm.studentPeriodResultId || !scoreForm.assessmentPeriodComponentId) {
      setFormError("النتيجة الشهرية والمكوّن مطلوبان.");
      return;
    }
    const component = (componentsQuery.data?.data ?? []).find((item) => item.id === scoreForm.assessmentPeriodComponentId);
    const rawScore = Number(scoreForm.rawScore);
    if (!Number.isFinite(rawScore) || rawScore < 0) {
      setFormError("الدرجة الخام غير صالحة.");
      return;
    }
    if (component && rawScore > component.maxScore) {
      setFormError(`الدرجة الخام لا يجب أن تتجاوز ${component.maxScore}.`);
      return;
    }
    const payload: CreateStudentPeriodComponentScorePayload = {
      studentPeriodResultId: scoreForm.studentPeriodResultId,
      assessmentPeriodComponentId: scoreForm.assessmentPeriodComponentId,
      rawScore,
      finalScore: toOptionalNumber(scoreForm.finalScore),
      notes: scoreForm.notes.trim() || undefined,
      isActive: scoreForm.isActive,
    };
    if (editingScore) {
      updateScoreMutation.mutate({ id: editingScore.id, payload });
    } else {
      createScoreMutation.mutate(payload);
    }
  }

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setPeriodFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setResultFilter("all");
    setLockedFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
    setPage(1);
  };

  const applyFilters = () => {
    setPeriodFilter(filterDraft.period);
    setSectionFilter(filterDraft.section);
    setSubjectFilter(filterDraft.subject);
    setResultFilter(filterDraft.result);
    setLockedFilter(filterDraft.locked);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
    setPage(1);
  };

  const activeFiltersCount = [
    searchInput.trim() ? 1 : 0,
    periodFilter !== "all" ? 1 : 0,
    sectionFilter !== "all" ? 1 : 0,
    subjectFilter !== "all" ? 1 : 0,
    resultFilter !== "all" ? 1 : 0,
    lockedFilter !== "all" ? 1 : 0,
    activeFilter !== "all" ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);

  const title =
    mode === "results"
      ? "سجلات نتائج الفترات الشهرية"
      : mode === "scores"
        ? "سجلات درجات مكونات الشهر"
        : "سجلات الإدخال الجماعي الشهري";

  const description =
    mode === "results"
      ? "إدارة النتائج الشهرية للطلاب بفلاتر موحدة ونموذج إضافة مستقل."
      : mode === "scores"
        ? "إدارة درجات مكونات الشهر كسجلات مستقلة قابلة للإضافة والتعديل."
        : "إدخال درجات الشهر للطلاب بشكل جماعي من شاشة شهرية مستقلة.";

  const listTotal = isResultsMode || isBulkMode ? resultsQuery.data?.pagination.total ?? 0 : filteredMonthlyScores.length;
  const mutationError =
    (createResultMutation.error as Error | null)?.message ??
    (updateResultMutation.error as Error | null)?.message ??
    (deleteResultMutation.error as Error | null)?.message ??
    (lockResultMutation.error as Error | null)?.message ??
    (unlockResultMutation.error as Error | null)?.message ??
    (createScoreMutation.error as Error | null)?.message ??
    (updateScoreMutation.error as Error | null)?.message ??
    (deleteScoreMutation.error as Error | null)?.message ??
    (calculateMutation.error as Error | null)?.message ??
    (ensureResultsMutation.error as Error | null)?.message ??
    (bulkSaveMutation.error as Error | null)?.message ??
    null;
  const isSubmitting =
    createResultMutation.isPending ||
    updateResultMutation.isPending ||
    createScoreMutation.isPending ||
    updateScoreMutation.isPending;

  return (
    <>
      <div className="space-y-4">
        {actionSuccess ? (
          <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-700">
            {actionSuccess}
          </div>
        ) : null}

        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder={isScoresMode ? "ابحث بدرجات مكونات الشهر..." : "ابحث باسم الطالب..."}
          filterCount={activeFiltersCount}
          onFilterClick={() => {
            setFilterDraft({
              period: periodFilter,
              section: sectionFilter,
              subject: subjectFilter,
              result: resultFilter,
              locked: lockedFilter,
              active: activeFilter,
            });
            setIsFilterOpen(true);
          }}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفلترة"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>الفترة الشهرية</Label>
              <SelectField value={filterDraft.period} onChange={(event) => setFilterDraft((prev) => ({ ...prev, period: event.target.value }))}>
                <option value="all">كل الفترات الشهرية</option>
                {(periodsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-1">
              <Label>الشعبة</Label>
              <SelectField value={filterDraft.section} onChange={(event) => setFilterDraft((prev) => ({ ...prev, section: event.target.value }))}>
                <option value="all">كل الشعب</option>
                {(sectionsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatSectionWithGradeLabel(item)}</option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-1">
              <Label>المادة</Label>
              <SelectField value={filterDraft.subject} onChange={(event) => setFilterDraft((prev) => ({ ...prev, subject: event.target.value }))}>
                <option value="all">كل المواد</option>
                {(subjectsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
                ))}
              </SelectField>
            </div>
            {isScoresMode ? (
              <div className="space-y-1">
                <Label>النتيجة الشهرية</Label>
                <SelectField value={filterDraft.result} onChange={(event) => setFilterDraft((prev) => ({ ...prev, result: event.target.value }))}>
                  <option value="all">كل النتائج</option>
                  {filteredMonthlyResults.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.studentEnrollment.student.fullName} - {item.assessmentPeriod.name}
                    </option>
                  ))}
                </SelectField>
              </div>
            ) : null}
            {!isScoresMode ? (
              <div className="space-y-1">
                <Label>حالة الاعتماد</Label>
                <SelectField value={filterDraft.locked} onChange={(event) => setFilterDraft((prev) => ({ ...prev, locked: event.target.value as "all" | "locked" | "unlocked" }))}>
                  <option value="all">كل الحالات</option>
                  <option value="locked">المعتمدة فقط</option>
                  <option value="unlocked">غير المعتمدة فقط</option>
                </SelectField>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label>الحالة</Label>
              <SelectField value={filterDraft.active} onChange={(event) => setFilterDraft((prev) => ({ ...prev, active: event.target.value as "all" | "active" | "inactive" }))}>
                <option value="all">كل الحالات</option>
                <option value="active">النشطة فقط</option>
                <option value="inactive">غير النشطة فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{title}</CardTitle>
              <Badge variant="secondary">الإجمالي: {listTotal}</Badge>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mutationError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {mutationError}
              </div>
            ) : null}

            {isBulkMode ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => ensureResultsMutation.mutate()} disabled={!canCreateResult || ensureResultsMutation.isPending || periodFilter === "all" || sectionFilter === "all" || subjectFilter === "all"}>
                  توليد النتائج الناقصة
                </Button>
                <Button onClick={() => bulkSaveMutation.mutate()} disabled={!canCreateScore || bulkSaveMutation.isPending || bulkRows.length === 0 || bulkComponents.length === 0}>
                  <Save className="h-4 w-4" />
                  حفظ الإدخال الجماعي
                </Button>
                <Button variant="secondary" onClick={() => calculateMutation.mutate()} disabled={!canCalculate || calculateMutation.isPending || periodFilter === "all"}>
                  <Calculator className="h-4 w-4" />
                  إعادة حساب الشهر
                </Button>
              </div>
            ) : null}

            {isResultsMode || isBulkMode ? (
              filteredMonthlyResults.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">لا توجد نتائج شهرية مطابقة.</div>
              ) : isBulkMode ? (
                <div className="space-y-3">
                  {bulkRows.map((row) => (
                    <div key={row.id} className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <div className="mb-3 space-y-1">
                        <p className="font-medium">{row.studentEnrollment.student.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.assessmentPeriod.name} | {formatNameCodeLabel(row.subject.name, row.subject.code)}
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {bulkComponents.map((component) => (
                          <div key={component.id} className="space-y-1">
                            <Label>{component.name} ({component.maxScore})</Label>
                            <Input
                              type="number"
                              value={bulkDrafts[row.id]?.[component.id] ?? ""}
                              onChange={(event) =>
                                setBulkDrafts((prev) => ({
                                  ...prev,
                                  [row.id]: {
                                    ...prev[row.id],
                                    [component.id]: event.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                filteredMonthlyResults.map((item) => (
                  <div key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-medium">{item.studentEnrollment.student.fullName}</p>
                        <p className="text-xs text-muted-foreground">{item.assessmentPeriod.name}</p>
                        <p className="text-xs text-muted-foreground">{formatNameCodeLabel(item.subject.name, item.subject.code)} | المجموع: {item.totalScore}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isLocked ? "default" : "secondary"}>{item.isLocked ? "معتمد" : "مسودة"}</Badge>
                        <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "نشط" : "غير نشط"}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEditResult(item)} disabled={!canUpdateResult}>
                        <PencilLine className="h-3.5 w-3.5" />
                        تعديل
                      </Button>
                      {item.isLocked ? (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => unlockResultMutation.mutate(item.id)} disabled={!canUnlockResult || unlockResultMutation.isPending}>
                          <LockOpen className="h-3.5 w-3.5" />
                          فك الاعتماد
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => lockResultMutation.mutate(item.id)} disabled={!canLockResult || lockResultMutation.isPending}>
                          <Lock className="h-3.5 w-3.5" />
                          اعتماد
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => deleteResultMutation.mutate(item.id)} disabled={!canDeleteResult || deleteResultMutation.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </Button>
                    </div>
                  </div>
                ))
              )
            ) : filteredMonthlyScores.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">لا توجد درجات مكونات شهرية مطابقة.</div>
            ) : (
              filteredMonthlyScores.map((item) => (
                <div key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">{item.studentPeriodResult.studentEnrollment.student.fullName}</p>
                      <p className="text-xs text-muted-foreground">{item.assessmentPeriodComponent.name} | {entryModeLabel(item.assessmentPeriodComponent.entryMode)}</p>
                      <p className="text-xs text-muted-foreground">خام: {item.rawScore} | نهائي: {item.finalScore} | الحد: {item.assessmentPeriodComponent.maxScore}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={item.isAutoCalculated ? "default" : "secondary"}>{item.isAutoCalculated ? "تلقائي" : "يدوي"}</Badge>
                      <Badge variant={item.isActive ? "default" : "outline"}>{item.isActive ? "نشط" : "غير نشط"}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEditScore(item)} disabled={!canUpdateScore || item.isAutoCalculated}>
                      <PencilLine className="h-3.5 w-3.5" />
                      تعديل
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => deleteScoreMutation.mutate(item.id)} disabled={!canDeleteScore || deleteScoreMutation.isPending || item.isAutoCalculated}>
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                الصفحة {(isResultsMode || isBulkMode ? resultsQuery.data?.pagination.page : scoresQuery.data?.pagination.page) ?? 1} من {(isResultsMode || isBulkMode ? resultsQuery.data?.pagination.totalPages : scoresQuery.data?.pagination.totalPages) ?? 1}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page <= 1}>
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(
                        prev + 1,
                        (isResultsMode || isBulkMode
                          ? resultsQuery.data?.pagination.totalPages
                          : scoresQuery.data?.pagination.totalPages) ?? prev,
                      ),
                    )
                  }
                  disabled={
                    page >=
                    ((isResultsMode || isBulkMode
                      ? resultsQuery.data?.pagination.totalPages
                      : scoresQuery.data?.pagination.totalPages) ?? 1)
                  }
                >
                  التالي
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void (isResultsMode || isBulkMode ? resultsQuery.refetch() : scoresQuery.refetch())}>
                  <RefreshCw className="h-4 w-4" />
                  تحديث
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        onClick={openCreate}
        ariaLabel={isScoresMode ? "إنشاء درجة شهرية" : "إنشاء نتيجة شهرية"}
        disabled={isScoresMode ? !canCreateScore : !canCreateResult}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={
          isScoresMode
            ? editingScore
              ? "تعديل درجة مكوّن شهري"
              : "إنشاء درجة مكوّن شهري"
            : editingResult
              ? "تعديل نتيجة شهرية"
              : "إنشاء نتيجة شهرية"
        }
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        submitLabel={editingScore || editingResult ? "حفظ التعديلات" : "إنشاء"}
        isSubmitting={isSubmitting}
        showCancelButton
      >
        {isScoresMode ? (
          <div className="space-y-3">
            <FormField label="النتيجة الشهرية" required>
              <SelectField value={scoreForm.studentPeriodResultId} onChange={(event) => setScoreForm((prev) => ({ ...prev, studentPeriodResultId: event.target.value }))}>
                <option value="">اختر النتيجة الشهرية</option>
                {filteredMonthlyResults.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.studentEnrollment.student.fullName} - {item.assessmentPeriod.name} - {item.subject.name}
                  </option>
                ))}
              </SelectField>
            </FormField>
            <FormField label="مكوّن الشهر" required>
              <SelectField value={scoreForm.assessmentPeriodComponentId} onChange={(event) => setScoreForm((prev) => ({ ...prev, assessmentPeriodComponentId: event.target.value }))}>
                <option value="">اختر مكوّن الشهر</option>
                {(componentsQuery.data?.data ?? []).filter((item) => scoreIsEditable(item)).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.maxScore})
                  </option>
                ))}
              </SelectField>
            </FormField>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="الدرجة الخام" required>
                <Input type="number" value={scoreForm.rawScore} onChange={(event) => setScoreForm((prev) => ({ ...prev, rawScore: event.target.value }))} />
              </FormField>
              <FormField label="الدرجة النهائية">
                <Input type="number" value={scoreForm.finalScore} onChange={(event) => setScoreForm((prev) => ({ ...prev, finalScore: event.target.value }))} />
              </FormField>
            </div>
            <FormField label="ملاحظات">
              <TextareaField value={scoreForm.notes} onChange={(event) => setScoreForm((prev) => ({ ...prev, notes: event.target.value }))} rows={4} />
            </FormField>
            <FormBooleanField label="الحالة النشطة" checked={scoreForm.isActive} onCheckedChange={(checked) => setScoreForm((prev) => ({ ...prev, isActive: checked }))} />
            {formError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div> : null}
          </div>
        ) : (
          <div className="space-y-3">
            <FormField label="الفترة الشهرية" required>
              <SelectField value={resultForm.assessmentPeriodId} onChange={(event) => setResultForm((prev) => ({ ...prev, assessmentPeriodId: event.target.value }))}>
                <option value="">اختر الفترة الشهرية</option>
                {(periodsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </SelectField>
            </FormField>
            <FormField label="المادة" required>
              <SelectField value={resultForm.subjectId} onChange={(event) => setResultForm((prev) => ({ ...prev, subjectId: event.target.value }))}>
                <option value="">اختر المادة</option>
                {(subjectsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
                ))}
              </SelectField>
            </FormField>
            <FormField label="الطالب" required>
              <SelectField value={resultForm.studentEnrollmentId} onChange={(event) => setResultForm((prev) => ({ ...prev, studentEnrollmentId: event.target.value }))}>
                <option value="">اختر الطالب</option>
                {(enrollmentsQuery.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{formatStudentEnrollmentOptionLabel(item)}</option>
                ))}
              </SelectField>
            </FormField>
            <FormField label="ملاحظات">
              <TextareaField value={resultForm.notes} onChange={(event) => setResultForm((prev) => ({ ...prev, notes: event.target.value }))} rows={4} />
            </FormField>
            <FormBooleanField label="الحالة النشطة" checked={resultForm.isActive} onCheckedChange={(checked) => setResultForm((prev) => ({ ...prev, isActive: checked }))} />
            {formError ? <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div> : null}
          </div>
        )}
      </BottomSheetForm>
    </>
  );
}
