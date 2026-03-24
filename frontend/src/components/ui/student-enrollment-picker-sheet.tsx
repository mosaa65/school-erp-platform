"use client";

import * as React from "react";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  GraduationCap,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import type {
  StudentEnrollmentDistributionStatus,
  StudentEnrollmentStatus,
} from "@/lib/api/client";
import { translateStudentEnrollmentStatus } from "@/lib/i18n/ar";
import { cn } from "@/lib/utils";
import {
  useStudentEnrollmentPickerQuery,
  type StudentEnrollmentPickerActiveFilter,
} from "@/features/students/hooks/use-student-enrollment-picker-query";
import {
  resolveStudentEnrollmentPickerDefaults,
  type StudentEnrollmentPickerVariant,
} from "@/features/students/lib/student-enrollment-picker-config";
import {
  loadRecentStudentEnrollmentPickerOptions,
  saveRecentStudentEnrollmentPickerOption,
  type StudentEnrollmentPickerOption,
} from "@/features/students/lib/student-enrollment-picker";

type StudentEnrollmentPickerSheetProps = {
  value: string;
  selectedOption: StudentEnrollmentPickerOption | null;
  onSelect: (option: StudentEnrollmentPickerOption | null) => void;
  scope: string;
  variant?: StudentEnrollmentPickerVariant;
  studentId?: string;
  academicYearId?: string;
  gradeLevelId?: string;
  sectionId?: string;
  placeholder?: string;
  title?: string;
  searchPlaceholder?: string;
  emptySelectionLabel?: string;
  allowEmptySelection?: boolean;
  disabled?: boolean;
  storageKey?: string;
  className?: string;
  triggerTestId?: string;
};

type StudentEnrollmentPickerSortKey =
  | "grade-name"
  | "name-asc"
  | "name-desc"
  | "admission-asc"
  | "admission-desc"
  | "yearly-asc"
  | "yearly-desc"
  | "year-asc"
  | "year-desc";
type StudentEnrollmentPickerGroupKey = "grade" | "academic-year" | "alpha" | "none";
type StudentEnrollmentPickerControlsDrawerMode = "filter" | "sort" | null;

const ACTIVE_FILTER_OPTIONS: Array<{
  value: StudentEnrollmentPickerActiveFilter;
  label: string;
}> = [
  { value: "active", label: "النشط فقط" },
  { value: "all", label: "كل القيود" },
  { value: "inactive", label: "غير النشط فقط" },
];

const ENROLLMENT_STATUS_OPTIONS: Array<{
  value: StudentEnrollmentStatus | "all";
  label: string;
}> = [
  { value: "all", label: "كل حالات القيد" },
  { value: "NEW", label: translateStudentEnrollmentStatus("NEW") },
  { value: "TRANSFERRED", label: translateStudentEnrollmentStatus("TRANSFERRED") },
  { value: "ACTIVE", label: translateStudentEnrollmentStatus("ACTIVE") },
  { value: "PROMOTED", label: translateStudentEnrollmentStatus("PROMOTED") },
  { value: "REPEATED", label: translateStudentEnrollmentStatus("REPEATED") },
  { value: "WITHDRAWN", label: translateStudentEnrollmentStatus("WITHDRAWN") },
  { value: "GRADUATED", label: translateStudentEnrollmentStatus("GRADUATED") },
  { value: "SUSPENDED", label: translateStudentEnrollmentStatus("SUSPENDED") },
];

const DISTRIBUTION_STATUS_OPTIONS: Array<{
  value: StudentEnrollmentDistributionStatus | "all";
  label: string;
}> = [
  { value: "all", label: "كل حالات التوزيع" },
  { value: "PENDING_DISTRIBUTION", label: "بانتظار التوزيع" },
  { value: "ASSIGNED", label: "موزع" },
  { value: "TRANSFERRED", label: "منقول" },
];

const SORT_OPTIONS: Array<{ value: StudentEnrollmentPickerSortKey; label: string }> = [
  { value: "grade-name", label: "الصف ثم الاسم" },
  { value: "name-asc", label: "الاسم أ - ي" },
  { value: "name-desc", label: "الاسم ي - أ" },
  { value: "admission-asc", label: "رقم الطالب تصاعدي" },
  { value: "admission-desc", label: "رقم الطالب تنازلي" },
  { value: "yearly-asc", label: "رقم القيد السنوي تصاعدي" },
  { value: "yearly-desc", label: "رقم القيد السنوي تنازلي" },
  { value: "year-asc", label: "السنة الدراسية تصاعدي" },
  { value: "year-desc", label: "السنة الدراسية تنازلي" },
];

