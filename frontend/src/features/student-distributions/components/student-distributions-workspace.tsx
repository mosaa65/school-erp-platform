"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  CheckCircle2,
  CircleOff,
  LoaderCircle,
  RefreshCw,
  Save,
  Shuffle,
  Sparkles,
  Undo2,
  UsersRound,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useAcademicYearOptionsQuery } from "@/features/student-enrollments/hooks/use-academic-year-options-query";
import { useGradeLevelOptionsQuery } from "@/features/student-enrollments/hooks/use-grade-level-options-query";
import {
  ApiError,
  apiClient,
  type StudentEnrollmentDistributionBoard,
  type StudentEnrollmentListItem,
} from "@/lib/api/client";

type DistributionDraft = Record<string, string>;
type DistributionSection = StudentEnrollmentDistributionBoard["sections"][number];
type SectionTransferInput = {
  sourceSectionId: string;
  targetSectionId: string;
  enrollmentIds?: string[];
};

function compareByLabel(left: { code: string; name: string }, right: { code: string; name: string }) {
  const codeCompare = left.code.localeCompare(right.code, "ar");
  if (codeCompare !== 0) {
    return codeCompare;
  }

  return left.name.localeCompare(right.name, "ar");
}

function getSectionLabel(section: DistributionSection) {
  return `${section.name} (${section.code})`;
}

function getCurrentSectionLabel(enrollment: StudentEnrollmentListItem) {
  if (!enrollment.section) {
    return "غير موزع";
  }

  return `${enrollment.section.name} (${enrollment.section.code})`;
}

