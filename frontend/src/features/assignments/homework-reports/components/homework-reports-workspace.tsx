"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  BellRing,
  BookOpenCheck,
  ClipboardCheck,
  FileText,
  Loader2,
  PieChart,
  TrendingDown,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="space-y-5">
      <section className="rounded-lg border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              <FileText className="h-3.5 w-3.5" />
              تقارير الواجبات
            </div>
            <h1 className="text-2xl font-bold tracking-normal">تقارير وتحليل الواجبات</h1>
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

      <section className="grid gap-3 md:grid-cols-3">
        <ReportCard
          title="تقرير الالتزام العام"
          description="نسبة إنجاز الطلاب للواجبات ضمن النطاق الحالي."
          value={`${metrics?.completionRate ?? 0}%`}
          icon={<PieChart />}
          loading={dashboardQuery.isPending}
        />
        <ReportCard
          title="تقرير التعثر"
          description="عدد سجلات الطلاب التي لم تنفذ حتى الآن."
          value={metrics?.pendingStudentRows ?? 0}
          icon={<TrendingDown />}
          loading={dashboardQuery.isPending}
        />
        <ReportCard
          title="تقرير النشاط"
          description="عدد الواجبات النشطة التي تدخل في المتابعة."
          value={metrics?.totalHomeworks ?? 0}
          icon={<BookOpenCheck />}
          loading={dashboardQuery.isPending}
        />
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
        <div className="rounded-lg border bg-background">
          <div className="border-b p-4">
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

        <div className="rounded-lg border bg-background">
          <div className="border-b p-4">
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
    <div className="rounded-lg border bg-background">
      <div className="border-b p-4">
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

function ReportCard({
  title,
  description,
  value,
  icon,
  loading,
}: {
  title: string;
  description: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          <span className="rounded-md border bg-background p-2 text-[color:var(--app-accent-color)] [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        </div>
        <div className="text-3xl font-bold">
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : value}
        </div>
      </CardContent>
    </Card>
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
    <div className="m-4 rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
