"use client";

import * as React from "react";
import {
  CalendarDays,
  Droplets,
  GraduationCap,
  HeartPulse,
  MapPin,
  ShieldAlert,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EntitySurfaceQuickActions } from "@/presentation/entity-surface/entity-surface-quick-actions";
import type { EntitySurfaceQuickAction } from "@/presentation/entity-surface/entity-surface-types";
import type { StudentListItem } from "@/lib/api/client";
import {
  getStudentAdmissionLabel,
  getStudentBirthDateLabel,
  getStudentGenderLabel,
  getStudentHealthLabel,
  getStudentLocalityLabel,
  getStudentOrphanLabel,
  getStudentPlacementLongLabel,
  getStudentPlacementShortLabel,
} from "@/features/students/presentation/student-surface-definition";

type StudentDetailsContentProps = {
  student: StudentListItem;
  canReadSensitive?: boolean;
  quickActions?: EntitySurfaceQuickAction[];
  className?: string;
};

type DetailItemProps = {
  label: string;
  value: React.ReactNode;
};

type DetailSectionProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="rounded-2xl border border-white/60 bg-background/80 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-foreground">{value}</p>
    </div>
  );
}

function DetailSection({ title, icon, children }: DetailSectionProps) {
  return (
    <section className="rounded-[1.4rem] border border-white/65 bg-background/80 p-4 shadow-[0_18px_60px_-34px_rgba(15,23,42,0.32)] dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-[color:var(--app-accent-color)] dark:border-white/10 dark:bg-white/[0.06]">
          {icon}
        </span>
        <span>{title}</span>
      </div>
      <div className="mt-3 grid gap-2.5">{children}</div>
    </section>
  );
}

export function StudentDetailsContent({
  student,
  canReadSensitive = false,
  quickActions,
  className,
}: StudentDetailsContentProps) {
  const healthNotesLabel =
    canReadSensitive
      ? student.healthNotes?.trim() || "لا توجد ملاحظات صحية."
      : "مخفية حسب الصلاحيات.";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.35rem] border border-white/65 bg-background/84 px-4 py-3 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-medium text-muted-foreground">القيد الحالي</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{getStudentPlacementShortLabel(student)}</p>
        </div>
        <div className="rounded-[1.35rem] border border-white/65 bg-background/84 px-4 py-3 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-medium text-muted-foreground">أولياء الأمور</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{student.guardians.length}</p>
        </div>
        <div className="rounded-[1.35rem] border border-white/65 bg-background/84 px-4 py-3 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-medium text-muted-foreground">المحلة</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{getStudentLocalityLabel(student)}</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <DetailSection title="الملف الأساسي" icon={<GraduationCap className="h-4 w-4" />}>
          <DetailItem label="رقم الطالب" value={getStudentAdmissionLabel(student)} />
          <DetailItem label="الاسم الكامل" value={student.fullName} />
          <DetailItem label="النوع الاجتماعي" value={getStudentGenderLabel(student)} />
          <DetailItem label="تاريخ الميلاد" value={getStudentBirthDateLabel(student)} />
        </DetailSection>

        <DetailSection title="الوضع الدراسي" icon={<Users className="h-4 w-4" />}>
          <DetailItem label="آخر قيد" value={getStudentPlacementLongLabel(student)} />
          <DetailItem label="عدد القيود" value={student.enrollments.length} />
          <DetailItem label="الحالة التشغيلية" value={student.isActive ? "نشط" : "غير نشط"} />
          <DetailItem label="المحلة" value={getStudentLocalityLabel(student)} />
        </DetailSection>

        <DetailSection title="الرعاية والصحة" icon={<HeartPulse className="h-4 w-4" />}>
          <DetailItem
            label="الحالة الصحية"
            value={
              <span className="inline-flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-[color:var(--app-accent-color)]" />
                <span>{getStudentHealthLabel(student)}</span>
              </span>
            }
          />
          <DetailItem
            label="حالة اليتم"
            value={
              <span className="inline-flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-[color:var(--app-accent-color)]" />
                <span>{getStudentOrphanLabel(student)}</span>
              </span>
            }
          />
          <DetailItem
            label="فصيلة الدم"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-[color:var(--app-accent-color)]" />
                <span>{student.bloodType?.name ?? "غير محدد"}</span>
              </span>
            }
          />
          <DetailItem label="الملاحظات الصحية" value={healthNotesLabel} />
        </DetailSection>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <DetailSection title="تواصل الرعاية" icon={<MapPin className="h-4 w-4" />}>
          <DetailItem
            label="الولي الأساسي"
            value={student.guardians.find((item) => item.isPrimary)?.guardian.fullName ?? "غير محدد"}
          />
          <DetailItem
            label="رقم التواصل"
            value={
              student.guardians.find((item) => item.isPrimary)?.guardian.phonePrimary ??
              student.guardians[0]?.guardian.phonePrimary ??
              "غير متوفر"
            }
          />
          <DetailItem
            label="واتساب"
            value={
              student.guardians.find((item) => item.isPrimary)?.guardian.whatsappNumber ??
              student.guardians[0]?.guardian.whatsappNumber ??
              "غير متوفر"
            }
          />
        </DetailSection>

        <DetailSection title="ملخص سريع" icon={<CalendarDays className="h-4 w-4" />}>
          <DetailItem label="تاريخ الإنشاء" value={new Date(student.createdAt).toLocaleDateString()} />
          <DetailItem label="آخر تحديث" value={new Date(student.updatedAt).toLocaleDateString()} />
          <DetailItem
            label="آخر تحديث بواسطة"
            value={canReadSensitive ? student.updatedBy?.email ?? "غير معروف" : "مخفية حسب الصلاحيات."}
          />
        </DetailSection>
      </div>

      {quickActions && quickActions.length > 0 ? (
        <section className="rounded-[1.4rem] border border-white/65 bg-background/80 p-4 shadow-[0_18px_60px_-34px_rgba(15,23,42,0.32)] dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm font-semibold text-foreground">اختصارات سريعة</p>
          <EntitySurfaceQuickActions actions={quickActions} className="mt-3" />
        </section>
      ) : null}
    </div>
  );
}
