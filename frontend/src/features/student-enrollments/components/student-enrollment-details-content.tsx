"use client";

import * as React from "react";
import { CalendarDays, FileText, GraduationCap, Hash, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntitySurfaceQuickActions } from "@/presentation/entity-surface/entity-surface-quick-actions";
import type { EntitySurfaceQuickAction } from "@/presentation/entity-surface/entity-surface-types";
import type { StudentEnrollmentListItem } from "@/lib/api/client";
import {
  formatEnrollmentDateLabel,
  getStudentEnrollmentDistributionLabel,
  getStudentEnrollmentPlacementShortLabel,
} from "@/features/student-enrollments/presentation/student-enrollment-surface-definition";
import { translateStudentEnrollmentStatus } from "@/lib/i18n/ar";

type StudentEnrollmentDetailsContentProps = {
  enrollment: StudentEnrollmentListItem;
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

export function StudentEnrollmentDetailsContent({
  enrollment,
  quickActions,
  className,
}: StudentEnrollmentDetailsContentProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.35rem] border border-white/65 bg-background/84 px-4 py-3 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-medium text-muted-foreground">رقم القيد السنوي</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {enrollment.yearlyEnrollmentNo ?? "سيولد تلقائيًا"}
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-white/65 bg-background/84 px-4 py-3 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-medium text-muted-foreground">تاريخ القيد</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatEnrollmentDateLabel(enrollment.enrollmentDate)}
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-white/65 bg-background/84 px-4 py-3 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-[11px] font-medium text-muted-foreground">حالة التوزيع</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {getStudentEnrollmentDistributionLabel(enrollment.distributionStatus)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <DetailSection title="بيانات الطالب" icon={<GraduationCap className="h-4 w-4" />}>
          <DetailItem label="الاسم" value={enrollment.student.fullName} />
          <DetailItem label="رقم الطالب" value={enrollment.student.admissionNo ?? "غير متوفر"} />
          <DetailItem label="الحالة التشغيلية" value={enrollment.student.isActive ? "نشط" : "غير نشط"} />
        </DetailSection>

        <DetailSection title="الوضع الأكاديمي" icon={<Layers3 className="h-4 w-4" />}>
          <DetailItem label="السنة الأكاديمية" value={`${enrollment.academicYear.name} (${enrollment.academicYear.code})`} />
          <DetailItem label="التموضع" value={getStudentEnrollmentPlacementShortLabel(enrollment)} />
          <DetailItem label="حالة القيد" value={translateStudentEnrollmentStatus(enrollment.status)} />
        </DetailSection>

        <DetailSection title="ملخص السجل" icon={<Hash className="h-4 w-4" />}>
          <DetailItem label="رقم القيد السنوي" value={enrollment.yearlyEnrollmentNo ?? "غير محدد"} />
          <DetailItem label="الحالة" value={enrollment.isActive ? "نشط" : "غير نشط"} />
          <DetailItem label="حالة التوزيع" value={getStudentEnrollmentDistributionLabel(enrollment.distributionStatus)} />
        </DetailSection>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <DetailSection title="الملاحظات والتواريخ" icon={<FileText className="h-4 w-4" />}>
          <DetailItem label="الملاحظات" value={enrollment.notes?.trim() || "لا توجد ملاحظات"} />
          <DetailItem label="تاريخ الإنشاء" value={new Date(enrollment.createdAt).toLocaleDateString()} />
          <DetailItem label="آخر تحديث" value={new Date(enrollment.updatedAt).toLocaleDateString()} />
        </DetailSection>

        <DetailSection title="السجل الإداري" icon={<CalendarDays className="h-4 w-4" />}>
          <DetailItem label="أنشئ بواسطة" value={enrollment.createdBy?.email ?? "غير معروف"} />
          <DetailItem label="آخر تحديث بواسطة" value={enrollment.updatedBy?.email ?? "غير معروف"} />
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
