"use client";

import * as React from "react";
import {
  AlertCircle,
  BookOpenCheck,
  Check,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Users,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useHomeworkOptionsQuery } from "@/features/assignments/student-homeworks/hooks/use-homework-options-query";
import { useStudentHomeworksQuery } from "@/features/assignments/student-homeworks/hooks/use-student-homeworks-query";
import { useBulkUpdateStudentHomeworksMutation } from "@/features/assignments/student-homeworks/hooks/use-student-homeworks-mutations";
import { usePopulateHomeworkStudentsMutation } from "@/features/assignments/homeworks/hooks/use-homeworks-mutations";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { cn } from "@/lib/utils";
import type { StudentHomeworkListItem } from "@/lib/api/client";

type DraftStudentHomework = {
  isCompleted: boolean;
  manualScore: string;
  teacherNotes: string;
};

type CompletionFilter = "all" | "completed" | "pending";

const QUICK_NOTES = [
  "تم التنفيذ بإتقان",
  "ناقص",
  "لم يحضر الدفتر",
  "يحتاج متابعة ولي الأمر",
];

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (!error) {
    return "";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "حدث خطأ غير متوقع";
}

function getStudentSearchText(item: StudentHomeworkListItem) {
  const student = item.studentEnrollment.student;
  return `${student.fullName} ${student.admissionNo ?? ""}`.toLowerCase();
}

