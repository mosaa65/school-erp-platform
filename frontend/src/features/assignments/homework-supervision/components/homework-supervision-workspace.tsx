"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BellRing,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  RefreshCw,
  School,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useHomeworksDashboardQuery } from "@/features/assignments/homework-dashboard/hooks/use-homeworks-dashboard-query";
import { useSendHomeworkLateNotificationsMutation } from "@/features/assignments/homeworks/hooks/use-homeworks-mutations";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { cn } from "@/lib/utils";

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function HomeworkSupervisionWorkspace() {
  const { hasPermission } = useRbac();
  const canSendNotifications = hasPermission("homework-notifications.send");
  const dashboardQuery = useHomeworksDashboardQuery();
  const sendNotificationsMutation = useSendHomeworkLateNotificationsMutation();
  const metrics = dashboardQuery.data?.metrics;
  const pendingHomeworks = dashboardQuery.data?.topPendingHomeworks ?? [];
  const recentHomeworks = dashboardQuery.data?.recentHomeworks ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[color:var(--app-accent-strong)]/25 bg-gradient-to-br from-[color:var(--app-accent-soft)]/35 via-background/95 to-background p-5 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <School className="h-3.5 w-3.5" />
              إشراف الإدارة
            </div>
            <h1 className="text-2xl font-bold tracking-normal">إشراف الواجبات</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              مساحة سريعة لمتابعة التعثرات، الواجبات المتأخرة، وحركة إنشاء الواجبات
              دون الدخول في تفاصيل كل صفحة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void dashboardQuery.refetch()}
              disabled={dashboardQuery.isFetching}
            >
              <RefreshCw className={cn(dashboardQuery.isFetching && "animate-spin")} />
              تحديث
            </Button>
            <Button asChild>
              <Link href="/app/homework-dashboard">
                <BarChart3 />
                لوحة التحكم
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <SupervisionMetric
          label="واجبات متأخرة"
          value={metrics?.overdueHomeworks ?? 0}
          icon={<AlertTriangle />}
          danger
          loading={dashboardQuery.isPending}
        />
        <SupervisionMetric
          label="طلاب لم ينفذوا"
          value={metrics?.pendingStudentRows ?? 0}
          icon={<Users />}
          loading={dashboardQuery.isPending}
        />
        <SupervisionMetric
          label="نسبة الإنجاز"
          value={`${metrics?.completionRate ?? 0}%`}
          icon={<ClipboardCheck />}
          loading={dashboardQuery.isPending}
        />
        <SupervisionMetric
          label="إجمالي الواجبات"
          value={metrics?.totalHomeworks ?? 0}
          icon={<ClipboardList />}
          loading={dashboardQuery.isPending}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/60 p-4">
            <div>
              <h2 className="font-semibold">قائمة التعثر العاجلة</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                واجبات فيها أكبر عدد من الطلاب الذين لم ينفذوا.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/homework-entry">
                فتح الرصد
                <ArrowLeft />
              </Link>
            </Button>
          </div>
          <div className="divide-y">
            {dashboardQuery.isPending ? (
              <LoadingBlock />
            ) : pendingHomeworks.length === 0 ? (
              <EmptyBlock text="لا توجد تعثرات واضحة الآن." />
            ) : (
              pendingHomeworks.map((item) => (
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
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{item.pendingCount} طالب</Badge>
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
                    <Button asChild size="sm" variant="outline">
                      <Link href="/app/homework-entry">معالجة</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)] backdrop-blur-sm">
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-semibold">إجراءات إشرافية مقترحة</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                خطوات سريعة للإدارة أو المشرف الأكاديمي.
              </p>
            </div>
            <ActionLink
              href="/app/homework-entry"
              title="متابعة الرصد اليومي"
              description="افتح شاشة الإدخال السريع لمعالجة الواجبات المتعثرة."
              icon={<ClipboardCheck />}
            />
            <ActionLink
              href="/app/homeworks"
              title="مراجعة إنشاء الواجبات"
              description="راجع الواجبات الأخيرة وتأكد من ربطها بالشعب والمواد."
              icon={<ClipboardList />}
            />
            <ActionLink
              href="/app/student-homeworks"
              title="تفاصيل سجلات الطلاب"
              description="ابحث في سجلات الطلاب حسب الطالب أو الواجب أو المادة."
              icon={<Users />}
            />
          </CardContent>
        </Card>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]">
        <div className="border-b border-border/60 bg-background/60 p-4">
          <h2 className="font-semibold">آخر نشاط واجبات</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            يساعدك على معرفة حركة المعلمين والمواد مؤخرا.
          </p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboardQuery.isPending ? (
            <LoadingCards />
          ) : recentHomeworks.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyBlock text="لا يوجد نشاط حديث." />
            </div>
          ) : (
            recentHomeworks.map((homework) => (
              <div key={homework.id} className="rounded-xl border bg-muted/15 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{homework.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatNameCodeLabel(homework.subject.name, homework.subject.code)}
                    </div>
                  </div>
                  <Badge variant="outline">{homework._count.studentHomeworks} طالب</Badge>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {formatSectionWithGradeLabel(homework.section)} - {formatDate(homework.homeworkDate)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function SupervisionMetric({
  label,
  value,
  icon,
  danger,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border bg-background/80 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]",
        danger && "border-rose-500/25 bg-rose-500/5",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="rounded-md border bg-background p-2 text-[color:var(--app-accent-color)] [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
      </div>
    </div>
  );
}

function ActionLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border bg-muted/15 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/30"
    >
      <span className="rounded-md border bg-background p-2 text-[color:var(--app-accent-color)] [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  );
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
      جاري تحميل بيانات الإشراف...
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="m-4 rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function LoadingCards() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-xl border bg-muted/30" />
      ))}
    </>
  );
}
