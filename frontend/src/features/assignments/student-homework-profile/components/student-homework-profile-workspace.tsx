"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { useStudentHomeworksQuery } from "@/features/assignments/student-homeworks/hooks/use-student-homeworks-query";
import { useStudentOptionsQuery } from "@/features/assignments/student-homeworks/hooks/use-student-options-query";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function StudentHomeworkProfileWorkspace() {
  const [studentId, setStudentId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const studentsQuery = useStudentOptionsQuery();
  const studentHomeworksQuery = useStudentHomeworksQuery({
    studentId: studentId || undefined,
    search: search.trim() || undefined,
    limit: 100,
    page: 1,
    isActive: true,
  });

  const rows = studentHomeworksQuery.data?.data ?? [];
  const completedCount = rows.filter((row) => row.isCompleted).length;
  const pendingCount = Math.max(rows.length - completedCount, 0);
  const overdueCount = rows.filter(
    (row) =>
      !row.isCompleted &&
      row.homework.dueDate &&
      new Date(row.homework.dueDate).getTime() < Date.now(),
  ).length;
  const completionRate =
    rows.length > 0 ? Math.round((completedCount / rows.length) * 100) : 0;
  const selectedStudent = (studentsQuery.data ?? []).find((student) => student.id === studentId);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[color:var(--app-accent-strong)]/25 bg-gradient-to-br from-[color:var(--app-accent-soft)]/35 via-background/95 to-background p-5 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <UserRound className="h-3.5 w-3.5" />
              ملف الطالب
            </div>
            <h1 className="text-2xl font-bold tracking-normal">ملف واجبات الطالب</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              عرض مركز لحالة واجبات طالب واحد: المنفذ، غير المنفذ، الدرجات، والملاحظات.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/app/student-homeworks">
              <ClipboardList />
              كل سجلات الطلاب
            </Link>
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr]">
          <SelectField value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            <option value="">اختر طالبا</option>
            {(studentsQuery.data ?? []).map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName} {student.admissionNo ? `(${student.admissionNo})` : ""}
              </option>
            ))}
          </SelectField>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث داخل واجبات الطالب"
            icon={<Search />}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <StudentMetric label="إجمالي الواجبات" value={rows.length} />
        <StudentMetric label="نفذ" value={completedCount} tone="success" />
        <StudentMetric label="لم ينفذ" value={pendingCount} tone="danger" />
        <StudentMetric label="متأخر" value={overdueCount} tone="danger" />
      </section>

      <section className="rounded-[24px] border border-border/60 bg-card/80 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">نسبة الإنجاز</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              مؤشر سريع يمكن عرضه للإدارة أو ولي الأمر.
            </p>
          </div>
          <Badge variant="outline">{completionRate}%</Badge>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[color:var(--app-accent-color)]"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </section>

      {selectedStudent ? (
        <section className="rounded-[24px] border border-border/60 bg-card/80 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{selectedStudent.fullName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                رقم القيد: {selectedStudent.admissionNo ?? "-"}
              </p>
            </div>
            <Badge variant="outline">ملف متابعة</Badge>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]">
        <div className="border-b border-border/60 bg-background/60 p-4">
          <h2 className="font-semibold">سجل الواجبات</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            آخر واجبات الطالب حسب التاريخ والحالة.
          </p>
        </div>
        <div className="divide-y">
          {studentHomeworksQuery.isPending ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري تحميل ملف الطالب...
            </div>
          ) : !studentId ? (
            <EmptyLine text="اختر طالبا لعرض ملف واجباته." />
          ) : rows.length === 0 ? (
            <EmptyLine text="لا توجد واجبات لهذا الطالب ضمن النطاق الحالي." />
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{row.homework.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatNameCodeLabel(row.homework.subject.name, row.homework.subject.code)} -{" "}
                    {formatSectionWithGradeLabel(row.homework.section)} - التسليم{" "}
                    {formatDate(row.homework.dueDate)}
                  </div>
                  {row.teacherNotes ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      ملاحظة: {row.teacherNotes}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={row.isCompleted ? "outline" : "destructive"}>
                    {row.isCompleted ? (
                      <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="ml-1 h-3.5 w-3.5" />
                    )}
                    {row.isCompleted ? "نفذ" : "لم ينفذ"}
                  </Badge>
                  <Badge variant="secondary">
                    {row.manualScore ?? (row.isCompleted ? row.homework.maxScore : 0)} /{" "}
                    {row.homework.maxScore}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/app/homework-entry">
            <ClipboardCheck />
            إدخال سريع
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/homework-reports">تقارير الواجبات</Link>
        </Button>
      </div>
    </div>
  );
}

function StudentMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-[22px] border border-border/60 bg-background/80 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div
        className={
          tone === "success"
            ? "mt-2 text-2xl font-bold text-emerald-600"
            : tone === "danger"
              ? "mt-2 text-2xl font-bold text-rose-600"
              : "mt-2 text-2xl font-bold"
        }
      >
        {value}
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="m-4 rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
