"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  BellRing,
  ClipboardCheck,
  FileText,
  Loader2,
  PieChart,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportBarChart, ReportPieChart } from "@/components/ui/report-charts";
import { WideMetricRow } from "@/components/ui/wide-metric-row";
import { useHomeworksDashboardQuery } from "@/features/assignments/homework-dashboard/hooks/use-homeworks-dashboard-query";
import { useSendHomeworkLateNotificationsMutation } from "@/features/assignments/homeworks/hooks/use-homeworks-mutations";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function HomeworkReportsWorkspace() {
  const { hasPermission } = useRbac();
  const canSendNotifications = hasPermission("homework-notifications.send");
  const dashboardQuery = useHomeworksDashboardQuery();
  const sendNotificationsMutation = useSendHomeworkLateNotificationsMutation();
  const metrics = dashboardQuery.data?.metrics;
  const pendingRows = dashboardQuery.data?.topPendingHomeworks ?? [];
  const recentRows = dashboardQuery.data?.recentHomeworks ?? [];
  const subjectChartData =
    dashboardQuery.data?.reports.bySubject.slice(0, 6).map((row, index) => ({
      name: row.code ? `${row.label} (${row.code})` : row.label,
      value: row.total,
      fill: [
        "var(--app-accent-color)",
        "#0ea5e9",
        "#8b5cf6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
      ][index % 6],
    })) ?? [];
  const sectionChartData =
    dashboardQuery.data?.reports.bySection.slice(0, 6).map((row, index) => ({
      name: row.code ? `${row.label} (${row.code})` : row.label,
      value: row.pending + row.completed,
      fill: [
        "var(--app-accent-color)",
        "#0ea5e9",
        "#8b5cf6",
        "#10b981",
        "#f59e0b",
        "#ef4444",
      ][index % 6],
    })) ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[color:var(--app-accent-strong)]/30 bg-gradient-to-br from-[color:var(--app-accent-soft)]/45 via-background/95 to-background p-5 shadow-[0_22px_70px_-52px_rgba(15,23,42,0.58)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              <FileText className="h-3.5 w-3.5" />
              تقارير الواجبات
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">تقارير وتحليل الواجبات</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              ملخصات إدارية جاهزة عن الالتزام، التعثر، النشاط الأخير، والواجبات
              التي تحتاج متابعة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/app/homework-dashboard">
                <BarChart3 />
                لوحة التحكم
              </Link>
            </Button>
            <Button asChild>
              <Link href="/app/student-homeworks">
                <ClipboardCheck />
                سجلات الطلاب
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <WideMetricRow
        items={[
          {
            label: "تقرير الالتزام العام",
            value: dashboardQuery.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : `${metrics?.completionRate ?? 0}%`,
            helper: "نسبة إنجاز الطلاب للواجبات ضمن النطاق الحالي.",
            toneClassName: "border-cyan-500/15 bg-cyan-500/5",
          },
          {
            label: "تقرير التعثر",
            value: dashboardQuery.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : metrics?.pendingStudentRows ?? 0,
            helper: "عدد سجلات الطلاب التي لم تنفذ حتى الآن.",
            toneClassName: "border-rose-500/15 bg-rose-500/5",
          },
          {
            label: "تقرير النشاط",
            value: dashboardQuery.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : metrics?.totalHomeworks ?? 0,
            helper: "عدد الواجبات النشطة التي تدخل في المتابعة.",
            toneClassName: "border-emerald-500/15 bg-emerald-500/5",
          },
          {
            label: "تنبيهات جاهزة",
            value: dashboardQuery.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : pendingRows.length,
            helper: "الواجبات التي يمكن إرسال تنبيه لها مباشرة.",
            toneClassName: "border-amber-500/15 bg-amber-500/5",
          },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)] backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">أعمدة حسب المادة</h2>
                <p className="mt-1 text-sm text-muted-foreground">توزيع حجم الواجبات خلال التقرير الحالي.</p>
              </div>
              <BarChart3 className="h-5 w-5 text-[color:var(--app-accent-color)]" />
            </div>
            <ReportBarChart data={subjectChartData} className="mt-4" />
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)] backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">دائرة حسب الشعبة</h2>
                <p className="mt-1 text-sm text-muted-foreground">صورة سريعة للنطاقات الأوسع نشاطًا.</p>
              </div>
              <PieChart className="h-5 w-5 text-[color:var(--app-accent-color)]" />
            </div>
            <ReportPieChart data={sectionChartData} className="mt-4" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <GroupedReport
          title="تحليل حسب المادة"
          rows={dashboardQuery.data?.reports.bySubject ?? []}
          loading={dashboardQuery.isPending}
        />
        <GroupedReport
          title="تحليل حسب الشعبة"
          rows={dashboardQuery.data?.reports.bySection ?? []}
          loading={dashboardQuery.isPending}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]">
          <div className="border-b border-border/60 p-4">
            <h2 className="font-semibold">كشف الواجبات المتعثرة</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              مناسب للإدارة أو المرشد لمتابعة الطلاب غير المنجزين.
            </p>
          </div>
          <div className="divide-y">
            {dashboardQuery.isPending ? (
              <LoadingLine />
            ) : pendingRows.length === 0 ? (
              <EmptyLine text="لا توجد واجبات متعثرة حاليا." />
            ) : (
              pendingRows.map((item) => (
                <div
                  key={item.homeworkId}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatNameCodeLabel(item.subject.name, item.subject.code)} -{" "}
                      {formatSectionWithGradeLabel(item.section)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{item.pendingCount} لم ينفذ</Badge>
                    <Badge variant="outline">{formatDate(item.dueDate)}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        sendNotificationsMutation.mutate({
                          homeworkId: item.homeworkId,
                          markAsSent: false,
                        })
                      }
                      disabled={!canSendNotifications || sendNotificationsMutation.isPending}
                    >
                      <BellRing />
                      تنبيه
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)]">
          <div className="border-b border-border/60 p-4">
            <h2 className="font-semibold">كشف النشاط الأخير</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              أحدث واجبات منشأة مع عدد سجلات الطلاب المرتبطة.
            </p>
          </div>
          <div className="divide-y">
            {dashboardQuery.isPending ? (
              <LoadingLine />
            ) : recentRows.length === 0 ? (
              <EmptyLine text="لا توجد واجبات حديثة." />
            ) : (
              recentRows.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatNameCodeLabel(item.subject.name, item.subject.code)} -{" "}
                      {formatSectionWithGradeLabel(item.section)}
                    </div>
                  </div>
                  <Badge variant="outline">
                    <Users className="ml-1 h-3.5 w-3.5" />
                    {item._count.studentHomeworks} طالب
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function GroupedReport({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: Array<{
    id: string;
    label: string;
    code: string | null;
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
  }>;
  loading?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.32)] backdrop-blur-sm">
      <div className="border-b border-border/60 bg-background/60 p-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          إجمالي، منفذ، متعثر، ونسبة الإنجاز.
        </p>
      </div>
      <div className="divide-y">
        {loading ? (
          <LoadingLine />
        ) : rows.length === 0 ? (
          <EmptyLine text="لا توجد بيانات كافية لهذا التقرير." />
        ) : (
          rows.slice(0, 8).map((row) => (
            <div key={row.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    {row.label} {row.code ? `(${row.code})` : ""}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.completed} نفذ - {row.pending} لم ينفذ - {row.total} إجمالي
                  </div>
                </div>
                <Badge variant="outline">{row.completionRate}%</Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[color:var(--app-accent-color)]"
                  style={{ width: `${row.completionRate}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LoadingLine() {
  return (
    <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
      جاري تجهيز التقرير...
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
