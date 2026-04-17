"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, LoaderCircle, Lock, LockOpen, PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  ApiError,
  apiClient,
  type AssessmentPeriodComponentListItem,
  type AssessmentPeriodListItem,
  type CreateStudentPeriodComponentScorePayload,
  type CreateStudentPeriodResultPayload,
  type StudentPeriodComponentScoreListItem,
  type StudentPeriodResultListItem,
} from "@/lib/api/client";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { formatStudentEnrollmentOptionLabel } from "@/lib/student-enrollment-display";

type StudentPeriodResultsWorkspaceProps = {
  allowedCategories?: ("MONTHLY" | "SEMESTER" | "YEAR_FINAL")[];
  fixedWorkspaceView?: "overview" | "results" | "bulk";
  hideWorkspaceSwitcher?: boolean;
  searchPlaceholder?: string;
  actions?: {
    createResult?: boolean;
    createScore?: boolean;
    ensureResults?: boolean;
    calculate?: boolean;
  };
  labels?: {
    workflowTitle?: string;
    contextTitle?: string;
    quickActionsTitle?: string;
    resultsTitle?: string;
    resultComponentsTitle?: string;
    bulkTitle?: string;
  };
  visiblePanels?: {
    resultDetails?: boolean;
    bulk?: boolean;
  };
};

type ResultFormState = {
  assessmentPeriodId: string;
  subjectId: string;
  studentEnrollmentId: string;
  notes: string;
};

type ScoreFormState = {
  studentPeriodResultId: string;
  assessmentPeriodComponentId: string;
  rawScore: string;
  finalScore: string;
  notes: string;
};

type BulkDraftMap = Record<string, Record<string, string>>;

const DEFAULT_RESULT_FORM: ResultFormState = {
  assessmentPeriodId: "",
  subjectId: "",
  studentEnrollmentId: "",
  notes: "",
};

const DEFAULT_SCORE_FORM: ScoreFormState = {
  studentPeriodResultId: "",
  assessmentPeriodComponentId: "",
  rawScore: "0",
  finalScore: "",
  notes: "",
};

function toOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function scoreIsEditable(component: AssessmentPeriodComponentListItem | undefined) {
  return component?.entryMode !== "AGGREGATED_PERIODS";
}

function entryModeLabel(component: AssessmentPeriodComponentListItem | StudentPeriodComponentScoreListItem["assessmentPeriodComponent"]) {
  switch (component.entryMode) {
    case "MANUAL":
      return "يدوي";
    case "AUTO_ATTENDANCE":
      return "حضور";
    case "AUTO_HOMEWORK":
      return "واجبات";
    case "AUTO_EXAM":
      return "اختبار";
    case "AGGREGATED_PERIODS":
      return "محصلة";
  }
}

function formatPeriodScope(item: AssessmentPeriodListItem | StudentPeriodResultListItem["assessmentPeriod"]) {
  return item.name;
}

