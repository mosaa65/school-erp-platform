"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  RefreshCw,
  Search,
  TimerReset,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SelectField } from "@/components/ui/select-field";
import { useHomeworksDashboardQuery } from "@/features/assignments/homework-dashboard/hooks/use-homeworks-dashboard-query";
import { useAcademicYearOptionsQuery } from "@/features/assignments/homeworks/hooks/use-academic-year-options-query";
import { useAcademicTermOptionsQuery } from "@/features/assignments/homeworks/hooks/use-academic-term-options-query";
import { useSectionOptionsQuery } from "@/features/assignments/homeworks/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/assignments/homeworks/hooks/use-subject-options-query";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { cn } from "@/lib/utils";
import type { HomeworkListItem } from "@/lib/api/client";

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

export function HomeworkDashboardWorkspace() {
  const [academicYearId, setAcademicYearId] = React.useState("");
  const [academicTermId, setAcademicTermId] = React.useState("");
  const [sectionId, setSectionId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const academicTermsQuery = useAcademicTermOptionsQuery(academicYearId || undefined);
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();

  React.useEffect(() => {
    if (academicYearId || !academicYearsQuery.data) {
      return;
    }

    const currentYear = academicYearsQuery.data.find((year) => year.isCurrent);
    setAcademicYearId(currentYear?.id ?? academicYearsQuery.data[0]?.id ?? "");
  }, [academicYearId, academicYearsQuery.data]);

  React.useEffect(() => {
    if (!academicTermsQuery.data || academicTermsQuery.data.length === 0) {
      setAcademicTermId("");
      return;
    }

    if (
      academicTermId &&
      academicTermsQuery.data.some((term) => term.id === academicTermId)
    ) {
      return;
    }

    setAcademicTermId(academicTermsQuery.data[0]?.id ?? "");
  }, [academicTermId, academicTermsQuery.data]);

  const dashboardQuery = useHomeworksDashboardQuery({
    academicYearId: academicYearId || undefined,
    academicTermId: academicTermId || undefined,
    sectionId: sectionId || undefined,
    subjectId: subjectId || undefined,
  });

  const metrics = dashboardQuery.data?.metrics;
  const isLoading = dashboardQuery.isPending;
  const completionRate = metrics?.completionRate ?? 0;
  const pendingRate =
    (metrics?.totalStudentRows ?? 0) === 0
      ? 0
      : Math.round(
          ((metrics?.pendingStudentRows ?? 0) / (metrics?.totalStudentRows ?? 0)) * 100,
        );
  const workloadTone =
    (metrics?.overdueHomeworks ?? 0) > 0
      ? "danger"
      : (metrics?.dueSoonHomeworks ?? 0) > 0
        ? "warn"
        : "good";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-[color:var(--app-accent-strong)]/30 bg-gradient-to-br from-[color:var(--app-accent-soft)]/45 via-background/95 to-background shadow-[0_26px_80px_-60px_rgba(15,23,42,0.6)]">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <BarChart3 className="h-3.5 w-3.5" />
              مركز قيادة الواجبات
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                لوحة تحكم نظام الواجبات
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                متابعة يومية للواجبات، المتأخرات، نسبة الإنجاز، والواجبات التي تحتاج
                تدخل سريع من المعلم أو الإدارة.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-2xl">
                <Link href="/app/homework-entry">
                  <ClipboardCheck />
                  إدخال سريع
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl">
                <Link href="/app/homeworks">
                  <ClipboardList />
                  إدارة الواجبات
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={() => void dashboardQuery.refetch()}
                disabled={dashboardQuery.isFetching}
              >
                <RefreshCw className={cn(dashboardQuery.isFetching && "animate-spin")} />
                تحديث
              </Button>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.36)] backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-[color:var(--app-accent-color)]" />
              نطاق المتابعة
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                value={academicYearId}
                onChange={(event) => {
                  setAcademicYearId(event.target.value);
                  setAcademicTermId("");
                }}
              >
                <option value="">كل الأعوام</option>
                {(academicYearsQuery.data ?? []).map((year) => (
                  <option key={year.id} value={year.id}>
                    {formatNameCodeLabel(year.name, year.code)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                value={academicTermId}
                onChange={(event) => setAcademicTermId(event.target.value)}
              >
                <option value="">كل الفصول</option>
                {(academicTermsQuery.data ?? []).map((term) => (
                  <option key={term.id} value={term.id}>
                    {formatNameCodeLabel(term.name, term.code)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
              >
                <option value="">كل الشعب</option>
                {(sectionsQuery.data ?? []).map((section) => (
                  <option key={section.id} value={section.id}>
                    {formatSectionWithGradeLabel(section)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
              >
                <option value="">كل المواد</option>
                {(subjectsQuery.data ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {formatNameCodeLabel(subject.name, subject.code)}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        </div>
      </section>

      {dashboardQuery.error ? (
        <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {getErrorMessage(dashboardQuery.error)}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="إجمالي الواجبات"
          value={metrics?.totalHomeworks ?? 0}
          icon={<BookOpenCheck />}
          loading={isLoading}
        />
        <MetricCard
          label="واجبات اليوم"
          value={metrics?.todayHomeworks ?? 0}
          icon={<CalendarClock />}
          loading={isLoading}
        />
        <MetricCard
          label="مستحقة قريبا"
          value={metrics?.dueSoonHomeworks ?? 0}
          icon={<TimerReset />}
          loading={isLoading}
        />
        <MetricCard
          label="متأخرة"
          value={metrics?.overdueHomeworks ?? 0}
          icon={<AlertTriangle />}
          tone="danger"
          loading={isLoading}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          title="نسبة الإكمال"
          value={`${completionRate}%`}
          description="متوسط تنفيذ الطلاب للواجبات داخل النطاق الحالي."
          tone={completionRate >= 80 ? "good" : completionRate >= 50 ? "warn" : "danger"}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <InsightCard
          title="نسبة الانتظار"
          value={`${pendingRate}%`}
          description="النسبة المتبقية التي تحتاج متابعة أو تدخل."
          tone={pendingRate <= 20 ? "good" : pendingRate <= 50 ? "warn" : "danger"}
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <InsightCard
          title="الواجبات العاجلة"
          value={`${metrics?.overdueHomeworks ?? 0}`}
          description="واجبات متأخرة تحتاج مراجعة مباشرة."
          tone={workloadTone}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <InsightCard
          title="نافذة الاستحقاق"
          value={`${metrics?.dueSoonHomeworks ?? 0}`}
          description="واجبات ستصل لموعدها خلال الأيام القادمة."
          tone={(metrics?.dueSoonHomeworks ?? 0) > 0 ? "warn" : "good"}
          icon={<TimerReset className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)] backdrop-blur-sm">
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">نسبة الإنجاز</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  قياس تنفيذ الطلاب للواجبات ضمن النطاق المحدد.
                </p>
              </div>
              <Badge variant="outline">{metrics?.completionRate ?? 0}%</Badge>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[color:var(--app-accent-color)] transition-all"
                style={{ width: `${metrics?.completionRate ?? 0}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <SmallStat label="السجلات" value={metrics?.totalStudentRows ?? 0} />
              <SmallStat label="نفذ" value={metrics?.completedStudentRows ?? 0} />
              <SmallStat label="لم ينفذ" value={metrics?.pendingStudentRows ?? 0} />
            </div>
          </CardContent>
        </Card>

        <div className="rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
            <div>
              <h2 className="font-semibold">أعلى واجبات تحتاج متابعة</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                مرتبة حسب عدد الطلاب الذين لم ينفذوا.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/homework-entry">فتح الإدخال</Link>
            </Button>
          </div>
          <div className="divide-y">
            {dashboardQuery.isPending ? (
              <LoadingRows />
            ) : (dashboardQuery.data?.topPendingHomeworks ?? []).length === 0 ? (
              <EmptyLine text="لا توجد واجبات متعثرة في النطاق الحالي." />
            ) : (
              dashboardQuery.data?.topPendingHomeworks.map((item) => (
                <div
                  key={item.homeworkId}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatNameCodeLabel(item.subject.name, item.subject.code)} -{" "}
                      {formatSectionWithGradeLabel(item.section)} - التسليم{" "}
                      {formatDate(item.dueDate)}
                    </div>
                  </div>
                  <Badge variant="destructive">{item.pendingCount} لم ينفذ</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]">
        <div className="border-b border-border/60 p-4">
          <h2 className="font-semibold">آخر الواجبات</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            أحدث الواجبات المنشأة حسب النطاق الحالي.
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboardQuery.isPending ? (
            <LoadingCards />
          ) : (dashboardQuery.data?.recentHomeworks ?? []).length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyLine text="لا توجد واجبات بعد." />
            </div>
          ) : (
            dashboardQuery.data?.recentHomeworks.map((homework) => (
              <RecentHomeworkCard key={homework.id} homework={homework} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: "danger";
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border bg-background/80 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)] backdrop-blur-sm",
        tone === "danger" && "border-rose-500/25 bg-rose-500/8",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="rounded-xl border bg-background p-2 text-[color:var(--app-accent-color)] [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
      </div>
    </div>
  );
}

function InsightCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: "good" | "warn" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border bg-background/80 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)] backdrop-blur-sm",
        tone === "good" && "border-emerald-500/20",
        tone === "warn" && "border-amber-500/20",
        tone === "danger" && "border-rose-500/25 bg-rose-500/8",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className="rounded-xl border border-border/60 bg-background p-2 text-[color:var(--app-accent-color)] [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}

function RecentHomeworkCard({ homework }: { homework: HomeworkListItem }) {
  const completionCount = homework._count.studentHomeworks;

  return (
    <Card className="rounded-[22px] border-border/60 bg-background/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{homework.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatNameCodeLabel(homework.subject.name, homework.subject.code)}
            </div>
          </div>
          <Badge variant="outline">{homework.homeworkType.name}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <SmallInfo label="الشعبة" value={formatSectionWithGradeLabel(homework.section)} />
          <SmallInfo label="التسليم" value={formatDate(homework.dueDate)} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            سجلات الطلاب
          </span>
          <span className="font-semibold">{completionCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
      جاري تحميل المؤشرات...
    </div>
  );
}

function LoadingCards() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-36 animate-pulse rounded-[22px] border border-border/50 bg-muted/30" />
      ))}
    </>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
      <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-600" />
      {text}
    </div>
  );
}
