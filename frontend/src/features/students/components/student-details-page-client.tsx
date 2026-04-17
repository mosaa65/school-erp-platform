"use client";

import * as React from "react";
import { ArrowLeft, LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudentDetailsContent } from "@/features/students/components/student-details-content";
import { useStudentQuery } from "@/features/students/hooks/use-student-query";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  STUDENT_QUICK_ACTION_PERMISSION_CODES,
  STUDENT_SENSITIVE_PERMISSION_CODES,
  getStudentStatusChips,
} from "@/features/students/presentation/student-surface-definition";

type StudentDetailsPageClientProps = {
  studentId: string;
};

export function StudentDetailsPageClient({ studentId }: StudentDetailsPageClientProps) {
  const router = useRouter();
  const { hasAnyPermission } = useRbac();
  const studentQuery = useStudentQuery(studentId);
  const canReadSensitive = hasAnyPermission([...STUDENT_SENSITIVE_PERMISSION_CODES]);
  const canUseQuickActions = hasAnyPermission([...STUDENT_QUICK_ACTION_PERMISSION_CODES]);

  if (studentQuery.isPending) {
    return (
      <div className="rounded-3xl border border-dashed border-border/70 bg-card/70 p-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          جارٍ تحميل ملف الطالب...
        </div>
      </div>
    );
  }

  if (studentQuery.error || !studentQuery.data) {
    return (
      <div className="space-y-4 rounded-3xl border border-destructive/25 bg-destructive/5 p-6">
        <p className="text-sm font-medium text-destructive">
          {studentQuery.error instanceof Error ? studentQuery.error.message : "تعذر تحميل تفاصيل الطالب."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/app/students")}>
            <ArrowLeft className="h-4 w-4" />
            العودة لقائمة الطلاب
          </Button>
          <Button type="button" onClick={() => void studentQuery.refetch()}>
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  const student = studentQuery.data;
  const statusChips = getStudentStatusChips(student);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.8rem] border border-white/65 bg-card/80 p-5 shadow-[0_26px_80px_-42px_rgba(15,23,42,0.32)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            ملف طالب
          </Badge>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{student.fullName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {student.admissionNo ?? "بدون رقم"} • {statusChips.map((item) => item.label).join(" • ")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/app/students")}>
            <ArrowLeft className="h-4 w-4" />
            العودة
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void studentQuery.refetch()}
            disabled={studentQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${studentQuery.isFetching ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      <StudentDetailsContent
        student={student}
        canReadSensitive={canReadSensitive}
        quickActions={canUseQuickActions ? [] : undefined}
      />
    </div>
  );
}