const GROUP_OPTIONS: Array<{ value: StudentEnrollmentPickerGroupKey; label: string }> = [
  { value: "grade", label: "تجميع حسب الصف" },
  { value: "academic-year", label: "تجميع حسب السنة" },
  { value: "alpha", label: "تجميع حسب الحرف" },
  { value: "none", label: "بدون تجميع" },
];

function normalizeSearchValue(value: string): string {
  return value.toLocaleLowerCase("ar").replace(/\s+/g, " ").trim();
}

function compareText(left: string | null | undefined, right: string | null | undefined): number {
  return (left ?? "").localeCompare(right ?? "", "ar", {
    numeric: true,
    sensitivity: "base",
  });
}

function compareNullableNumber(
  left: number | null | undefined,
  right: number | null | undefined,
): number {
  if (left === null || left === undefined) {
    return right === null || right === undefined ? 0 : 1;
  }

  if (right === null || right === undefined) {
    return -1;
  }

  return left - right;
}

function getAlphabetGroupLabel(value: string): string {
  const firstCharacter = value.trim().charAt(0);
  return firstCharacter ? firstCharacter.toLocaleUpperCase("ar") : "#";
}

function getEnrollmentGroupLabel(
  option: StudentEnrollmentPickerOption,
  groupBy: StudentEnrollmentPickerGroupKey,
): string {
  if (groupBy === "none") {
    return "النتائج";
  }

  if (groupBy === "alpha") {
    return `الحرف: ${getAlphabetGroupLabel(option.title)}`;
  }

  if (groupBy === "academic-year") {
    return option.academicYearCode
      ? `${option.academicYearLabel ?? "سنة غير معروفة"} (${option.academicYearCode})`
      : option.academicYearLabel ?? "سنة غير معروفة";
  }

  return option.groupLabel;
}

function sortStudentEnrollmentOptions(
  options: StudentEnrollmentPickerOption[],
  sortBy: StudentEnrollmentPickerSortKey,
): StudentEnrollmentPickerOption[] {
  const sorted = [...options];

  sorted.sort((left, right) => {
    switch (sortBy) {
      case "name-asc":
        return compareText(left.title, right.title);
      case "name-desc":
        return compareText(right.title, left.title);
      case "admission-asc":
        return compareText(left.admissionNo, right.admissionNo);
      case "admission-desc":
        return compareText(right.admissionNo, left.admissionNo);
      case "yearly-asc":
        return compareText(left.yearlyEnrollmentNo, right.yearlyEnrollmentNo);
      case "yearly-desc":
        return compareText(right.yearlyEnrollmentNo, left.yearlyEnrollmentNo);
      case "year-asc": {
        const yearCompare = compareText(left.academicYearLabel, right.academicYearLabel);
        if (yearCompare !== 0) {
          return yearCompare;
        }

        return compareText(left.title, right.title);
      }
      case "year-desc": {
        const yearCompare = compareText(right.academicYearLabel, left.academicYearLabel);
        if (yearCompare !== 0) {
          return yearCompare;
        }

        return compareText(left.title, right.title);
      }
      case "grade-name":
      default: {
        const gradeCompare = compareNullableNumber(
          left.currentGradeSequence,
          right.currentGradeSequence,
        );
        if (gradeCompare !== 0) {
          return gradeCompare;
        }

        const sectionCompare = compareText(left.sectionLabel, right.sectionLabel);
        if (sectionCompare !== 0) {
          return sectionCompare;
        }

        return compareText(left.title, right.title);
      }
    }
  });

  return sorted;
}

function groupStudentEnrollmentOptions(
  options: StudentEnrollmentPickerOption[],
  groupBy: StudentEnrollmentPickerGroupKey,
) {
  const groups = new Map<string, StudentEnrollmentPickerOption[]>();

  options.forEach((option) => {
    const groupLabel = getEnrollmentGroupLabel(option, groupBy);
    const current = groups.get(groupLabel) ?? [];
    current.push(option);
    groups.set(groupLabel, current);
  });

  return Array.from(groups.entries());
}

function getSortLabel(sortBy: StudentEnrollmentPickerSortKey): string {
  return SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? SORT_OPTIONS[0].label;
}

