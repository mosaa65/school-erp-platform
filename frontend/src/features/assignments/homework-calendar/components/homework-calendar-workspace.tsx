"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  Flame,
  RefreshCw,
  School,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { useHomeworkOptionsQuery } from "@/features/assignments/student-homeworks/hooks/use-homework-options-query";
import type { HomeworkListItem } from "@/lib/api/client";
import {
  formatNameCodeLabel,
  formatSectionWithGradeLabel,
} from "@/lib/option-labels";
import { cn } from "@/lib/utils";

type DensityTone = "quiet" | "normal" | "busy" | "heavy";

const DAY_COUNT = 14;

function toDateKey(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayTitle(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
  }).format(date);
}

function getWorkloadTone(count: number): DensityTone {
  if (count <= 0) {
    return "quiet";
  }

  if (count <= 2) {
    return "normal";
  }

  if (count <= 4) {
    return "busy";
  }

  return "heavy";
}

function getToneLabel(tone: DensityTone) {
  if (tone === "quiet") {
    return "هادئ";
  }

  if (tone === "normal") {
    return "مناسب";
  }

  if (tone === "busy") {
    return "مزدحم";
  }

  return "ضغط عالي";
}

function homeworkDateKey(homework: HomeworkListItem) {
  return toDateKey(homework.dueDate ?? homework.homeworkDate);
}