export function StudentPeriodResultsWorkspace({
  allowedCategories,
  fixedWorkspaceView,
  hideWorkspaceSwitcher = false,
  searchPlaceholder = "ابحث باسم الطالب...",
  actions,
  labels,
  visiblePanels,
}: StudentPeriodResultsWorkspaceProps = {}) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { hasPermission } = useRbac();

  const canCreateResult = hasPermission("student-period-results.create");
  const canUpdateResult = hasPermission("student-period-results.update");
  const canDeleteResult = hasPermission("student-period-results.delete");
  const canCalculate = hasPermission("student-period-results.calculate");
  const canLockResult = hasPermission("student-period-results.lock");
  const canUnlockResult = hasPermission("student-period-results.unlock");
  const canCreateScore = hasPermission("student-period-component-scores.create");
  const canUpdateScore = hasPermission("student-period-component-scores.update");
  const canDeleteScore = hasPermission("student-period-component-scores.delete");
  const allowCreateResultAction = actions?.createResult ?? true;
  const allowCreateScoreAction = actions?.createScore ?? true;
  const allowEnsureResultsAction = actions?.ensureResults ?? true;
  const allowCalculateAction = actions?.calculate ?? true;

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [periodFilter, setPeriodFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [lockedFilter, setLockedFilter] = React.useState<"all" | "locked" | "unlocked">("all");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filterDraft, setFilterDraft] = React.useState<{
    period: string;
    section: string;
    subject: string;
    locked: "all" | "locked" | "unlocked";
  }>({
    period: "all",
    section: "all",
    subject: "all",
    locked: "all",
  });
  const [selectedResultId, setSelectedResultId] = React.useState<string | null>(null);
  const [resultForm, setResultForm] = React.useState(DEFAULT_RESULT_FORM);
  const [scoreForm, setScoreForm] = React.useState(DEFAULT_SCORE_FORM);
  const [editingResult, setEditingResult] = React.useState<StudentPeriodResultListItem | null>(null);
  const [editingScore, setEditingScore] = React.useState<StudentPeriodComponentScoreListItem | null>(null);
  const [resultSheetOpen, setResultSheetOpen] = React.useState(false);
  const [scoreSheetOpen, setScoreSheetOpen] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [bulkDrafts, setBulkDrafts] = React.useState<BulkDraftMap>({});
  const [workspaceView, setWorkspaceView] = React.useState<"overview" | "results" | "bulk">(
    fixedWorkspaceView ?? "overview",
  );

  const onAuthError = React.useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        auth.signOut();
      }
    },
    [auth],
  );

  const invalidate = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["student-period-results"] });
    void queryClient.invalidateQueries({ queryKey: ["student-period-component-scores"] });
  }, [queryClient]);

  const periodsQuery = useQuery({
    queryKey: ["assessment-periods", "options", "student-period-results"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => (await apiClient.listAssessmentPeriods({ page: 1, limit: 100, isActive: true })).data,
  });

  const periods = React.useMemo(
    () =>
      allowedCategories && allowedCategories.length > 0
        ? (periodsQuery.data ?? []).filter((item) => allowedCategories.includes(item.category))
        : (periodsQuery.data ?? []),
    [allowedCategories, periodsQuery.data],
  );

  const selectedBulkPeriod = periods.find((item) => item.id === periodFilter);

  const sectionsQuery = useQuery({
    queryKey: ["sections", "options", "student-period-results"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => (await apiClient.listSections({ page: 1, limit: 100, isActive: true })).data,
  });

  const subjectsQuery = useQuery({
    queryKey: ["subjects", "options", "student-period-results"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () => (await apiClient.listSubjects({ page: 1, limit: 100, isActive: true })).data,
  });

  const selectedPeriodForForm = periods.find(
    (item) => item.id === resultForm.assessmentPeriodId,
  );

  const enrollmentsQuery = useQuery({
    queryKey: ["student-enrollments", "options", selectedPeriodForForm?.academicYearId ?? "all"],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () =>
      (
        await apiClient.listStudentEnrollments({
          page: 1,
          limit: 100,
          academicYearId: selectedPeriodForForm?.academicYearId,
          isActive: true,
        })
      ).data,
  });

  const bulkEnrollmentsQuery = useQuery({
    queryKey: [
      "student-enrollments",
      "bulk-period-results",
      selectedBulkPeriod?.academicYearId ?? "all",
      sectionFilter,
    ],
    enabled:
      auth.isHydrated &&
      auth.isAuthenticated &&
      periodFilter !== "all" &&
      sectionFilter !== "all" &&
      Boolean(selectedBulkPeriod?.academicYearId),
    queryFn: async () =>
      (
        await apiClient.listStudentEnrollments({
          page: 1,
          limit: 200,
          academicYearId: selectedBulkPeriod?.academicYearId,
          sectionId: sectionFilter === "all" ? undefined : sectionFilter,
          isActive: true,
        })
      ).data,
  });

  const resultsQuery = useQuery({
    queryKey: ["student-period-results", "list", search, periodFilter, sectionFilter, subjectFilter],
    enabled: auth.isHydrated && auth.isAuthenticated,
    queryFn: async () =>
      apiClient.listStudentPeriodResults({
        page: 1,
        limit: 100,
        search: search || undefined,
        assessmentPeriodId: periodFilter === "all" ? undefined : periodFilter,
        sectionId: sectionFilter === "all" ? undefined : sectionFilter,
        subjectId: subjectFilter === "all" ? undefined : subjectFilter,
        isActive: true,
      }),
  });

  const scoresQuery = useQuery({
    queryKey: ["student-period-component-scores", selectedResultId],
    enabled: auth.isHydrated && auth.isAuthenticated && Boolean(selectedResultId),
    queryFn: async () =>
      apiClient.listStudentPeriodComponentScores({
        page: 1,
        limit: 100,
        studentPeriodResultId: selectedResultId ?? undefined,
        isActive: true,
      }),
  });

  const selectedResult =
    (resultsQuery.data?.data ?? []).find((item) => item.id === selectedResultId) ?? null;

  const componentsQuery = useQuery({
    queryKey: ["assessment-period-components", "result", selectedResult?.assessmentPeriodId],
    enabled: auth.isHydrated && auth.isAuthenticated && Boolean(selectedResult?.assessmentPeriodId),
    queryFn: async () =>
      apiClient.listAssessmentPeriodComponents({
        page: 1,
        limit: 100,
        assessmentPeriodId: selectedResult?.assessmentPeriodId,
        isActive: true,
      }),
  });

  const bulkComponentsQuery = useQuery({
    queryKey: ["assessment-period-components", "bulk", periodFilter],
    enabled: auth.isHydrated && auth.isAuthenticated && periodFilter !== "all",
    queryFn: async () =>
      apiClient.listAssessmentPeriodComponents({
        page: 1,
        limit: 100,
        assessmentPeriodId: periodFilter,
        isActive: true,
      }),
  });

  const bulkScoresQuery = useQuery({
    queryKey: ["student-period-component-scores", "bulk", periodFilter, sectionFilter, subjectFilter],
    enabled:
      auth.isHydrated &&
      auth.isAuthenticated &&
      periodFilter !== "all" &&
      sectionFilter !== "all" &&
      subjectFilter !== "all",
    queryFn: async () =>
      apiClient.listStudentPeriodComponentScores({
        page: 1,
        limit: 500,
        assessmentPeriodId: periodFilter,
        subjectId: subjectFilter,
        isActive: true,
      }),
  });

  const createResultMutation = useMutation({
    mutationFn: (payload: CreateStudentPeriodResultPayload) => apiClient.createStudentPeriodResult(payload),
    onSuccess: () => {
      invalidate();
      setResultSheetOpen(false);
      setMessage("تم حفظ النتيجة.");
    },
    onError: onAuthError,
  });

  const updateResultMutation = useMutation({
    mutationFn: (params: { id: string; payload: CreateStudentPeriodResultPayload }) =>
      apiClient.updateStudentPeriodResult(params.id, params.payload),
    onSuccess: () => {
      invalidate();
      setResultSheetOpen(false);
      setMessage("تم تحديث النتيجة.");
    },
    onError: onAuthError,
  });

  const deleteResultMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteStudentPeriodResult(id),
    onSuccess: () => {
      invalidate();
      setSelectedResultId(null);
      setMessage("تم حذف النتيجة.");
    },
    onError: onAuthError,
  });

  const lockResultMutation = useMutation({
    mutationFn: (id: string) => apiClient.lockStudentPeriodResult(id),
    onSuccess: () => {
      invalidate();
      setMessage("تم قفل النتيجة واعتمادها.");
    },
    onError: onAuthError,
  });

  const unlockResultMutation = useMutation({
    mutationFn: (id: string) => apiClient.unlockStudentPeriodResult(id),
    onSuccess: () => {
      invalidate();
      setMessage("تم فك قفل النتيجة.");
    },
    onError: onAuthError,
  });

  const calculateMutation = useMutation({
    mutationFn: () =>
      apiClient.calculateStudentPeriodResults({
        assessmentPeriodId: periodFilter,
        sectionId: sectionFilter === "all" ? undefined : sectionFilter,
        subjectId: subjectFilter === "all" ? undefined : subjectFilter,
      }),
    onSuccess: (result) => {
      invalidate();
      setMessage(`تمت إعادة الحساب. نتائج ${result.updatedResults} ومكوّنات ${result.updatedComponents}.`);
    },
    onError: onAuthError,
  });

  const createScoreMutation = useMutation({
    mutationFn: (payload: CreateStudentPeriodComponentScorePayload) =>
      apiClient.createStudentPeriodComponentScore(payload),
    onSuccess: () => {
      invalidate();
      setScoreSheetOpen(false);
      setMessage("تم حفظ درجة المكوّن.");
    },
    onError: onAuthError,
  });

  const updateScoreMutation = useMutation({
    mutationFn: (params: { id: string; payload: CreateStudentPeriodComponentScorePayload }) =>
      apiClient.updateStudentPeriodComponentScore(params.id, params.payload),
    onSuccess: () => {
      invalidate();
      setScoreSheetOpen(false);
      setMessage("تم تحديث درجة المكوّن.");
    },
    onError: onAuthError,
  });

  const deleteScoreMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteStudentPeriodComponentScore(id),
    onSuccess: () => {
      invalidate();
      setMessage("تم حذف درجة المكوّن.");
    },
    onError: onAuthError,
  });

  const bulkSaveMutation = useMutation({
    mutationFn: async () => {
      const editableComponents = (bulkComponentsQuery.data?.data ?? []).filter((item) =>
        scoreIsEditable(item),
      );
      const existingScores = bulkScoresQuery.data?.data ?? [];
      const rows = (resultsQuery.data?.data ?? []).filter(
        (item) =>
          item.assessmentPeriodId === periodFilter &&
          item.subjectId === subjectFilter &&
          item.studentEnrollment.sectionId === sectionFilter,
      );

      let changedCount = 0;

      for (const row of rows) {
        for (const component of editableComponents) {
          const draftValue = bulkDrafts[row.id]?.[component.id];
          if (draftValue === undefined) {
            continue;
          }

          const rawScore = Number(draftValue);
          if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > component.maxScore) {
            throw new Error(`درجة ${component.name} للطالب ${row.studentEnrollment.student.fullName} غير صالحة.`);
          }

          const existing = existingScores.find(
            (item) =>
              item.studentPeriodResultId === row.id &&
              item.assessmentPeriodComponentId === component.id,
          );

          if (existing && Number(existing.rawScore) === rawScore) {
            continue;
          }

          const payload: CreateStudentPeriodComponentScorePayload = {
            studentPeriodResultId: row.id,
            assessmentPeriodComponentId: component.id,
            rawScore,
            finalScore: rawScore,
            isActive: true,
          };

          if (existing) {
            await apiClient.updateStudentPeriodComponentScore(existing.id, payload);
          } else {
            await apiClient.createStudentPeriodComponentScore(payload);
          }

          changedCount += 1;
        }
      }

      return changedCount;
    },
    onSuccess: (changedCount) => {
      invalidate();
      setMessage(changedCount > 0 ? `تم حفظ ${changedCount} درجة في الإدخال الجماعي.` : "لا توجد تغييرات جديدة للحفظ.");
    },
    onError: onAuthError,
  });

  const ensureResultsMutation = useMutation({
    mutationFn: async () => {
      if (periodFilter === "all" || subjectFilter === "all" || sectionFilter === "all") {
        throw new Error("اختر الفترة والشعبة والمادة أولًا.");
      }

      const enrollments = bulkEnrollmentsQuery.data ?? [];
      const existingResults = resultsQuery.data?.data ?? [];
      let createdCount = 0;

      for (const enrollment of enrollments) {
        const alreadyExists = existingResults.some(
          (item) =>
            item.assessmentPeriodId === periodFilter &&
            item.subjectId === subjectFilter &&
            item.studentEnrollmentId === enrollment.id,
        );

        if (alreadyExists) {
          continue;
        }

        await apiClient.createStudentPeriodResult({
          assessmentPeriodId: periodFilter,
          subjectId: subjectFilter,
          studentEnrollmentId: enrollment.id,
          status: "DRAFT",
          isActive: true,
        });

        createdCount += 1;
      }

      return createdCount;
    },
    onSuccess: (createdCount) => {
      invalidate();
      setMessage(
        createdCount > 0
          ? `تم إنشاء ${createdCount} نتيجة مفقودة تلقائيًا.`
          : "كل النتائج المطلوبة موجودة بالفعل.",
      );
    },
    onError: onAuthError,
  });

  React.useEffect(() => {
    if (fixedWorkspaceView) {
      setWorkspaceView(fixedWorkspaceView);
    }
  }, [fixedWorkspaceView]);

  useDebounceEffect(() => {
    setSearch(searchInput.trim());
  }, 350, [searchInput]);

  React.useEffect(() => {
    if (periodFilter !== "all" && !periods.some((item) => item.id === periodFilter)) {
      setPeriodFilter("all");
    }
  }, [periodFilter, periods]);

  React.useEffect(() => {
    if (
      resultForm.assessmentPeriodId &&
      !periods.some((item) => item.id === resultForm.assessmentPeriodId)
    ) {
      setResultForm((prev) => ({ ...prev, assessmentPeriodId: "" }));
    }
  }, [periods, resultForm.assessmentPeriodId]);

  const scores = scoresQuery.data?.data ?? [];
  const components = componentsQuery.data?.data ?? [];
  const selectedResultEditableComponents = components.filter((item) => scoreIsEditable(item));
  const bulkComponents = (bulkComponentsQuery.data?.data ?? []).filter((item) => scoreIsEditable(item));
  const filteredResults = (resultsQuery.data?.data ?? []).filter((item) => {
    if (lockedFilter === "locked" && !item.isLocked) {
      return false;
    }
    if (lockedFilter === "unlocked" && item.isLocked) {
      return false;
    }
    return true;
  });
  const bulkRows = (resultsQuery.data?.data ?? []).filter(
    (item) =>
      item.assessmentPeriodId === periodFilter &&
      item.subjectId === subjectFilter &&
      item.studentEnrollment.sectionId === sectionFilter,
  );
  const bulkScoreMap = React.useMemo(() => {
    const map = new Map<string, StudentPeriodComponentScoreListItem>();
    for (const item of bulkScoresQuery.data?.data ?? []) {
      map.set(`${item.studentPeriodResultId}:${item.assessmentPeriodComponentId}`, item);
    }
    return map;
  }, [bulkScoresQuery.data?.data]);
  const mutationError =
    (createResultMutation.error as Error | null)?.message ??
    (updateResultMutation.error as Error | null)?.message ??
    (deleteResultMutation.error as Error | null)?.message ??
    (lockResultMutation.error as Error | null)?.message ??
    (unlockResultMutation.error as Error | null)?.message ??
    (calculateMutation.error as Error | null)?.message ??
    (createScoreMutation.error as Error | null)?.message ??
    (updateScoreMutation.error as Error | null)?.message ??
    (deleteScoreMutation.error as Error | null)?.message ??
    (bulkSaveMutation.error as Error | null)?.message ??
    (ensureResultsMutation.error as Error | null)?.message ??
    null;
  const readyForBulkEntry =
    periodFilter !== "all" && sectionFilter !== "all" && subjectFilter !== "all";
  const activeResultsCount = filteredResults.length;
  const lockedResultsCount = filteredResults.filter((item) => item.isLocked).length;
  const showResultDetails = visiblePanels?.resultDetails ?? true;
  const showBulkPanel = visiblePanels?.bulk ?? true;
  const showQuickActions =
    (canCreateResult && allowCreateResultAction) ||
    (canCreateScore && allowCreateScoreAction) ||
    (canCreateResult && allowEnsureResultsAction) ||
    (canCalculate && allowCalculateAction);
  const activeFiltersCount = [
    searchInput.trim() ? 1 : 0,
    periodFilter !== "all" ? 1 : 0,
    sectionFilter !== "all" ? 1 : 0,
    subjectFilter !== "all" ? 1 : 0,
    lockedFilter !== "all" ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setPeriodFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setLockedFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPeriodFilter(filterDraft.period);
    setSectionFilter(filterDraft.section);
    setSubjectFilter(filterDraft.subject);
    setLockedFilter(filterDraft.locked);
    setIsFilterOpen(false);
  };

  React.useEffect(() => {
    if (selectedResultId && !filteredResults.some((item) => item.id === selectedResultId)) {
      setSelectedResultId(filteredResults[0]?.id ?? null);
      return;
    }

    if (!selectedResultId && filteredResults[0]) {
      setSelectedResultId(filteredResults[0].id);
    }
  }, [filteredResults, selectedResultId]);

  React.useEffect(() => {
    if (bulkRows.length === 0 || bulkComponents.length === 0) {
      setBulkDrafts({});
      return;
    }

    setBulkDrafts((prev) => {
      const next: BulkDraftMap = {};
      for (const row of bulkRows) {
        next[row.id] = {};
        for (const component of bulkComponents) {
          const existing = bulkScoreMap.get(`${row.id}:${component.id}`);
          next[row.id][component.id] =
            prev[row.id]?.[component.id] ?? String(existing?.rawScore ?? "");
        }
      }
      return next;
    });
  }, [bulkComponents, bulkRows, bulkScoreMap]);

  const openCreateResult = () => {
    setEditingResult(null);
    setResultForm(DEFAULT_RESULT_FORM);
    setResultSheetOpen(true);
  };

  const openEditResult = (item: StudentPeriodResultListItem) => {
    setEditingResult(item);
    setResultForm({
      assessmentPeriodId: item.assessmentPeriodId,
      subjectId: item.subjectId,
      studentEnrollmentId: item.studentEnrollmentId,
      notes: item.notes ?? "",
    });
    setResultSheetOpen(true);
  };

  const openCreateScore = () => {
    if (!selectedResult) return;
    setEditingScore(null);
    setScoreForm({
      ...DEFAULT_SCORE_FORM,
      studentPeriodResultId: selectedResult.id,
      assessmentPeriodComponentId: selectedResultEditableComponents[0]?.id ?? "",
    });
    setScoreSheetOpen(true);
  };

  const openEditScore = (item: StudentPeriodComponentScoreListItem) => {
    setEditingScore(item);
    setScoreForm({
      studentPeriodResultId: item.studentPeriodResultId,
      assessmentPeriodComponentId: item.assessmentPeriodComponentId,
      rawScore: String(item.rawScore),
      finalScore: String(item.finalScore),
      notes: item.notes ?? "",
    });
    setScoreSheetOpen(true);
  };

  const submitResult = () => {
    if (!resultForm.assessmentPeriodId || !resultForm.subjectId || !resultForm.studentEnrollmentId) {
      setMessage("الفترة والمادة والطالب مطلوبة.");
      return;
    }
    const period = periods.find((item) => item.id === resultForm.assessmentPeriodId);
    const enrollment = (enrollmentsQuery.data ?? []).find(
      (item) => item.id === resultForm.studentEnrollmentId,
    );
    if (period && enrollment && enrollment.academicYearId !== period.academicYearId) {
      setMessage("الطالب لا ينتمي إلى نفس سنة الفترة المختارة.");
      return;
    }
    const payload: CreateStudentPeriodResultPayload = {
      assessmentPeriodId: resultForm.assessmentPeriodId,
      subjectId: resultForm.subjectId,
      studentEnrollmentId: resultForm.studentEnrollmentId,
      status: "DRAFT",
      notes: toOptionalString(resultForm.notes),
      isActive: true,
    };
    if (editingResult) {
      updateResultMutation.mutate({ id: editingResult.id, payload });
    } else {
      createResultMutation.mutate(payload);
    }
  };

  const submitScore = () => {
    const component = components.find((item) => item.id === scoreForm.assessmentPeriodComponentId);
    if (!scoreIsEditable(component)) {
      setMessage("المكوّن المحسوب تلقائيًا لا يقبل إدخالًا يدويًا.");
      return;
    }
    const rawScore = Number(scoreForm.rawScore || 0);
    if (!Number.isFinite(rawScore) || rawScore < 0) {
      setMessage("الدرجة الخام يجب أن تكون رقمًا صالحًا.");
      return;
    }
    if (component && rawScore > component.maxScore) {
      setMessage(`الدرجة الخام لا يجب أن تتجاوز ${component.maxScore}.`);
      return;
    }
    const finalScore = toOptionalNumber(scoreForm.finalScore);
    if (component && finalScore !== undefined && finalScore > component.maxScore) {
      setMessage(`الدرجة النهائية لا يجب أن تتجاوز ${component.maxScore}.`);
      return;
    }
    const payload: CreateStudentPeriodComponentScorePayload = {
      studentPeriodResultId: scoreForm.studentPeriodResultId,
      assessmentPeriodComponentId: scoreForm.assessmentPeriodComponentId,
      rawScore,
      finalScore,
      notes: toOptionalString(scoreForm.notes),
      isActive: true,
    };
    if (editingScore) {
      updateScoreMutation.mutate({ id: editingScore.id, payload });
    } else {
      createScoreMutation.mutate(payload);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder={searchPlaceholder}
          filterCount={activeFiltersCount}
          onFilterClick={() => {
            setFilterDraft({
              period: periodFilter,
              section: sectionFilter,
              subject: subjectFilter,
              locked: lockedFilter,
            });
            setIsFilterOpen(true);
          }}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة النتائج"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField value={filterDraft.period} onChange={(event) => setFilterDraft((prev) => ({ ...prev, period: event.target.value }))}>
              <option value="all">كل الفترات</option>
              {periods.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </SelectField>
            <SelectField value={filterDraft.section} onChange={(event) => setFilterDraft((prev) => ({ ...prev, section: event.target.value }))}>
              <option value="all">كل الشعب</option>
              {(sectionsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{formatSectionWithGradeLabel(item)}</option>
              ))}
            </SelectField>
            <SelectField value={filterDraft.subject} onChange={(event) => setFilterDraft((prev) => ({ ...prev, subject: event.target.value }))}>
              <option value="all">كل المواد</option>
              {(subjectsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
              ))}
            </SelectField>
            <SelectField
              value={filterDraft.locked}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  locked: event.target.value as "all" | "locked" | "unlocked",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              <option value="locked">المقفلة فقط</option>
              <option value="unlocked">غير المقفلة فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">{labels?.workflowTitle ?? "سير العمل"}</CardTitle>
            {!hideWorkspaceSwitcher ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={workspaceView === "overview" ? "default" : "outline"}
                onClick={() => setWorkspaceView("overview")}
              >
                نظرة عامة
              </Button>
              <Button
                type="button"
                variant={workspaceView === "results" ? "default" : "outline"}
                onClick={() => setWorkspaceView("results")}
              >
                النتائج والمكوّنات
              </Button>
              <Button
                type="button"
                variant={workspaceView === "bulk" ? "default" : "outline"}
                onClick={() => setWorkspaceView("bulk")}
                disabled={!readyForBulkEntry}
              >
                الإدخال الجماعي
              </Button>
            </div>
            ) : null}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels?.contextTitle ?? "الفلترة والسياق"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">الفترة المختارة</p>
                <p className="mt-1 font-semibold">{selectedBulkPeriod ? selectedBulkPeriod.name : "لم يتم التحديد"}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">عدد النتائج</p>
                <p className="mt-1 font-semibold">{activeResultsCount}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">النتائج المقفلة</p>
                <p className="mt-1 font-semibold">{lockedResultsCount}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">وضع الإدخال الجماعي</p>
                <p className="mt-1 font-semibold">{readyForBulkEntry ? "جاهز" : "غير مكتمل"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {showQuickActions ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{labels?.quickActionsTitle ?? "الإجراءات السريعة"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
          {canCreateResult && allowCreateResultAction ? <Button onClick={openCreateResult}><Plus className="h-4 w-4" />إضافة نتيجة</Button> : null}
          {canCreateScore && allowCreateScoreAction ? <Button variant="outline" onClick={openCreateScore} disabled={!selectedResult}><Plus className="h-4 w-4" />إضافة مكوّن</Button> : null}
          {canCreateResult && allowEnsureResultsAction ? (
            <Button
              variant="outline"
              onClick={() => ensureResultsMutation.mutate()}
              disabled={
                ensureResultsMutation.isPending ||
                periodFilter === "all" ||
                sectionFilter === "all" ||
                subjectFilter === "all"
              }
            >
              {ensureResultsMutation.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              توليد النتائج الناقصة
            </Button>
          ) : null}
          {canCalculate && allowCalculateAction ? (
            <Button
              variant="secondary"
              onClick={() => {
                if (periodFilter === "all") {
                  setMessage("اختر فترة لتشغيل إعادة الحساب.");
                  return;
                }
                calculateMutation.mutate();
              }}
            >
              <Calculator className="h-4 w-4" />
              إعادة حساب المحصلة
            </Button>
          ) : null}
          </CardContent>
        </Card>
        ) : null}

        {(message || mutationError) ? (
          <Card>
            <CardContent className="p-4 text-sm">
              {message ? <p>{message}</p> : null}
              {mutationError ? <p className="text-rose-700">{mutationError}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        {workspaceView !== "bulk" ? (
        <div className={`grid gap-4 ${showResultDetails ? "xl:grid-cols-[1.35fr_1fr]" : ""}`}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{labels?.resultsTitle ?? "سجلات النتائج"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedResultId(item.id);
                    setWorkspaceView("results");
                  }}
                  className={`w-full rounded-xl border p-3 text-right ${
                    selectedResultId === item.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{item.studentEnrollment.student.fullName}</p>
                        <Badge variant={item.isLocked ? "default" : "secondary"}>
                          {item.isLocked ? "مقفل" : "مسودة"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.assessmentPeriod.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNameCodeLabel(item.subject.name, item.subject.code)} | المجموع {item.totalScore}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {canUpdateResult ? (
                        <Button size="icon" variant="ghost" onClick={(event) => { event.stopPropagation(); openEditResult(item); }}>
                          <PencilLine className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {canDeleteResult ? (
                        <Button size="icon" variant="ghost" onClick={(event) => { event.stopPropagation(); deleteResultMutation.mutate(item.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {item.isLocked ? (
                        canUnlockResult ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              unlockResultMutation.mutate(item.id);
                            }}
                          >
                            <LockOpen className="h-4 w-4" />
                          </Button>
                        ) : null
                      ) : canLockResult ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            lockResultMutation.mutate(item.id);
                          }}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {showResultDetails ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {labels?.resultComponentsTitle ?? "سجلات مكوّنات النتيجة"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedResult ? (
                <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                  <p>الفترة: {formatPeriodScope(selectedResult.assessmentPeriod)}</p>
                  <p>الطالب: {selectedResult.studentEnrollment.student.fullName}</p>
                  <p>المادة: {formatNameCodeLabel(selectedResult.subject.name, selectedResult.subject.code)}</p>
                  <p>المجموع الحالي: {selectedResult.totalScore} من {selectedResult.assessmentPeriod.maxScore}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">اختر نتيجة من القائمة لعرض المكوّنات.</p>
              )}
              {scores.map((item) => {
                const editable = scoreIsEditable(
                  components.find((component) => component.id === item.assessmentPeriodComponentId),
                );
                return (
                  <div key={item.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold">{item.assessmentPeriodComponent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entryModeLabel(item.assessmentPeriodComponent)} | خام {item.rawScore} | نهائي {item.finalScore} | الحد {item.assessmentPeriodComponent.maxScore}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {canUpdateScore && editable ? (
                          <Button size="icon" variant="ghost" onClick={() => openEditScore(item)}>
                            <PencilLine className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {canDeleteScore && editable ? (
                          <Button size="icon" variant="ghost" onClick={() => deleteScoreMutation.mutate(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          ) : null}
        </div>
        ) : null}

        {showBulkPanel && readyForBulkEntry ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">{labels?.bulkTitle ?? "إدخال جماعي للمعلم"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  أدخل درجات المكوّنات القابلة للتحرير ثم احفظها دفعة واحدة.
                </p>
              </div>
              {(canCreateScore || canUpdateScore) ? (
                <Button
                  onClick={() => bulkSaveMutation.mutate()}
                  disabled={
                    bulkSaveMutation.isPending ||
                    bulkRows.length === 0 ||
                    bulkComponents.length === 0
                  }
                >
                  {bulkSaveMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ الإدخال الجماعي
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {bulkRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد نتائج مطابقة. استخدم زر &quot;توليد النتائج الناقصة&quot; لإنشائها تلقائيًا.
                </p>
              ) : null}
              {bulkComponents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد مكوّنات قابلة للتحرير لهذه الفترة.
                </p>
              ) : null}
              {bulkRows.map((row) => (
                <div key={row.id} className="rounded-xl border p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{row.studentEnrollment.student.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.studentEnrollment.student.admissionNo ?? "بدون رقم قيد"} | المجموع الحالي {row.totalScore}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {bulkComponents.map((component) => (
                      <div key={component.id} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {component.name} - {component.maxScore}
                        </p>
                        <Input
                          type="number"
                          value={bulkDrafts[row.id]?.[component.id] ?? ""}
                          onChange={(event) =>
                            setBulkDrafts((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...(prev[row.id] ?? {}),
                                [component.id]: event.target.value,
                              },
                            }))
                          }
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <BottomSheetForm
        open={resultSheetOpen}
        title={editingResult ? "تعديل نتيجة" : "إضافة نتيجة"}
        onClose={() => setResultSheetOpen(false)}
        onSubmit={submitResult}
        submitLabel={editingResult ? "حفظ" : "إنشاء"}
        showCancelButton
        isSubmitting={createResultMutation.isPending || updateResultMutation.isPending}
      >
        <div className="grid gap-3">
          <SelectField value={resultForm.assessmentPeriodId} onChange={(event) => setResultForm((prev) => ({ ...prev, assessmentPeriodId: event.target.value }))}>
            <option value="">اختر الفترة</option>
            {periods.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </SelectField>
          <SelectField value={resultForm.subjectId} onChange={(event) => setResultForm((prev) => ({ ...prev, subjectId: event.target.value }))}>
            <option value="">اختر المادة</option>
            {(subjectsQuery.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>{formatNameCodeLabel(item.name, item.code)}</option>
            ))}
          </SelectField>
          <SelectField value={resultForm.studentEnrollmentId} onChange={(event) => setResultForm((prev) => ({ ...prev, studentEnrollmentId: event.target.value }))}>
            <option value="">اختر الطالب</option>
            {(enrollmentsQuery.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>{formatStudentEnrollmentOptionLabel(item)}</option>
            ))}
          </SelectField>
          <TextareaField value={resultForm.notes} onChange={(event) => setResultForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="ملاحظات" />
        </div>
      </BottomSheetForm>

      <BottomSheetForm
        open={scoreSheetOpen}
        title={editingScore ? "تعديل درجة مكوّن" : "إضافة درجة مكوّن"}
        onClose={() => setScoreSheetOpen(false)}
        onSubmit={submitScore}
        submitLabel={editingScore ? "حفظ" : "إنشاء"}
        showCancelButton
        isSubmitting={createScoreMutation.isPending || updateScoreMutation.isPending}
      >
        <div className="grid gap-3">
          <SelectField value={scoreForm.assessmentPeriodComponentId} onChange={(event) => setScoreForm((prev) => ({ ...prev, assessmentPeriodComponentId: event.target.value }))}>
            <option value="">اختر المكوّن</option>
            {components.map((item) => (
              <option key={item.id} value={item.id} disabled={!scoreIsEditable(item)}>
                {item.name} - {entryModeLabel(item)} - {item.maxScore}
              </option>
            ))}
          </SelectField>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="number" value={scoreForm.rawScore} onChange={(event) => setScoreForm((prev) => ({ ...prev, rawScore: event.target.value }))} placeholder="الدرجة الخام" />
            <Input type="number" value={scoreForm.finalScore} onChange={(event) => setScoreForm((prev) => ({ ...prev, finalScore: event.target.value }))} placeholder="الدرجة النهائية" />
          </div>
          <TextareaField value={scoreForm.notes} onChange={(event) => setScoreForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="ملاحظات" />
        </div>
      </BottomSheetForm>
    </>
  );
}