export function HomeworkEntryWorkspace() {
  const queryClient = useQueryClient();
  const { hasPermission } = useRbac();
  const canUpdate = hasPermission("student-homeworks.bulk-update");
  const canPopulate = hasPermission("homeworks.populate-students");

  const [sectionId, setSectionId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [homeworkId, setHomeworkId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [completionFilter, setCompletionFilter] =
    React.useState<CompletionFilter>("all");
  const [drafts, setDrafts] = React.useState<Record<string, DraftStudentHomework>>({});
  const [successMessage, setSuccessMessage] = React.useState("");

  const homeworksQuery = useHomeworkOptionsQuery();
  const homeworks = React.useMemo(() => homeworksQuery.data ?? [], [homeworksQuery.data]);

  const sections = React.useMemo(() => {
    const map = new Map<string, (typeof homeworks)[number]["section"]>();
    homeworks.forEach((homework) => {
      map.set(homework.sectionId, homework.section);
    });
    return Array.from(map.values()).sort((a, b) =>
      formatSectionWithGradeLabel(a).localeCompare(formatSectionWithGradeLabel(b), "ar"),
    );
  }, [homeworks]);

  const subjects = React.useMemo(() => {
    const map = new Map<string, (typeof homeworks)[number]["subject"]>();
    homeworks
      .filter((homework) => !sectionId || homework.sectionId === sectionId)
      .forEach((homework) => {
        map.set(homework.subjectId, homework.subject);
      });
    return Array.from(map.values()).sort((a, b) =>
      formatNameCodeLabel(a.name, a.code).localeCompare(
        formatNameCodeLabel(b.name, b.code),
        "ar",
      ),
    );
  }, [homeworks, sectionId]);

  const filteredHomeworks = React.useMemo(
    () =>
      homeworks.filter(
        (homework) =>
          (!sectionId || homework.sectionId === sectionId) &&
          (!subjectId || homework.subjectId === subjectId),
      ),
    [homeworks, sectionId, subjectId],
  );

  React.useEffect(() => {
    if (!homeworkId && filteredHomeworks.length > 0) {
      setHomeworkId(filteredHomeworks[0].id);
      return;
    }

    if (homeworkId && !filteredHomeworks.some((homework) => homework.id === homeworkId)) {
      setHomeworkId(filteredHomeworks[0]?.id ?? "");
    }
  }, [filteredHomeworks, homeworkId]);

  const selectedHomework = React.useMemo(
    () => homeworks.find((homework) => homework.id === homeworkId),
    [homeworks, homeworkId],
  );
  const selectedHomeworkLocked = Boolean(selectedHomework?.isLocked);

  const studentHomeworksQuery = useStudentHomeworksQuery({
    homeworkId: homeworkId || undefined,
    limit: 250,
    page: 1,
    isActive: true,
  });

  const rows = React.useMemo(
    () => studentHomeworksQuery.data?.data ?? [],
    [studentHomeworksQuery.data?.data],
  );

  React.useEffect(() => {
    const nextDrafts: Record<string, DraftStudentHomework> = {};
    rows.forEach((row) => {
      nextDrafts[row.id] = {
        isCompleted: row.isCompleted,
        manualScore: row.manualScore === null ? "" : String(row.manualScore),
        teacherNotes: row.teacherNotes ?? "",
      };
    });
    setDrafts(nextDrafts);
    setSuccessMessage("");
  }, [rows]);

  const visibleRows = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((row) => {
      const draft = drafts[row.id];
      const isCompleted = draft?.isCompleted ?? row.isCompleted;
      const matchesSearch =
        !normalizedSearch || getStudentSearchText(row).includes(normalizedSearch);
      const matchesFilter =
        completionFilter === "all" ||
        (completionFilter === "completed" && isCompleted) ||
        (completionFilter === "pending" && !isCompleted);

      return matchesSearch && matchesFilter;
    });
  }, [completionFilter, drafts, rows, search]);

  const stats = React.useMemo(() => {
    const values = rows.map((row) => drafts[row.id]?.isCompleted ?? row.isCompleted);
    const completed = values.filter(Boolean).length;
    const pending = Math.max(values.length - completed, 0);
    const percent = values.length > 0 ? Math.round((completed / values.length) * 100) : 0;

    return {
      total: values.length,
      completed,
      pending,
      percent,
    };
  }, [drafts, rows]);

  const bulkUpdateMutation = useBulkUpdateStudentHomeworksMutation();
  const populateMutation = usePopulateHomeworkStudentsMutation();

  function updateDraft(rowId: string, patch: Partial<DraftStudentHomework>) {
    setSuccessMessage("");
    setDrafts((current) => ({
      ...current,
      [rowId]: {
        isCompleted: current[rowId]?.isCompleted ?? false,
        manualScore: current[rowId]?.manualScore ?? "",
        teacherNotes: current[rowId]?.teacherNotes ?? "",
        ...patch,
      },
    }));
  }

  function markAll(isCompleted: boolean) {
    setSuccessMessage("");
    setDrafts((current) => {
      const next = { ...current };
      rows.forEach((row) => {
        next[row.id] = {
          isCompleted,
          manualScore: isCompleted
            ? (next[row.id]?.manualScore || String(row.homework.maxScore))
            : "",
          teacherNotes: next[row.id]?.teacherNotes ?? "",
        };
      });
      return next;
    });
  }

  function markAllFullScore() {
    setSuccessMessage("");
    setDrafts((current) => {
      const next = { ...current };
      rows.forEach((row) => {
        next[row.id] = {
          isCompleted: true,
          manualScore: String(row.homework.maxScore),
          teacherNotes: next[row.id]?.teacherNotes ?? "",
        };
      });
      return next;
    });
  }

  async function handlePopulateStudents() {
    if (!homeworkId) {
      return;
    }

    setSuccessMessage("");
    const result = await populateMutation.mutateAsync(homeworkId);
    await queryClient.invalidateQueries({
      queryKey: ["student-homeworks", "list"],
    });
    await studentHomeworksQuery.refetch();
    setSuccessMessage(
      `تم تجهيز ${result.insertedCount} طالب جديد، واستعادة ${result.restoredCount} سجل سابق.`,
    );
  }

  async function handleSave() {
    if (!homeworkId || rows.length === 0) {
      return;
    }

    setSuccessMessage("");
    const payload = {
      homeworkId,
      items: rows.map((row) => {
        const draft = drafts[row.id] ?? {
          isCompleted: row.isCompleted,
          manualScore: row.manualScore === null ? "" : String(row.manualScore),
          teacherNotes: row.teacherNotes ?? "",
        };
        const score = draft.manualScore.trim();

        return {
          studentHomeworkId: row.id,
          isCompleted: draft.isCompleted,
          manualScore: draft.isCompleted && score ? Number(score) : undefined,
          teacherNotes: draft.teacherNotes.trim() || undefined,
        };
      }),
    };

    const result = await bulkUpdateMutation.mutateAsync(payload);
    setSuccessMessage(
      `تم حفظ ${result.summary.total} سجل: ${result.summary.completed} نفذ، ${result.summary.pending} لم ينفذ.`,
    );
  }

  const isBusy =
    bulkUpdateMutation.isPending ||
    populateMutation.isPending ||
    studentHomeworksQuery.isFetching;
  const errorMessage =
    getErrorMessage(bulkUpdateMutation.error) ||
    getErrorMessage(populateMutation.error) ||
    getErrorMessage(studentHomeworksQuery.error);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-[color:var(--app-accent-strong)]/30 bg-gradient-to-br from-[color:var(--app-accent-soft)]/40 via-background/95 to-background shadow-[0_24px_70px_-52px_rgba(15,23,42,0.58)]">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.35fr_0.65fr] lg:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <BookOpenCheck className="h-3.5 w-3.5" />
                  إدخال سريع للواجبات
                </div>
                <h1 className="text-2xl font-bold tracking-normal text-foreground">
                  لوحة رصد تنفيذ الطلاب
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  اختر الشعبة والمادة والواجب، ثم حدد حالة كل طالب بزرين واضحين واحفظ
                  الجميع دفعة واحدة.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void studentHomeworksQuery.refetch()}
                  disabled={!homeworkId || isBusy}
                >
                  <RefreshCw className={cn(isBusy ? "animate-spin" : "")} />
                  تحديث
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={
                    !canUpdate ||
                    selectedHomeworkLocked ||
                    rows.length === 0 ||
                    bulkUpdateMutation.isPending
                  }
                >
                  {bulkUpdateMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Save />
                  )}
                  حفظ جماعي
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-2 text-sm font-medium">
                <span>الشعبة</span>
                <select
                  className="h-11 w-full rounded-2xl border border-border/60 bg-background px-3 text-sm shadow-sm"
                  value={sectionId}
                  onChange={(event) => {
                    setSectionId(event.target.value);
                    setSubjectId("");
                    setHomeworkId("");
                  }}
                >
                  <option value="">كل الشعب</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {formatSectionWithGradeLabel(section)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium">
                <span>المادة</span>
                <select
                  className="h-11 w-full rounded-2xl border border-border/60 bg-background px-3 text-sm shadow-sm"
                  value={subjectId}
                  onChange={(event) => {
                    setSubjectId(event.target.value);
                    setHomeworkId("");
                  }}
                >
                  <option value="">كل المواد</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {formatNameCodeLabel(subject.name, subject.code)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium">
                <span>الواجب</span>
                <select
                  className="h-11 w-full rounded-2xl border border-border/60 bg-background px-3 text-sm shadow-sm"
                  value={homeworkId}
                  onChange={(event) => setHomeworkId(event.target.value)}
                  disabled={homeworksQuery.isPending}
                >
                  <option value="">اختر واجب</option>
                  {filteredHomeworks.map((homework) => (
                    <option key={homework.id} value={homework.id}>
                      {homework.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.36)] backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">ملخص الواجب</span>
              {selectedHomework ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedHomework.homeworkType.name}</Badge>
                  {selectedHomework.isLocked ? (
                    <Badge variant="destructive">مقفل</Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
            {selectedHomework ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold">{selectedHomework.title}</div>
                  <div className="mt-1 text-muted-foreground">
                    {formatNameCodeLabel(
                      selectedHomework.subject.name,
                      selectedHomework.subject.code,
                    )}{" "}
                    - {formatSectionWithGradeLabel(selectedHomework.section)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="الدرجة" value={String(selectedHomework.maxScore)} />
                  <Metric label="التسليم" value={formatDate(selectedHomework.dueDate)} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void handlePopulateStudents()}
                  disabled={
                    !canPopulate ||
                    selectedHomeworkLocked ||
                    !homeworkId ||
                    populateMutation.isPending
                  }
                >
                  {populateMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Users />
                  )}
                  تجهيز طلاب الواجب
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                اختر واجبا لعرض بياناته والبدء في الرصد.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="إجمالي الطلاب" value={stats.total} icon={<Users />} />
        <MetricCard label="نفذ" value={stats.completed} icon={<Check />} tone="success" />
        <MetricCard label="لم ينفذ" value={stats.pending} icon={<X />} tone="danger" />
        <MetricCard label="نسبة الإنجاز" value={`${stats.percent}%`} icon={<ClipboardCheck />} />
      </section>

      <section className="rounded-lg border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">سجلات الطلاب</h2>
            <p className="text-sm text-muted-foreground">
              استخدم البطاقات للرصد السريع، والدرجة اختيارية حسب سياسة المعلم.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => markAll(true)}
              disabled={!canUpdate || selectedHomeworkLocked || rows.length === 0}
            >
              <Check />
              الكل نفذ
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={markAllFullScore}
              disabled={!canUpdate || selectedHomeworkLocked || rows.length === 0}
            >
              <Check />
              الكل بدرجة كاملة
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => markAll(false)}
              disabled={!canUpdate || selectedHomeworkLocked || rows.length === 0}
            >
              <X />
              الكل لم ينفذ
            </Button>
          </div>
        </div>

        <div className="border-b p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث باسم الطالب أو رقم القيد"
              icon={<Search />}
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={completionFilter}
              onChange={(event) =>
                setCompletionFilter(event.target.value as CompletionFilter)
              }
            >
              <option value="all">كل الحالات</option>
              <option value="completed">نفذ فقط</option>
              <option value="pending">لم ينفذ فقط</option>
            </select>
          </div>
        </div>

        {successMessage ? (
          <div className="mx-4 mt-4 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {successMessage}
          </div>
        ) : null}

        {(bulkUpdateMutation.error || populateMutation.error || studentHomeworksQuery.error) ? (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <div className="p-4">
          {homeworksQuery.isPending || (studentHomeworksQuery.isPending && homeworkId) ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري تحميل سجلات الواجب...
            </div>
          ) : !homeworkId ? (
            <EmptyState text="اختر واجبا من الأعلى حتى تظهر قائمة الطلاب." />
          ) : rows.length === 0 ? (
            <EmptyState text="لا توجد سجلات طلاب لهذا الواجب. اضغط تجهيز طلاب الواجب أولا." />
          ) : visibleRows.length === 0 ? (
            <EmptyState text="لا توجد نتائج مطابقة للبحث الحالي." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleRows.map((row) => (
                <StudentHomeworkCard
                  key={row.id}
                  row={row}
                  draft={drafts[row.id]}
                  canUpdate={canUpdate && !selectedHomeworkLocked}
                  onChange={(patch) => updateDraft(row.id, patch)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-4",
        tone === "success" && "border-emerald-500/25 bg-emerald-500/5",
        tone === "danger" && "border-rose-500/25 bg-rose-500/5",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="rounded-md border bg-background p-2 text-[color:var(--app-accent-color)] [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function StudentHomeworkCard({
  row,
  draft,
  canUpdate,
  onChange,
}: {
  row: StudentHomeworkListItem;
  draft?: DraftStudentHomework;
  canUpdate: boolean;
  onChange: (patch: Partial<DraftStudentHomework>) => void;
}) {
  const currentDraft = draft ?? {
    isCompleted: row.isCompleted,
    manualScore: row.manualScore === null ? "" : String(row.manualScore),
    teacherNotes: row.teacherNotes ?? "",
  };
  const student = row.studentEnrollment.student;

  return (
    <Card
      className={cn(
        "rounded-lg shadow-none transition-colors",
        currentDraft.isCompleted
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-rose-500/20 bg-rose-500/5",
      )}
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{student.fullName}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              رقم القيد: {student.admissionNo ?? "-"}
            </div>
          </div>
          <Badge variant={currentDraft.isCompleted ? "default" : "destructive"}>
            {currentDraft.isCompleted ? "نفذ" : "لم ينفذ"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant={currentDraft.isCompleted ? "default" : "outline"}
            onClick={() =>
              onChange({
                isCompleted: true,
                manualScore: currentDraft.manualScore || String(row.homework.maxScore),
              })
            }
            disabled={!canUpdate}
          >
            <Check />
            نفذ
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!currentDraft.isCompleted ? "default" : "outline"}
            onClick={() =>
              onChange({
                isCompleted: false,
                manualScore: "",
              })
            }
            disabled={!canUpdate}
          >
            <X />
            لم ينفذ
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-[110px_1fr]">
          <label className="space-y-1 text-xs font-medium">
            <span>الدرجة</span>
            <Input
              type="number"
              min={0}
              max={row.homework.maxScore}
              step="0.25"
              value={currentDraft.manualScore}
              onChange={(event) => onChange({ manualScore: event.target.value })}
              disabled={!canUpdate || !currentDraft.isCompleted}
              placeholder={`من ${row.homework.maxScore}`}
              className="h-9"
            />
          </label>
          <label className="space-y-1 text-xs font-medium">
            <span>ملاحظة</span>
            <Input
              value={currentDraft.teacherNotes}
              onChange={(event) => onChange({ teacherNotes: event.target.value })}
              disabled={!canUpdate}
              placeholder="اختياري"
              className="h-9"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_NOTES.map((note) => (
            <button
              key={note}
              type="button"
              className="rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
              onClick={() => onChange({ teacherNotes: note })}
              disabled={!canUpdate}
            >
              {note}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