function getGroupLabel(groupBy: StudentEnrollmentPickerGroupKey): string {
  return GROUP_OPTIONS.find((option) => option.value === groupBy)?.label ?? GROUP_OPTIONS[0].label;
}

function getActiveScopeLabel(activeFilter: StudentEnrollmentPickerActiveFilter): string {
  if (activeFilter === "all") {
    return "كل القيود";
  }

  return activeFilter === "active" ? "النشط فقط" : "غير النشط";
}

function getEnrollmentBadgeToneClass(badge: string): string {
  if (badge.startsWith("الرقم") || badge.startsWith("القيد")) {
    return "border-sky-300/60 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }

  if (badge.includes("سنة")) {
    return "border-violet-300/60 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }

  if (badge === "غير نشط") {
    return "border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function getGroupIconToneClass(index: number): string {
  const tone = index % 4;

  if (tone === 0) {
    return "border-sky-300/60 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }

  if (tone === 1) {
    return "border-violet-300/60 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }

  if (tone === 2) {
    return "border-teal-300/60 bg-teal-500/10 text-teal-700 dark:text-teal-300";
  }

  return "border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export function StudentEnrollmentPickerSheet({
  value,
  selectedOption,
  onSelect,
  scope,
  variant = "form",
  studentId,
  academicYearId,
  gradeLevelId,
  sectionId,
  placeholder,
  title,
  searchPlaceholder,
  emptySelectionLabel,
  allowEmptySelection,
  disabled = false,
  storageKey,
  className,
  triggerTestId,
}: StudentEnrollmentPickerSheetProps) {
  const defaults = React.useMemo(
    () => resolveStudentEnrollmentPickerDefaults({ scope, variant }),
    [scope, variant],
  );
  const defaultActiveFilter = variant === "filter" ? "all" : "active";
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");
  const deferredSearchInput = React.useDeferredValue(searchInput);
  const [serverSearch, setServerSearch] = React.useState("");
  const [recentOptions, setRecentOptions] = React.useState<StudentEnrollmentPickerOption[]>([]);
  const [controlsDrawerMode, setControlsDrawerMode] =
    React.useState<StudentEnrollmentPickerControlsDrawerMode>(null);
  const [activeFilter, setActiveFilter] =
    React.useState<StudentEnrollmentPickerActiveFilter>(defaultActiveFilter);
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] =
    React.useState<StudentEnrollmentStatus | "all">("all");
  const [distributionStatusFilter, setDistributionStatusFilter] =
    React.useState<StudentEnrollmentDistributionStatus | "all">("all");
  const [sortBy, setSortBy] = React.useState<StudentEnrollmentPickerSortKey>("grade-name");
  const [groupBy, setGroupBy] =
    React.useState<StudentEnrollmentPickerGroupKey>("grade");

  const resolvedPlaceholder = placeholder ?? defaults.placeholder;
  const resolvedTitle = title ?? defaults.title;
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? "ابحث بالاسم أو رقم الطالب أو رقم القيد أو الصف...";
  const resolvedEmptySelectionLabel = emptySelectionLabel ?? defaults.emptySelectionLabel;
  const resolvedAllowEmptySelection = allowEmptySelection ?? defaults.allowEmptySelection;
  const resolvedStorageKey = storageKey ?? defaults.storageKey;

  useDebounceEffect(() => {
    setServerSearch(searchInput.trim());
  }, 350, [searchInput]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearchInput("");
      setServerSearch("");
      setControlsDrawerMode(null);
      return;
    }

    setRecentOptions(loadRecentStudentEnrollmentPickerOptions(resolvedStorageKey));
  }, [isOpen, resolvedStorageKey]);

  const enrollmentsQuery = useStudentEnrollmentPickerQuery({
    search: serverSearch,
    enabled: isOpen,
    pageSize: 50,
    studentId,
    academicYearId,
    gradeLevelId,
    sectionId,
    status: enrollmentStatusFilter,
    distributionStatus: distributionStatusFilter,
    activeFilter,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = enrollmentsQuery;

  const normalizedClientSearch = React.useMemo(
    () => normalizeSearchValue(deferredSearchInput),
    [deferredSearchInput],
  );

  const filteredOptions = React.useMemo(() => {
    let next = enrollmentsQuery.options;

    if (normalizedClientSearch) {
      next = next.filter((option) =>
        (option.searchText ?? "").includes(normalizedClientSearch),
      );
    }

    return sortStudentEnrollmentOptions(next, sortBy);
  }, [enrollmentsQuery.options, normalizedClientSearch, sortBy]);

  const groupedResults = React.useMemo(
    () => groupStudentEnrollmentOptions(filteredOptions, groupBy),
    [filteredOptions, groupBy],
  );

  const activeFiltersCount = React.useMemo(() => {
    return [
      activeFilter !== defaultActiveFilter ? 1 : 0,
      enrollmentStatusFilter !== "all" ? 1 : 0,
      distributionStatusFilter !== "all" ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0);
  }, [activeFilter, defaultActiveFilter, distributionStatusFilter, enrollmentStatusFilter]);

  const closeSheet = () => {
    setIsOpen(false);
    setSearchInput("");
    setServerSearch("");
    setControlsDrawerMode(null);
  };

  const handleSelect = (option: StudentEnrollmentPickerOption | null) => {
    if (option) {
      const updatedRecentOptions = saveRecentStudentEnrollmentPickerOption(
        option,
        resolvedStorageKey,
      );
      setRecentOptions(updatedRecentOptions);
    }

    onSelect(option);
    closeSheet();
  };

  React.useEffect(() => {
    if (
      !isOpen ||
      !hasNextPage ||
      isFetchingNextPage ||
      !scrollContainerRef.current ||
      !loadMoreRef.current
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          void fetchNextPage();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "320px 0px 320px 0px",
      },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isOpen]);

  const renderOption = (option: StudentEnrollmentPickerOption) => {
    const isSelected = value === option.id;
    const badges = [
      option.admissionNo ? `الرقم ${option.admissionNo}` : null,
      option.yearlyEnrollmentNo ? `القيد ${option.yearlyEnrollmentNo}` : null,
      option.academicYearLabel ?? null,
      option.enrollmentStatusLabel ?? null,
      option.distributionStatusLabel ?? null,
      option.isActive === false ? "غير نشط" : null,
    ].filter((item): item is string => Boolean(item));

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => handleSelect(option)}
        className={cn(
          "w-full rounded-[26px] border px-4 py-3 text-right transition",
          "hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-soft)]/35",
          isSelected
            ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)]/70 shadow-sm"
            : "border-border/70 bg-gradient-to-br from-background via-background/95 to-[color:var(--app-accent-soft)]/20",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-1">
              <p className="truncate text-sm font-semibold">{option.title}</p>
              <p className="truncate text-xs text-muted-foreground">{option.subtitle}</p>
              {option.meta ? (
                <p className="truncate text-[11px] text-muted-foreground">{option.meta}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    getEnrollmentBadgeToneClass(badge),
                  )}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <span
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
              isSelected
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/60 bg-background text-muted-foreground",
            )}
          >
            {isSelected ? <Check className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
          </span>
        </div>
      </button>
    );
  };

  return (
    <>
      <button
        data-testid={triggerTestId}
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className={cn(
          "group/picker flex min-h-12 w-full items-center justify-between gap-3 rounded-[26px] border border-input bg-background/85 px-4 py-3 text-right shadow-sm transition-[border-color,box-shadow,background-color]",
          "hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <div className="min-w-0 flex-1 text-right">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              selectedOption ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selectedOption?.title ?? resolvedPlaceholder}
          </p>
          {selectedOption ? (
            <div className="space-y-0.5">
              <p className="truncate text-xs text-muted-foreground">{selectedOption.subtitle}</p>
              {selectedOption.meta ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  {selectedOption.meta}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="truncate text-xs text-muted-foreground">
              افتح النافذة للتصفح والفلترة والفرز
            </p>
          )}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background text-muted-foreground shadow-sm transition group-hover/picker:border-primary/20 group-hover/picker:bg-primary/5 group-hover/picker:text-primary">
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      <BottomSheetForm
        open={isOpen}
        title={resolvedTitle}
        description="تصفح القيود الدراسية مباشرة، ثم فلتر أو فرّز النتائج للوصول الأدق."
        eyebrow="اختيار"
        onClose={closeSheet}
        onSubmit={() => undefined}
        showFooter={false}
        renderInPortal
        overlayClassName="z-[70]"
        panelClassName="md:max-w-[720px]"
        contentClassName="px-0 py-0"
        contentRef={scrollContainerRef}
      >
        <div className="space-y-0">
          <div className="sticky top-0 z-10 border-b border-[color:var(--app-accent-strong)] bg-gradient-to-b from-[color:var(--app-accent-soft)] via-background/96 to-background/84 px-5 pb-4 pt-3 backdrop-blur-sm">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-[10px] text-[color:var(--app-accent-color)]/90">
                <p className="font-medium uppercase tracking-[0.18em]">بحث واختيار</p>
                <p className="text-muted-foreground">نفس هوية الفورمات</p>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <SearchField
                  containerClassName="min-w-0"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={resolvedSearchPlaceholder}
                />

                <div className="flex items-center justify-end gap-1.5 overflow-x-auto pb-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setActiveFilter((previous) =>
                        previous === "all" ? defaultActiveFilter : "all",
                      )
                    }
                    className="h-10 w-10 shrink-0 rounded-2xl px-0 text-xs sm:w-auto sm:px-3"
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span className="hidden sm:inline">{getActiveScopeLabel(activeFilter)}</span>
                    <span className="sr-only sm:hidden">{getActiveScopeLabel(activeFilter)}</span>
                  </Button>
                  <Button
                    type="button"
                    variant={controlsDrawerMode === "filter" ? "default" : "outline"}
                    onClick={() => setControlsDrawerMode("filter")}
                    className="relative h-10 w-10 shrink-0 rounded-2xl px-0 sm:w-auto sm:px-3.5"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">فلترة</span>
                    <span className="sr-only sm:hidden">فلترة</span>
                    {activeFiltersCount > 0 ? (
                      <span className="absolute -right-1 -top-1 rounded-full border border-[color:var(--app-accent-strong)] bg-background/95 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--app-accent-color)] sm:static sm:px-2 sm:text-[11px] sm:font-medium sm:text-foreground">
                        {activeFiltersCount}
                      </span>
                    ) : null}
                  </Button>
                  <Button
                    type="button"
                    variant={controlsDrawerMode === "sort" ? "default" : "outline"}
                    onClick={() => setControlsDrawerMode("sort")}
                    className="h-10 w-10 shrink-0 rounded-2xl px-0 sm:w-auto sm:px-3.5"
                  >
                    <ArrowDownUp className="h-4 w-4" />
                    <span className="hidden sm:inline">فرز</span>
                    <span className="sr-only sm:hidden">فرز</span>
                  </Button>
                  {resolvedAllowEmptySelection ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleSelect(null)}
                      className="h-10 w-10 shrink-0 rounded-2xl px-0 text-muted-foreground sm:w-auto sm:px-3"
                    >
                      <X className="h-4 w-4" />
                      <span className="hidden sm:inline">{resolvedEmptySelectionLabel}</span>
                      <span className="sr-only sm:hidden">مسح الاختيار</span>
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 overflow-x-auto pb-0.5 text-[10px] sm:text-[11px]">
                <span className="shrink-0 rounded-full border border-sky-300/60 bg-sky-500/10 px-2.5 py-1 text-sky-700 dark:text-sky-300">
                  القيود {enrollmentsQuery.options.length}/
                  {enrollmentsQuery.totalAvailable || enrollmentsQuery.options.length}
                </span>
                <span className="shrink-0 rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                  {filteredOptions.length} نتيجة
                </span>
                <span className="shrink-0 rounded-full border border-violet-300/60 bg-violet-500/10 px-2.5 py-1 text-violet-700 dark:text-violet-300">
                  {getSortLabel(sortBy)}
                </span>
                <span className="shrink-0 rounded-full border border-amber-300/60 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                  {getGroupLabel(groupBy)}
                </span>
                {selectedOption ? (
                  <span className="max-w-[220px] shrink-0 truncate rounded-full border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-2.5 py-1 text-[color:var(--app-accent-color)]">
                    المحدد: {selectedOption.title}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            {searchInput.trim().length === 0 && recentOptions.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    آخر الاختيارات
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    تظهر أيضًا ضمن القائمة بالأسفل
                  </span>
                </div>
                <div className="space-y-2">{recentOptions.slice(0, 3).map(renderOption)}</div>
              </div>
            ) : null}

            {enrollmentsQuery.isPending ? (
              <div className="flex items-center justify-center gap-2 rounded-[28px] border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                جارٍ تحميل أول دفعة من القيود الدراسية...
              </div>
            ) : null}

            {enrollmentsQuery.error ? (
              <div className="rounded-[28px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {enrollmentsQuery.error instanceof Error
                  ? enrollmentsQuery.error.message
                  : "تعذّر جلب بيانات القيود الدراسية."}
              </div>
            ) : null}

            {!enrollmentsQuery.isPending &&
            !enrollmentsQuery.error &&
            filteredOptions.length === 0 &&
            !hasNextPage ? (
              <div className="rounded-[28px] border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية.
              </div>
            ) : null}

            {!enrollmentsQuery.isPending &&
            !enrollmentsQuery.error &&
            filteredOptions.length === 0 &&
            hasNextPage ? (
              <div className="space-y-3 rounded-[28px] border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                <p>لم تظهر نتيجة بعد ضمن الدفعات المحمّلة الحالية.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <GraduationCap className="h-4 w-4" />
                  )}
                  تحميل دفعة إضافية للبحث
                </Button>
              </div>
            ) : null}

            {!enrollmentsQuery.isPending &&
            !enrollmentsQuery.error &&
            groupedResults.length > 0 ? (
              <div className="space-y-4">
                {groupedResults.map(([groupLabel, options], groupIndex) => (
                  <div
                    key={groupLabel}
                    className="space-y-2 rounded-[24px] border border-[color:var(--app-accent-strong)]/70 bg-gradient-to-b from-[color:var(--app-accent-soft)]/35 to-background/90 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-2xl border shadow-sm",
                          getGroupIconToneClass(groupIndex),
                        )}
                      >
                        <Search className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{groupLabel}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {options.length} قيد
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">{options.map(renderOption)}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <div ref={loadMoreRef} className="h-3" />

            {isFetchingNextPage ? (
              <div className="flex items-center justify-center gap-2 rounded-[28px] border border-dashed border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                جارٍ تحميل دفعة إضافية من القيود الدراسية...
              </div>
            ) : null}

            {hasNextPage && !isFetchingNextPage ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl px-5"
                  onClick={() => void fetchNextPage()}
                >
                  تحميل المزيد
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </BottomSheetForm>

      <FilterDrawer
        open={controlsDrawerMode !== null}
        onClose={() => setControlsDrawerMode(null)}
        title={controlsDrawerMode === "filter" ? "فلترة القيود الدراسية" : "فرز وعرض القيود"}
        renderInPortal
        overlayClassName="z-[80]"
        className="md:max-w-[520px]"
        actionButtons={
          <div className="flex w-full flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => {
                if (controlsDrawerMode === "filter") {
                  setActiveFilter(defaultActiveFilter);
                  setEnrollmentStatusFilter("all");
                  setDistributionStatusFilter("all");
                } else {
                  setSortBy("grade-name");
                  setGroupBy("grade");
                }
              }}
            >
              إعادة الضبط
            </Button>
            <Button
              type="button"
              className="flex-1 gap-1.5"
              onClick={() => setControlsDrawerMode(null)}
            >
              تطبيق
            </Button>
          </div>
        }
      >
        {controlsDrawerMode === "filter" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)]/40 p-3">
              <p className="mb-2 text-xs font-medium text-[color:var(--app-accent-color)]">
                نطاق القيود
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  value={activeFilter}
                  onChange={(event) =>
                    setActiveFilter(event.target.value as StudentEnrollmentPickerActiveFilter)
                  }
                >
                  {ACTIVE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  value={enrollmentStatusFilter}
                  onChange={(event) =>
                    setEnrollmentStatusFilter(event.target.value as StudentEnrollmentStatus | "all")
                  }
                >
                  {ENROLLMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                حالة التوزيع الدراسي
              </p>
              <SelectField
                value={distributionStatusFilter}
                onChange={(event) =>
                  setDistributionStatusFilter(
                    event.target.value as StudentEnrollmentDistributionStatus | "all",
                  )
                }
              >
                {DISTRIBUTION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)]/35 p-3">
            <p className="mb-2 text-xs font-medium text-[color:var(--app-accent-color)]">
              ترتيب وطريقة العرض
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as StudentEnrollmentPickerSortKey)
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                value={groupBy}
                onChange={(event) =>
                  setGroupBy(event.target.value as StudentEnrollmentPickerGroupKey)
                }
              >
                {GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        )}
      </FilterDrawer>
    </>
  );
}
