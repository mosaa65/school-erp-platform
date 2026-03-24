"use client";

import * as React from "react";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import { type StudentGender } from "@/lib/api/client";
import { translateStudentGender } from "@/lib/i18n/ar";
import { cn } from "@/lib/utils";
import {
  useGuardianPickerQuery,
  type GuardianPickerStatusFilter,
} from "@/features/guardians/hooks/use-guardian-picker-query";
import {
  resolveGuardianPickerDefaults,
  type GuardianPickerVariant,
} from "@/features/guardians/lib/guardian-picker-config";
import {
  loadRecentGuardianPickerOptions,
  saveRecentGuardianPickerOption,
  type GuardianPickerOption,
} from "@/features/guardians/lib/guardian-picker";

type GuardianPickerSheetProps = {
  value: string;
  selectedOption: GuardianPickerOption | null;
  onSelect: (option: GuardianPickerOption | null) => void;
  scope: string;
  variant?: GuardianPickerVariant;
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

type GuardianLinkedStudentsFilter = "all" | "with-students" | "without-students";
type GuardianPickerSortKey =
  | "name-asc"
  | "name-desc"
  | "phone-asc"
  | "phone-desc"
  | "students-desc"
  | "students-asc"
  | "locality-asc";
type GuardianPickerGroupKey = "locality" | "alpha" | "none";
type GuardianPickerControlsDrawerMode = "filter" | "sort" | null;

const GENDER_OPTIONS: Array<{ value: StudentGender | "all"; label: string }> = [
  { value: "all", label: "كل الأجناس" },
  { value: "MALE", label: translateStudentGender("MALE") },
  { value: "FEMALE", label: translateStudentGender("FEMALE") },
  { value: "OTHER", label: translateStudentGender("OTHER") },
];

const STATUS_OPTIONS: Array<{ value: GuardianPickerStatusFilter; label: string }> = [
  { value: "active", label: "النشط فقط" },
  { value: "all", label: "كل أولياء الأمور" },
  { value: "inactive", label: "غير النشط فقط" },
];

const LINKED_STUDENTS_OPTIONS: Array<{
  value: GuardianLinkedStudentsFilter;
  label: string;
}> = [
  { value: "all", label: "كل حالات الارتباط" },
  { value: "with-students", label: "مرتبط بطلاب" },
  { value: "without-students", label: "بدون طلاب" },
];

const SORT_OPTIONS: Array<{ value: GuardianPickerSortKey; label: string }> = [
  { value: "name-asc", label: "الاسم أ - ي" },
  { value: "name-desc", label: "الاسم ي - أ" },
  { value: "phone-asc", label: "الهاتف تصاعدي" },
  { value: "phone-desc", label: "الهاتف تنازلي" },
  { value: "students-desc", label: "الأكثر ارتباطًا بالطلاب" },
  { value: "students-asc", label: "الأقل ارتباطًا بالطلاب" },
  { value: "locality-asc", label: "المنطقة ثم الاسم" },
];

const GROUP_OPTIONS: Array<{ value: GuardianPickerGroupKey; label: string }> = [
  { value: "locality", label: "تجميع حسب المنطقة" },
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

function sortGuardianOptions(
  options: GuardianPickerOption[],
  sortBy: GuardianPickerSortKey,
): GuardianPickerOption[] {
  const sorted = [...options];

  sorted.sort((left, right) => {
    switch (sortBy) {
      case "name-desc":
        return compareText(right.title, left.title);
      case "phone-asc":
        return compareText(
          left.phonePrimary ?? left.whatsappNumber,
          right.phonePrimary ?? right.whatsappNumber,
        );
      case "phone-desc":
        return compareText(
          right.phonePrimary ?? right.whatsappNumber,
          left.phonePrimary ?? left.whatsappNumber,
        );
      case "students-desc":
        return compareNullableNumber(right.linkedStudentsCount, left.linkedStudentsCount);
      case "students-asc":
        return compareNullableNumber(left.linkedStudentsCount, right.linkedStudentsCount);
      case "locality-asc": {
        const localityCompare = compareText(left.localityLabel, right.localityLabel);
        if (localityCompare !== 0) {
          return localityCompare;
        }

        return compareText(left.title, right.title);
      }
      case "name-asc":
      default:
        return compareText(left.title, right.title);
    }
  });

  return sorted;
}

function groupGuardianOptions(
  options: GuardianPickerOption[],
  groupBy: GuardianPickerGroupKey,
) {
  const groups = new Map<string, GuardianPickerOption[]>();

  options.forEach((option) => {
    const groupLabel =
      groupBy === "none"
        ? "النتائج"
        : groupBy === "alpha"
          ? `الحرف: ${getAlphabetGroupLabel(option.title)}`
          : option.groupLabel;
    const current = groups.get(groupLabel) ?? [];
    current.push(option);
    groups.set(groupLabel, current);
  });

  return Array.from(groups.entries());
}

function getSortLabel(sortBy: GuardianPickerSortKey): string {
  return SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? SORT_OPTIONS[0].label;
}

function getGroupLabel(groupBy: GuardianPickerGroupKey): string {
  return GROUP_OPTIONS.find((option) => option.value === groupBy)?.label ?? GROUP_OPTIONS[0].label;
}

function getStatusScopeLabel(statusFilter: GuardianPickerStatusFilter): string {
  if (statusFilter === "all") {
    return "كل أولياء الأمور";
  }

  return statusFilter === "active" ? "النشط فقط" : "غير النشط";
}

function getGuardianBadgeToneClass(badge: string): string {
  if (badge.startsWith("الهاتف") || badge.startsWith("واتساب")) {
    return "border-sky-300/60 bg-sky-500/10 text-sky-700 dark:text-sky-300";
  }

  if (badge.startsWith("طلاب")) {
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

export function GuardianPickerSheet({
  value,
  selectedOption,
  onSelect,
  scope,
  variant = "form",
  placeholder,
  title,
  searchPlaceholder,
  emptySelectionLabel,
  allowEmptySelection,
  disabled = false,
  storageKey,
  className,
  triggerTestId,
}: GuardianPickerSheetProps) {
  const defaults = React.useMemo(
    () => resolveGuardianPickerDefaults({ scope, variant }),
    [scope, variant],
  );
  const defaultStatusFilter = variant === "filter" ? "all" : "active";
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");
  const deferredSearchInput = React.useDeferredValue(searchInput);
  const [serverSearch, setServerSearch] = React.useState("");
  const [recentOptions, setRecentOptions] = React.useState<GuardianPickerOption[]>([]);
  const [controlsDrawerMode, setControlsDrawerMode] =
    React.useState<GuardianPickerControlsDrawerMode>(null);
  const [statusFilter, setStatusFilter] =
    React.useState<GuardianPickerStatusFilter>(defaultStatusFilter);
  const [genderFilter, setGenderFilter] = React.useState<StudentGender | "all">("all");
  const [linkedStudentsFilter, setLinkedStudentsFilter] =
    React.useState<GuardianLinkedStudentsFilter>("all");
  const [sortBy, setSortBy] = React.useState<GuardianPickerSortKey>("name-asc");
  const [groupBy, setGroupBy] = React.useState<GuardianPickerGroupKey>("locality");

  const resolvedPlaceholder = placeholder ?? defaults.placeholder;
  const resolvedTitle = title ?? defaults.title;
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? "ابحث بالاسم أو الهاتف أو الطالب المرتبط...";
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

    setRecentOptions(loadRecentGuardianPickerOptions(resolvedStorageKey));
  }, [isOpen, resolvedStorageKey]);

  const guardiansQuery = useGuardianPickerQuery({
    search: serverSearch,
    enabled: isOpen,
    pageSize: 50,
    statusFilter,
    gender: genderFilter,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = guardiansQuery;

  const normalizedClientSearch = React.useMemo(
    () => normalizeSearchValue(deferredSearchInput),
    [deferredSearchInput],
  );

  const filteredOptions = React.useMemo(() => {
    let next = guardiansQuery.options;

    if (linkedStudentsFilter === "with-students") {
      next = next.filter((option) => Boolean(option.hasLinkedStudents));
    } else if (linkedStudentsFilter === "without-students") {
      next = next.filter((option) => !option.hasLinkedStudents);
    }

    if (normalizedClientSearch) {
      next = next.filter((option) =>
        (option.searchText ?? "").includes(normalizedClientSearch),
      );
    }

    return sortGuardianOptions(next, sortBy);
  }, [guardiansQuery.options, linkedStudentsFilter, normalizedClientSearch, sortBy]);

  const groupedResults = React.useMemo(
    () => groupGuardianOptions(filteredOptions, groupBy),
    [filteredOptions, groupBy],
  );

  const activeFiltersCount = React.useMemo(() => {
    return [
      statusFilter !== defaultStatusFilter ? 1 : 0,
      genderFilter !== "all" ? 1 : 0,
      linkedStudentsFilter !== "all" ? 1 : 0,
    ].reduce((sum, value) => sum + value, 0);
  }, [defaultStatusFilter, genderFilter, linkedStudentsFilter, statusFilter]);

  const closeSheet = () => {
    setIsOpen(false);
    setSearchInput("");
    setServerSearch("");
    setControlsDrawerMode(null);
  };

  const handleSelect = (option: GuardianPickerOption | null) => {
    if (option) {
      const updatedRecentOptions = saveRecentGuardianPickerOption(option, resolvedStorageKey);
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

  const renderOption = (option: GuardianPickerOption) => {
    const isSelected = value === option.id;
    const badges = [
      option.phonePrimary ? `الهاتف ${option.phonePrimary}` : null,
      option.whatsappNumber &&
      option.whatsappNumber !== option.phonePrimary
        ? `واتساب ${option.whatsappNumber}`
        : null,
      option.genderLabel ?? null,
      option.linkedStudentsCount !== undefined
        ? `طلاب ${option.linkedStudentsCount}`
        : null,
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
                    getGuardianBadgeToneClass(badge),
                  )}
                >
                  {badge}
                </span>
              ))}
            </div>
            {option.linkedStudentsSummary ? (
              <p className="truncate text-[11px] text-muted-foreground">
                طلاب مرتبطون: {option.linkedStudentsSummary}
              </p>
            ) : null}
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
        description="تصفح أولياء الأمور مباشرة، ثم فلتر أو فرّز النتائج للوصول الأسرع."
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
                <p className="text-muted-foreground">واجهة موحّدة</p>
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
                      setStatusFilter((previous) =>
                        previous === "all" ? defaultStatusFilter : "all",
                      )
                    }
                    className="h-10 w-10 shrink-0 rounded-2xl px-0 text-xs sm:w-auto sm:px-3"
                  >
                    <UsersRound className="h-4 w-4" />
                    <span className="hidden sm:inline">{getStatusScopeLabel(statusFilter)}</span>
                    <span className="sr-only sm:hidden">{getStatusScopeLabel(statusFilter)}</span>
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
                  أولياء الأمور {guardiansQuery.options.length}/
                  {guardiansQuery.totalAvailable || guardiansQuery.options.length}
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

            {guardiansQuery.isPending ? (
              <div className="flex items-center justify-center gap-2 rounded-[28px] border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                جارٍ تحميل أول دفعة من أولياء الأمور...
              </div>
            ) : null}

            {guardiansQuery.error ? (
              <div className="rounded-[28px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {guardiansQuery.error instanceof Error
                  ? guardiansQuery.error.message
                  : "تعذّر جلب البيانات."}
              </div>
            ) : null}

            {!guardiansQuery.isPending &&
            !guardiansQuery.error &&
            filteredOptions.length === 0 &&
            !hasNextPage ? (
              <div className="rounded-[28px] border border-dashed border-border/80 bg-background/70 p-5 text-sm text-muted-foreground">
                لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية.
              </div>
            ) : null}

            {!guardiansQuery.isPending &&
            !guardiansQuery.error &&
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
                    <UsersRound className="h-4 w-4" />
                  )}
                  تحميل دفعة إضافية للبحث
                </Button>
              </div>
            ) : null}

            {!guardiansQuery.isPending &&
            !guardiansQuery.error &&
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
                          {options.length} نتيجة
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
                جارٍ تحميل دفعة إضافية من أولياء الأمور...
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
        title={controlsDrawerMode === "filter" ? "فلترة أولياء الأمور" : "فرز وعرض أولياء الأمور"}
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
                  setStatusFilter(defaultStatusFilter);
                  setGenderFilter("all");
                  setLinkedStudentsFilter("all");
                } else {
                  setSortBy("name-asc");
                  setGroupBy("locality");
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
                نطاق النتائج
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as GuardianPickerStatusFilter)
                  }
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  value={linkedStudentsFilter}
                  onChange={(event) =>
                    setLinkedStudentsFilter(event.target.value as GuardianLinkedStudentsFilter)
                  }
                >
                  {LINKED_STUDENTS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">الجنس</p>
              <SelectField
                value={genderFilter}
                onChange={(event) => setGenderFilter(event.target.value as StudentGender | "all")}
              >
                {GENDER_OPTIONS.map((option) => (
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
                onChange={(event) => setSortBy(event.target.value as GuardianPickerSortKey)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                value={groupBy}
                onChange={(event) => setGroupBy(event.target.value as GuardianPickerGroupKey)}
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