export function StudentDistributionsWorkspace() {
  const searchParams = useSearchParams();
  const { hasPermission } = useRbac();
  const auth = useAuth();
  const queryClient = useQueryClient();

  const canRead = hasPermission("student-enrollments.read");
  const canUpdate = hasPermission("student-enrollments.update");

  const [selectedAcademicYearId, setSelectedAcademicYearId] = React.useState("");
  const [selectedGradeLevelId, setSelectedGradeLevelId] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [selectedSectionIds, setSelectedSectionIds] = React.useState<string[]>([]);
  const [distributionDraft, setDistributionDraft] = React.useState<DistributionDraft>({});
  const [selectedAssignedEnrollmentIds, setSelectedAssignedEnrollmentIds] = React.useState<string[]>([]);
  const [sourceSectionId, setSourceSectionId] = React.useState("");
  const [targetSectionId, setTargetSectionId] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const gradeLevelsQuery = useGradeLevelOptionsQuery();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const academicYears = React.useMemo(
    () => academicYearsQuery.data ?? [],
    [academicYearsQuery.data],
  );
  const gradeLevels = React.useMemo(
    () => [...(gradeLevelsQuery.data ?? [])].sort((left, right) => compareByLabel(left, right)),
    [gradeLevelsQuery.data],
  );

  React.useEffect(() => {
    if (selectedAcademicYearId || academicYears.length === 0) {
      return;
    }

    const preferredYear = academicYears.find((year) => year.isCurrent) ?? academicYears[0];
    setSelectedAcademicYearId(preferredYear.id);
  }, [academicYears, selectedAcademicYearId]);

  React.useEffect(() => {
    const academicYearIdFromQuery = searchParams.get("academicYearId")?.trim();
    if (
      academicYearIdFromQuery &&
      academicYears.some((year) => year.id === academicYearIdFromQuery)
    ) {
      setSelectedAcademicYearId(academicYearIdFromQuery);
    }
  }, [academicYears, searchParams]);

  React.useEffect(() => {
    const gradeLevelIdFromQuery = searchParams.get("gradeLevelId")?.trim();
    if (
      gradeLevelIdFromQuery &&
      gradeLevels.some((gradeLevel) => gradeLevel.id === gradeLevelIdFromQuery)
    ) {
      setSelectedGradeLevelId(gradeLevelIdFromQuery);
    }
  }, [gradeLevels, searchParams]);

  const boardQuery = useQuery({
    queryKey: [
      "student-enrollments",
      "distribution-board",
      selectedAcademicYearId || "none",
      selectedGradeLevelId || "none",
      search,
    ],
    enabled:
      auth.isHydrated &&
      auth.isAuthenticated &&
      canRead &&
      Boolean(selectedAcademicYearId && selectedGradeLevelId),
    queryFn: async () => {
      try {
        return await apiClient.getStudentEnrollmentDistributionBoard({
          academicYearId: selectedAcademicYearId,
          gradeLevelId: selectedGradeLevelId,
          search: search || undefined,
          limit: 250,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          auth.signOut();
        }
        throw error;
      }
    },
  });

  const board = boardQuery.data;
  const availableSections = React.useMemo(
    () => [...(board?.sections ?? [])].sort((left, right) => compareByLabel(left, right)),
    [board?.sections],
  );
  const pendingEnrollments = React.useMemo(
    () => board?.pendingEnrollments ?? [],
    [board?.pendingEnrollments],
  );
  const assignedEnrollments = React.useMemo(
    () => board?.assignedEnrollments ?? [],
    [board?.assignedEnrollments],
  );

  React.useEffect(() => {
    setSelectedSectionIds((previous) => {
      const availableIds = availableSections.map((section) => section.id);
      const retained = previous.filter((sectionId) => availableIds.includes(sectionId));
      return retained.length > 0 ? retained : availableIds;
    });
  }, [availableSections]);

  React.useEffect(() => {
    const availableIds = availableSections.map((section) => section.id);
    setSourceSectionId((previous) => (availableIds.includes(previous) ? previous : ""));
    setTargetSectionId((previous) => (availableIds.includes(previous) ? previous : ""));
  }, [availableSections]);

  React.useEffect(() => {
    const assignedIds = assignedEnrollments.map((enrollment) => enrollment.id);
    setSelectedAssignedEnrollmentIds((previous) =>
      previous.filter((enrollmentId) => assignedIds.includes(enrollmentId)),
    );
  }, [assignedEnrollments]);

  React.useEffect(() => {
    const nextDraft: DistributionDraft = {};
    for (const enrollment of [...pendingEnrollments, ...assignedEnrollments]) {
      nextDraft[enrollment.id] = enrollment.sectionId ?? "";
    }
    setDistributionDraft(nextDraft);
  }, [pendingEnrollments, assignedEnrollments]);

  const invalidateDistribution = React.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["student-enrollments", "distribution-board"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["student-enrollments", "list"],
    });
  }, [queryClient]);

  const autoDistributeMutation = useMutation({
    mutationFn: async () =>
      apiClient.autoDistributeStudentEnrollments({
        academicYearId: selectedAcademicYearId,
        gradeLevelId: selectedGradeLevelId,
        sectionIds: selectedSectionIds,
      }),
    onSuccess: async (result) => {
      setErrorMessage(null);
      setSuccessMessage(
        result.skippedCount > 0
          ? `تم توزيع ${result.assignedCount} طالبًا، وبقي ${result.skippedCount} بسبب امتلاء السعة أو عدم توفر شعبة مناسبة.`
          : `تم توزيع ${result.assignedCount} طالبًا تلقائيًا بنجاح.`,
      );
      await invalidateDistribution();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "تعذّر تنفيذ التوزيع التلقائي.");
    },
  });

  const manualDistributeMutation = useMutation({
    mutationFn: async (assignments: Array<{ enrollmentId: string; sectionId: string }>) =>
      apiClient.manualDistributeStudentEnrollments({
        academicYearId: selectedAcademicYearId,
        gradeLevelId: selectedGradeLevelId,
        assignments,
      }),
    onSuccess: async (result) => {
      setErrorMessage(null);
      setSuccessMessage(`تم حفظ ${result.assignedCount} عملية توزيع/نقل بنجاح.`);
      await invalidateDistribution();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "تعذّر حفظ التوزيع اليدوي.");
    },
  });

  const transferSectionMutation = useMutation({
    mutationFn: async (payload: SectionTransferInput) =>
      apiClient.transferStudentEnrollments({
        academicYearId: selectedAcademicYearId,
        gradeLevelId: selectedGradeLevelId,
        sourceSectionId: payload.sourceSectionId,
        targetSectionId: payload.targetSectionId,
        ...(payload.enrollmentIds && payload.enrollmentIds.length > 0
          ? {
              enrollments: payload.enrollmentIds.map((enrollmentId) => ({
                enrollmentId,
              })),
            }
          : {}),
      }),
    onSuccess: async (result, variables) => {
      const movedScope =
        variables.enrollmentIds && variables.enrollmentIds.length > 0
          ? `تم نقل ${result.transferredCount} قيدًا محددًا`
          : `تم نقل شعبة كاملة بعدد ${result.transferredCount} قيدًا`;

      setErrorMessage(null);
      setSuccessMessage(
        `${movedScope} من ${result.sourceSection.name} (${result.sourceSection.code}) إلى ${result.targetSection.name} (${result.targetSection.code}).`,
      );
      setSelectedAssignedEnrollmentIds([]);
      await invalidateDistribution();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "تعذّر تنفيذ النقل الجماعي.");
    },
  });

  const returnToPendingMutation = useMutation({
    mutationFn: async (enrollmentIds: string[]) =>
      apiClient.returnStudentEnrollmentsToPending({
        academicYearId: selectedAcademicYearId,
        gradeLevelId: selectedGradeLevelId,
        enrollments: enrollmentIds.map((enrollmentId) => ({
          enrollmentId,
        })),
      }),
    onSuccess: async (result, enrollmentIds) => {
      setErrorMessage(null);
      setSuccessMessage(
        enrollmentIds.length === 1
          ? "تمت إعادة القيد المحدد إلى انتظار التوزيع."
          : `تمت إعادة ${result.returnedCount} قيود إلى انتظار التوزيع.`,
      );
      setSelectedAssignedEnrollmentIds((previous) =>
        previous.filter((enrollmentId) => !enrollmentIds.includes(enrollmentId)),
      );
      await invalidateDistribution();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(
        error instanceof Error ? error.message : "تعذّر إرجاع القيد إلى انتظار التوزيع.",
      );
    },
  });

  const selectedAcademicYear = React.useMemo(
    () => academicYears.find((year) => year.id === selectedAcademicYearId) ?? null,
    [academicYears, selectedAcademicYearId],
  );
  const selectedGradeLevel = React.useMemo(
    () => gradeLevels.find((gradeLevel) => gradeLevel.id === selectedGradeLevelId) ?? null,
    [gradeLevels, selectedGradeLevelId],
  );
  const selectedSections = React.useMemo(
    () => availableSections.filter((section) => selectedSectionIds.includes(section.id)),
    [availableSections, selectedSectionIds],
  );
  const selectedAssignedEnrollments = React.useMemo(
    () =>
      assignedEnrollments.filter((enrollment) =>
        selectedAssignedEnrollmentIds.includes(enrollment.id),
      ),
    [assignedEnrollments, selectedAssignedEnrollmentIds],
  );
  const sourceSectionEnrollments = React.useMemo(
    () =>
      sourceSectionId
        ? assignedEnrollments.filter((enrollment) => enrollment.sectionId === sourceSectionId)
        : [],
    [assignedEnrollments, sourceSectionId],
  );
  const selectedSourceSectionEnrollments = React.useMemo(
    () =>
      sourceSectionId
        ? selectedAssignedEnrollments.filter(
            (enrollment) => enrollment.sectionId === sourceSectionId,
          )
        : [],
    [selectedAssignedEnrollments, sourceSectionId],
  );
  const selectedSourceSection = React.useMemo(
    () => availableSections.find((section) => section.id === sourceSectionId) ?? null,
    [availableSections, sourceSectionId],
  );
  const selectedTargetSection = React.useMemo(
    () => availableSections.find((section) => section.id === targetSectionId) ?? null,
    [availableSections, targetSectionId],
  );

  const allVisibleEnrollments = React.useMemo(
    () => [...pendingEnrollments, ...assignedEnrollments],
    [assignedEnrollments, pendingEnrollments],
  );

  const stagedAssignments = React.useMemo(
    () =>
      allVisibleEnrollments
        .map((enrollment) => ({
          enrollmentId: enrollment.id,
          currentSectionId: enrollment.sectionId ?? "",
          nextSectionId: distributionDraft[enrollment.id] ?? "",
        }))
        .filter(
          (item) => item.nextSectionId.trim().length > 0 && item.nextSectionId !== item.currentSectionId,
        )
        .map((item) => ({
          enrollmentId: item.enrollmentId,
          sectionId: item.nextSectionId,
        })),
    [allVisibleEnrollments, distributionDraft],
  );

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSectionIds((previous) =>
      previous.includes(sectionId)
        ? previous.filter((id) => id !== sectionId)
        : [...previous, sectionId],
    );
  };

  const handleAssignedSelectionToggle = (enrollmentId: string) => {
    setSelectedAssignedEnrollmentIds((previous) =>
      previous.includes(enrollmentId)
        ? previous.filter((id) => id !== enrollmentId)
        : [...previous, enrollmentId],
    );
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSelectSourceSectionEnrollments = () => {
    if (!sourceSectionId || sourceSectionEnrollments.length === 0) {
      setErrorMessage("اختر شعبة مصدر تحتوي على قيود موزعة لتحديدها.");
      return;
    }

    setSelectedAssignedEnrollmentIds(sourceSectionEnrollments.map((enrollment) => enrollment.id));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleTransferSection = () => {
    if (!canUpdate) {
      setErrorMessage("لا تملك صلاحية تحديث قيود الطلاب.");
      return;
    }

    if (!sourceSectionId || !targetSectionId) {
      setErrorMessage("اختر الشعبة المصدر والشعبة الهدف أولًا.");
      return;
    }

    if (sourceSectionId === targetSectionId) {
      setErrorMessage("يجب أن تكون الشعبة الهدف مختلفة عن الشعبة المصدر.");
      return;
    }

    const selectedIds =
      selectedSourceSectionEnrollments.length > 0
        ? selectedSourceSectionEnrollments.map((enrollment) => enrollment.id)
        : undefined;

    if (!selectedIds && sourceSectionEnrollments.length === 0) {
      setErrorMessage("لا توجد قيود قابلة للنقل في الشعبة المصدر.");
      return;
    }

    setSuccessMessage(null);
    setErrorMessage(null);
    transferSectionMutation.mutate({
      sourceSectionId,
      targetSectionId,
      enrollmentIds: selectedIds,
    });
  };

  const handleReturnToPending = (enrollmentIds: string[]) => {
    if (!canUpdate) {
      setErrorMessage("لا تملك صلاحية تحديث قيود الطلاب.");
      return;
    }

    if (enrollmentIds.length === 0) {
      setErrorMessage("اختر قيدًا واحدًا على الأقل لإعادته إلى انتظار التوزيع.");
      return;
    }

    setSuccessMessage(null);
    setErrorMessage(null);
    returnToPendingMutation.mutate(enrollmentIds);
  };

  const handleSaveManualDistribution = () => {
    if (!canUpdate) {
      setErrorMessage("لا تملك صلاحية تحديث قيود الطلاب.");
      return;
    }

    if (stagedAssignments.length === 0) {
      setErrorMessage("لا توجد تغييرات جديدة للحفظ.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    manualDistributeMutation.mutate(stagedAssignments);
  };

  const renderEnrollmentCard = (
    enrollment: StudentEnrollmentListItem,
    tone: "pending" | "assigned",
  ) => {
    const chosenSectionId = distributionDraft[enrollment.id] ?? "";
    const isAssigned = tone === "assigned";
    const isSelected = selectedAssignedEnrollmentIds.includes(enrollment.id);

    return (
      <div
        key={enrollment.id}
        className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{enrollment.student.fullName}</p>
              <Badge variant="secondary">
                {enrollment.student.admissionNo ?? "بدون رقم طالب"}
              </Badge>
              <Badge variant="outline">
                {enrollment.yearlyEnrollmentNo ?? "بدون رقم قيد سنوي"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              الصف: {enrollment.gradeLevel?.name ?? enrollment.section?.gradeLevel.name ?? selectedGradeLevel?.name ?? "-"}
            </p>
            <p className="text-xs text-muted-foreground">السنة: {enrollment.academicYear.name}</p>
            <p className="text-xs text-muted-foreground">
              الشعبة الحالية: {getCurrentSectionLabel(enrollment)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={tone === "pending" ? "outline" : "secondary"}>
              {tone === "pending" ? "بانتظار التوزيع" : "موزع"}
            </Badge>
            {isAssigned ? (
              <Button
                type="button"
                variant={isSelected ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleAssignedSelectionToggle(enrollment.id)}
              >
                {isSelected ? "محدد" : "تحديد"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <SelectField
            value={chosenSectionId}
            onChange={(event) => {
              const nextSectionId = event.target.value;
              setDistributionDraft((previous) => ({
                ...previous,
                [enrollment.id]: nextSectionId,
              }));
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
          >
            <option value="">اختر الشعبة</option>
            {availableSections.map((section) => (
              <option key={section.id} value={section.id}>
                {getSectionLabel(section)} - المشغول {section.assignedCount}
                {section.capacity !== null ? ` / ${section.capacity}` : ""}
              </option>
            ))}
          </SelectField>

          <div className="flex min-w-[190px] items-center justify-between rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-2 text-sm">
            <span className="text-muted-foreground">الشعبة المختارة</span>
            <span className="font-medium">
              {availableSections.find((section) => section.id === chosenSectionId)
                ? getSectionLabel(availableSections.find((section) => section.id === chosenSectionId)!)
                : "غير محددة"}
            </span>
          </div>
        </div>

        {isAssigned ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
            <p className="text-xs text-muted-foreground">
              يمكن تحديد القيد للنقل الجماعي أو إعادته مباشرة إلى انتظار التوزيع.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => handleReturnToPending([enrollment.id])}
              disabled={!canUpdate || isWorking}
            >
              {returnToPendingMutation.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4" />
              )}
              إرجاع إلى الانتظار
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  const pendingCount = board?.summary.pendingCount ?? 0;
  const assignedCount = board?.summary.assignedCount ?? 0;
  const totalCount = board?.summary.totalCount ?? 0;
  const selectedTransferCount = selectedSourceSectionEnrollments.length;
  const isWholeSectionTransfer = Boolean(sourceSectionId) && selectedTransferCount === 0;
  const isWorking =
    autoDistributeMutation.isPending ||
    manualDistributeMutation.isPending ||
    transferSectionMutation.isPending ||
    returnToPendingMutation.isPending;

  return (
    <PageShell title="توزيع الطلاب">
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث باسم الطالب..."
        />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="border-border/70 bg-card/85 backdrop-blur-sm">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>إدارة توزيع الطلاب على الشعب</CardTitle>
                  <CardDescription>
                    اختر السنة والصف، ثم راجع القيود المعلقة أو انقل القيود الموزعة بين الشعب
                    يدويًا أو عبر التوزيع التلقائي.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">الإجمالي: {totalCount}</Badge>
                  <Badge variant="outline">معلّق: {pendingCount}</Badge>
                  <Badge variant="outline">موزع: {assignedCount}</Badge>
                  {selectedAcademicYear ? <Badge variant="outline">{selectedAcademicYear.code}</Badge> : null}
                  {selectedGradeLevel ? <Badge variant="outline">{selectedGradeLevel.name}</Badge> : null}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <SelectField
                  value={selectedAcademicYearId}
                  onChange={(event) => {
                    setSelectedAcademicYearId(event.target.value);
                    setSelectedAssignedEnrollmentIds([]);
                    setSourceSectionId("");
                    setTargetSectionId("");
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                >
                  <option value="">اختر السنة الأكاديمية</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} ({year.code})
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  value={selectedGradeLevelId}
                  onChange={(event) => {
                    setSelectedGradeLevelId(event.target.value);
                    setDistributionDraft({});
                    setSelectedAssignedEnrollmentIds([]);
                    setSourceSectionId("");
                    setTargetSectionId("");
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                >
                  <option value="">اختر الصف</option>
                  {gradeLevels.map((gradeLevel) => (
                    <option key={gradeLevel.id} value={gradeLevel.id}>
                      {gradeLevel.name} ({gradeLevel.code})
                    </option>
                  ))}
                </SelectField>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {boardQuery.isPending ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
                  جارٍ تحميل لوحة التوزيع...
                </div>
              ) : null}

              {boardQuery.error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {boardQuery.error instanceof Error
                    ? boardQuery.error.message
                    : "تعذّر تحميل بيانات التوزيع."}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                  {successMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : null}

              {!selectedAcademicYearId || !selectedGradeLevelId ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
                  اختر السنة والصف لتظهر لك لوحة التوزيع الكاملة.
                </div>
              ) : null}

              {board ? (
                <div className="space-y-5">
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium">القيود بانتظار التوزيع</h3>
                      <Badge variant="outline">{pendingEnrollments.length}</Badge>
                    </div>
                    {pendingEnrollments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
                        لا توجد قيود معلقة لهذا الصف في الوقت الحالي.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingEnrollments.map((enrollment) => renderEnrollmentCard(enrollment, "pending"))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">القيود الموزعة حاليًا</h3>
                        <Badge variant="secondary">{assignedEnrollments.length}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">محدد: {selectedAssignedEnrollments.length}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAssignedEnrollmentIds(assignedEnrollments.map((item) => item.id))}
                          disabled={assignedEnrollments.length === 0}
                        >
                          تحديد الكل
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAssignedEnrollmentIds([])}
                          disabled={selectedAssignedEnrollmentIds.length === 0}
                        >
                          إلغاء التحديد
                        </Button>
                      </div>
                    </div>
                    {assignedEnrollments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
                        لا توجد قيود موزعة بعد.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignedEnrollments.map((enrollment) => renderEnrollmentCard(enrollment, "assigned"))}
                      </div>
                    )}
                  </section>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card className="border-border/70 bg-card/85 backdrop-blur-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersRound className="h-4 w-4" />
                  الشعب المتاحة للتوزيع
                </CardTitle>
                <CardDescription>
                  اختر الشعب التي تريد استخدامها في التوزيع التلقائي، مع عرض الإشغال والسعة
                  الحالية لكل شعبة.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedGradeLevelId ? null : (
                  <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    اختر الصف أولًا لعرض الشعب المرتبطة به.
                  </div>
                )}

                {selectedGradeLevelId && availableSections.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                    لا توجد شعب فعالة لهذا الصف.
                  </div>
                ) : null}

                {availableSections.map((section) => {
                  const isSelected = selectedSectionIds.includes(section.id);

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => handleSectionToggle(section.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-right transition ${
                        isSelected
                          ? "border-primary/30 bg-primary/5 shadow-sm"
                          : "border-border/70 bg-background/70"
                      }`}
                    >
                      <div className="space-y-1 text-right">
                        <p className="font-medium">{getSectionLabel(section)}</p>
                        <p className="text-xs text-muted-foreground">
                          المشغول {section.assignedCount}
                          {section.capacity !== null ? ` / ${section.capacity}` : " / غير محدود"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {section.availableSeats === null
                            ? "السعة مفتوحة"
                            : `المتاح ${section.availableSeats}`}
                        </p>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <CircleOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/85 backdrop-blur-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowRightLeft className="h-4 w-4" />
                  أدوات التوزيع
                </CardTitle>
                <CardDescription>
                  التوزيع التلقائي هنا يحترم السعة الحالية للشعب، بينما الحفظ اليدوي يطبق
                  النقل أو الإسناد على القيود التي غيّرتها فقط.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={() => {
                    setSuccessMessage(null);
                    setErrorMessage(null);
                    autoDistributeMutation.mutate();
                  }}
                  disabled={
                    !canUpdate ||
                    isWorking ||
                    !selectedAcademicYearId ||
                    !selectedGradeLevelId ||
                    selectedSections.length === 0 ||
                    pendingEnrollments.length === 0
                  }
                >
                  {autoDistributeMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shuffle className="h-4 w-4" />
                  )}
                  توزيع تلقائي
                </Button>

                <div className="space-y-2 rounded-2xl border border-border/70 bg-background/70 p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">النقل الجماعي بين الشعب</p>
                    <p className="text-xs text-muted-foreground">
                      اختر شعبة مصدر وشعبة هدف. إذا حددت قيودًا من الشعبة المصدر فسينقل المحدد
                      فقط، وإلا سيتم نقل الشعبة كاملة.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <SelectField
                      value={sourceSectionId}
                      onChange={(event) => {
                        setSourceSectionId(event.target.value);
                        setSuccessMessage(null);
                        setErrorMessage(null);
                      }}
                    >
                      <option value="">اختر الشعبة المصدر</option>
                      {availableSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {getSectionLabel(section)}
                        </option>
                      ))}
                    </SelectField>

                    <SelectField
                      value={targetSectionId}
                      onChange={(event) => {
                        setTargetSectionId(event.target.value);
                        setSuccessMessage(null);
                        setErrorMessage(null);
                      }}
                    >
                      <option value="">اختر الشعبة الهدف</option>
                      {availableSections
                        .filter((section) => section.id !== sourceSectionId)
                        .map((section) => (
                          <option key={section.id} value={section.id}>
                            {getSectionLabel(section)}
                          </option>
                        ))}
                    </SelectField>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                      {selectedSourceSection
                        ? `الشعبة المصدر ${selectedSourceSection.name} تضم ${sourceSectionEnrollments.length} قيدًا موزعًا حاليًا.`
                        : "اختر الشعبة المصدر لعرض عدد القيود القابلة للنقل."}
                    </div>
                    <div className="rounded-xl border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                      {selectedTargetSection
                        ? `الشعبة الهدف ${selectedTargetSection.name}${selectedTargetSection.availableSeats === null ? " سعتها مفتوحة." : ` متاح فيها ${selectedTargetSection.availableSeats} مقاعد.`}`
                        : "اختر الشعبة الهدف قبل تنفيذ النقل."}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={handleSelectSourceSectionEnrollments}
                      disabled={!sourceSectionId || sourceSectionEnrollments.length === 0}
                    >
                      <UsersRound className="h-4 w-4" />
                      تحديد طلاب الشعبة المصدر
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={handleTransferSection}
                      disabled={!canUpdate || isWorking || !sourceSectionId || !targetSectionId}
                    >
                      {transferSectionMutation.isPending ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4" />
                      )}
                      {isWholeSectionTransfer
                        ? "نقل الشعبة كاملة"
                        : `نقل المحدد (${selectedTransferCount})`}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {selectedSourceSectionEnrollments.length > 0
                      ? `سيتم نقل ${selectedSourceSectionEnrollments.length} قيدًا محددًا من الشعبة المصدر.`
                      : selectedAssignedEnrollments.length > 0 && sourceSectionId
                        ? "التحديد الحالي يشمل قيودًا من شعب أخرى، لذلك سيُنقل كامل مصدر النقل ما لم تحدد طلاب الشعبة المصدر."
                        : "عند عدم تحديد قيود من الشعبة المصدر سيتم نقل الشعبة كاملة."}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleSaveManualDistribution}
                  disabled={!canUpdate || isWorking || stagedAssignments.length === 0}
                >
                  {manualDistributeMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ التوزيع اليدوي
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleReturnToPending(selectedAssignedEnrollmentIds)}
                  disabled={!canUpdate || isWorking || selectedAssignedEnrollmentIds.length === 0}
                >
                  {returnToPendingMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Undo2 className="h-4 w-4" />
                  )}
                  إرجاع المحدد إلى انتظار التوزيع
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={() => {
                    setDistributionDraft({});
                    setSelectedAssignedEnrollmentIds([]);
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                  disabled={isWorking || allVisibleEnrollments.length === 0}
                >
                  <CircleOff className="h-4 w-4" />
                  تفريغ المسودات
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={() => void boardQuery.refetch()}
                  disabled={boardQuery.isFetching}
                >
                  <RefreshCw className={`h-4 w-4 ${boardQuery.isFetching ? "animate-spin" : ""}`} />
                  تحديث البيانات
                </Button>

                <div className="rounded-2xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    يتم الاعتماد على السنة + الصف + السعة الحالية في التوزيع التلقائي.
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    الشاشة تدعم الآن التوزيع اليدوي، النقل الجماعي، وإرجاع القيد إلى انتظار التوزيع.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