function homeworkMatchesSearch(homework: HomeworkListItem, search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    homework.title,
    homework.subject.name,
    homework.subject.code,
    homework.section.name,
    homework.section.code,
    homework.section.gradeLevel.name,
    homework.homeworkType.name,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function createDays() {
  const today = new Date();
  const days: string[] = [];

  for (let index = 0; index < DAY_COUNT; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    days.push(toLocalDateKey(date));
  }

  return days;
}

export function HomeworkCalendarWorkspace() {
  const [sectionId, setSectionId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [search, setSearch] = React.useState("");

  const homeworksQuery = useHomeworkOptionsQuery();
  const homeworks = React.useMemo(
    () => homeworksQuery.data ?? [],
    [homeworksQuery.data],
  );

  const sections = React.useMemo(() => {
    const map = new Map<string, HomeworkListItem["section"]>();
    homeworks.forEach((homework) => {
      map.set(homework.sectionId, homework.section);
    });
    return Array.from(map.values()).sort((left, right) =>
      formatSectionWithGradeLabel(left).localeCompare(
        formatSectionWithGradeLabel(right),
        "ar",
      ),
    );
  }, [homeworks]);

  const subjects = React.useMemo(() => {
    const map = new Map<string, HomeworkListItem["subject"]>();
    homeworks
      .filter((homework) => !sectionId || homework.sectionId === sectionId)
      .forEach((homework) => {
        map.set(homework.subjectId, homework.subject);
      });
    return Array.from(map.values()).sort((left, right) =>
      formatNameCodeLabel(left.name, left.code).localeCompare(
        formatNameCodeLabel(right.name, right.code),
        "ar",
      ),
    );
  }, [homeworks, sectionId]);

  const filteredHomeworks = React.useMemo(
    () =>
      homeworks.filter(
        (homework) =>
          (!sectionId || homework.sectionId === sectionId) &&
          (!subjectId || homework.subjectId === subjectId) &&
          homeworkMatchesSearch(homework, search),
      ),
    [homeworks, search, sectionId, subjectId],
  );

  const days = React.useMemo(createDays, []);
  const byDay = React.useMemo(() => {
    const map = new Map<string, HomeworkListItem[]>();
    days.forEach((day) => map.set(day, []));

    filteredHomeworks.forEach((homework) => {
      const key = homeworkDateKey(homework);
      const list = map.get(key);
      if (list) {
        list.push(homework);
      }
    });

    map.forEach((list) => {
      list.sort((left, right) => left.title.localeCompare(right.title, "ar"));
    });

    return map;
  }, [days, filteredHomeworks]);

  const overloadedDays = React.useMemo(
    () =>
      days
        .map((day) => ({
          day,
          count: byDay.get(day)?.length ?? 0,
        }))
        .filter((item) => item.count >= 3),
    [byDay, days],
  );

  const upcoming = React.useMemo(
    () =>
      filteredHomeworks
        .filter((homework) => {
          const key = homeworkDateKey(homework);
          return days.includes(key);
        })
        .sort((left, right) =>
          homeworkDateKey(left).localeCompare(homeworkDateKey(right)),
        )
        .slice(0, 8),
    [days, filteredHomeworks],
  );

  const totalStudentRows = React.useMemo(
    () =>
      filteredHomeworks.reduce(
        (total, homework) => total + homework._count.studentHomeworks,
        0,
      ),
    [filteredHomeworks],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-[color:var(--app-accent-strong)]/25 bg-gradient-to-br from-[color:var(--app-accent-soft)]/35 via-background/95 to-background p-5 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              <CalendarDays className="h-3.5 w-3.5" />
              تقويم وحمل الواجبات
            </div>
            <h1 className="text-2xl font-semibold">تقويم الواجبات</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/app/homework-studio">
                <Sparkles />
                إنشاء واجب
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/homework-submissions">
                <ClipboardCheck />
                التسليمات
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void homeworksQuery.refetch()}
              disabled={homeworksQuery.isFetching}
            >
              <RefreshCw className={cn(homeworksQuery.isFetching && "animate-spin")} />
              تحديث
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="واجبات النطاق" value={filteredHomeworks.length} icon={<ClipboardCheck />} />
        <MetricCard label="سجلات الطلاب" value={totalStudentRows} icon={<UsersRound />} />
        <MetricCard label="أيام مزدحمة" value={overloadedDays.length} icon={<Flame />} danger />
        <MetricCard label="الأيام المعروضة" value={DAY_COUNT} icon={<CalendarDays />} />
      </section>

      <section className="overflow-hidden rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]">
        <div className="grid gap-3 p-4 lg:grid-cols-[1fr_220px_220px]">
          <Input
            icon={<Search />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث في الواجبات أو المواد أو الشعب"
          />
          <SelectField
            icon={<School />}
            value={sectionId}
            onChange={(event) => {
              setSectionId(event.target.value);
              setSubjectId("");
            }}
          >
            <option value="">كل الشعب</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {formatSectionWithGradeLabel(section)}
              </option>
            ))}
          </SelectField>
          <SelectField
            icon={<BookOpenCheck />}
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            <option value="">كل المواد</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {formatNameCodeLabel(subject.name, subject.code)}
              </option>
            ))}
          </SelectField>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-background/60 p-4">
            <h2 className="font-semibold">الأيام القادمة</h2>
            <Badge variant="outline">{DAY_COUNT} يوم</Badge>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {homeworksQuery.isPending ? (
              <LoadingBlock text="جاري تحميل التقويم..." />
            ) : (
              days.map((day) => {
                const items = byDay.get(day) ?? [];
                const tone = getWorkloadTone(items.length);

                return (
                  <DayColumn
                    key={day}
                    day={day}
                    tone={tone}
                    homeworks={items}
                  />
                );
              })
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)] backdrop-blur-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">تنبيهات الحمل</h2>
                <Badge variant="outline">{overloadedDays.length}</Badge>
              </div>
              {overloadedDays.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/15 p-4 text-sm text-muted-foreground">
                  لا يوجد ضغط واضح في الأيام القادمة.
                </div>
              ) : (
                <div className="grid gap-2">
                  {overloadedDays.map((item) => (
                    <div
                      key={item.day}
                      className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{formatDayTitle(item.day)}</span>
                        <Badge variant="outline">{item.count} واجبات</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-border/60 bg-card/80 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)] backdrop-blur-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">أقرب الواجبات</h2>
                <Badge variant="outline">{upcoming.length}</Badge>
              </div>
              <div className="grid gap-2">
                {upcoming.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/15 p-4 text-sm text-muted-foreground">
                    لا توجد واجبات قريبة في النطاق الحالي.
                  </div>
                ) : (
                  upcoming.map((homework) => (
                    <Link
                      key={homework.id}
                      href="/app/homework-submissions"
                    className="rounded-xl border bg-background p-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/35"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 font-medium">{homework.title}</span>
                        <ArrowLeft className="mt-1 h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {formatDate(homework.dueDate ?? homework.homeworkDate)}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border bg-background/80 p-4 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)]",
        danger && "border-amber-500/25 bg-amber-500/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="rounded-md border bg-background p-2 text-[color:var(--app-accent-color)] [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function DayColumn({
  day,
  tone,
  homeworks,
}: {
  day: string;
  tone: DensityTone;
  homeworks: HomeworkListItem[];
}) {
  return (
    <div
      className={cn(
        "min-h-52 rounded-[22px] border p-3",
        tone === "quiet" && "bg-muted/10",
        tone === "normal" && "border-emerald-500/20 bg-emerald-500/5",
        tone === "busy" && "border-amber-500/25 bg-amber-500/10",
        tone === "heavy" && "border-rose-500/25 bg-rose-500/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{formatDayTitle(day)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {getToneLabel(tone)}
          </div>
        </div>
        <Badge variant="outline">{homeworks.length}</Badge>
      </div>

      <div className="mt-3 grid gap-2">
        {homeworks.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-background/60 p-3 text-sm text-muted-foreground">
            لا توجد واجبات.
          </div>
        ) : (
          homeworks.map((homework) => (
            <div key={homework.id} className="rounded-xl border bg-background p-3">
              <div className="line-clamp-2 text-sm font-medium">{homework.title}</div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                <Badge variant="outline">
                  {formatNameCodeLabel(homework.subject.name, homework.subject.code)}
                </Badge>
                <Badge variant="outline">{homework._count.studentHomeworks} طالب</Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LoadingBlock({ text }: { text: string }) {
  return (
    <div className="md:col-span-2 2xl:col-span-3 flex min-h-48 items-center justify-center rounded-xl border border-dashed bg-muted/15 p-4 text-sm text-muted-foreground">
      <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}
