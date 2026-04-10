"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { StudentPickerSheet } from "@/components/ui/student-picker-sheet";
import { useHealthSummaryQuery } from "@/features/health-visits/hooks/use-health-summary-query";
import { useHealthVisitsQuery } from "@/features/health-visits/hooks/use-health-visits-query";
import { useHealthStatusOptionsQuery } from "@/features/students/hooks/use-health-status-options-query";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import type { StudentPickerOption } from "@/features/students/lib/student-picker";
import { apiClient } from "@/lib/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function formatVisitDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function HealthVisitsWorkspace() {
  const summaryQuery = useHealthSummaryQuery();
  const visitsQuery = useHealthVisitsQuery({ limit: 6 });

  const summary = summaryQuery.data;
  const visits = visitsQuery.data?.data ?? [];

  const healthStatusQuery = useHealthStatusOptionsQuery();
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("health-visits.create");
  const queryClient = useQueryClient();

  const [formState, setFormState] = React.useState({
    studentId: "",
    healthStatusId: "",
    visitDate: new Date().toISOString().slice(0, 16),
    notes: "",
    followUpRequired: false,
    followUpNotes: "",
  });
  const [formMessage, setFormMessage] = React.useState<string | null>(null);
  const [selectedStudentOption, setSelectedStudentOption] =
    React.useState<StudentPickerOption | null>(null);

  const createVisitMutation = useMutation({
    mutationFn: (payload: Parameters<typeof apiClient.createHealthVisit>[0]) =>
      apiClient.createHealthVisit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-visits"] });
      setFormState((prev) => ({
        ...prev,
        studentId: "",
        healthStatusId: "",
        notes: "",
        followUpRequired: false,
        followUpNotes: "",
        visitDate: new Date().toISOString().slice(0, 16),
      }));
      setSelectedStudentOption(null);
      setFormMessage("تم تسجيل الزيارة بنجاح.");
    },
    onError: () => {
      setFormMessage("حدث خطأ عند حفظ الزيارة، حاول مرة ثانية.");
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.studentId || !formState.healthStatusId || !formState.visitDate) {
      setFormMessage("يجب اختيار الطالب والحالة وتحديد تاريخ الزيارة.");
      return;
    }

    setFormMessage(null);

    createVisitMutation.mutate({
      studentId: formState.studentId,
      healthStatusId: Number(formState.healthStatusId),
      visitDate: new Date(formState.visitDate).toISOString(),
      notes: formState.notes || undefined,
      followUpRequired: formState.followUpRequired,
      followUpNotes: formState.followUpNotes || undefined,
    });
  };

  return (
    <section className="space-y-6">
      {canCreate ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-border/60 bg-background/60 p-4 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex flex-col text-sm font-medium text-muted-foreground">
              الطالب
              <StudentPickerSheet
                scope="health-visits"
                variant="form"
                value={formState.studentId}
                selectedOption={selectedStudentOption}
                onSelect={(option) => {
                  setSelectedStudentOption(option);
                  setFormState((prev) => ({ ...prev, studentId: option?.id ?? "" }));
                }}
              />
            </label>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">الحالة الصحية</label>
              <SelectField
                value={formState.healthStatusId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, healthStatusId: event.target.value }))
                }
              >
                <option value="">اختر الحالة</option>
                {healthStatusQuery.isLoading ? (
                  <option disabled>جارٍ التحميل...</option>
                ) : (
                  healthStatusQuery.data?.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.nameAr} ({status.code})
                    </option>
                  ))
                )}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">تاريخ الزيارة</label>
              <Input
                type="datetime-local"
                value={formState.visitDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, visitDate: event.target.value }))
                }
              />
            </div>
            <label className="flex items-center gap-3 text-xs font-bold text-muted-foreground uppercase px-1">
              <span>متابعة مطلوبة</span>
              <Switch
                checked={formState.followUpRequired}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, followUpRequired: checked }))
                }
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">ملاحظات</label>
              <textarea
                rows={3}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                className="min-h-[90px] rounded-md border border-input bg-card px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase px-1">ملاحظات المتابعة</label>
              <textarea
                rows={3}
                value={formState.followUpNotes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, followUpNotes: event.target.value }))
                }
                className="min-h-[90px] rounded-md border border-input bg-card px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {formMessage && (
              <p className="text-sm font-semibold text-foreground">{formMessage}</p>
            )}
            <Button type="submit" disabled={createVisitMutation.isPending}>
              {createVisitMutation.isPending ? "جاري الحفظ..." : "سجّل الزيارة"}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">إجمالي الزيارات</CardTitle>
            <CardDescription>عدد الزيارات المسجلة</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary ? summary.totalVisits : "-"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">عدد الطلاب المراقبين</CardTitle>
            <CardDescription>طلاب تلقوا زيارة صحية</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {summary ? summary.uniqueStudents : "-"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">آخر زيارة</CardTitle>
            <CardDescription>
              أحدث سجل مع التاريخ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            {summary?.latestVisit ? (
              <>
                <p className="font-semibold">
                  {summary.latestVisit.student.fullName}
                </p>
                <p>{formatVisitDate(summary.latestVisit.visitDate)}</p>
              </>
            ) : (
              <p>لا توجد زيارات مسجلة بعد.</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">آخر تحديث</CardTitle>
            <CardDescription>توقيت تحديث البيانات</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary?.lastUpdatedAt
                ? formatVisitDate(summary.lastUpdatedAt)
                : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summary?.statusBreakdown.map((status) => (
          <Card
            key={status.id}
            className="border-border/70 bg-card/70 backdrop-blur-sm"
          >
            <CardHeader>
              <CardTitle className="text-sm">{status.nameAr}</CardTitle>
              <CardDescription className="text-muted-foreground">
                عدد الزيارات: {status.count}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">{status.code}</Badge>
              {status.requiresDetails ? (
                <Badge className="me-2" variant="secondary">
                  يحتاج تفاصيل
                </Badge>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">آخر الزيارات</CardTitle>
          <CardDescription>
            نظرة سريعة على السجلات الأخيرة للزيارات الصحية
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visitsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              جارية تحميل السجلات...
            </p>
          ) : visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا يوجد زيارات لعرضها حالياً.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-5 gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <span>التاريخ</span>
                <span>الطالب</span>
                <span>الحالة</span>
                <span>الموظف</span>
                <span>الملاحظات</span>
              </div>
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className="grid grid-cols-5 gap-2 border-t px-4 py-3 text-sm text-muted-foreground"
                >
                  <div className="text-foreground">
                    {formatVisitDate(visit.visitDate)}
                  </div>
                  <div className="text-foreground">
                    {visit.student.fullName}
                    <p className="text-xs text-muted-foreground">
                      {visit.student.admissionNo ?? "-"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {visit.healthStatus ? (
                      <Badge variant="outline">
                        {visit.healthStatus.nameAr}
                      </Badge>
                    ) : (
                      <Badge variant="outline">غير محدد</Badge>
                    )}
                    {visit.followUpRequired ? (
                      <Badge variant="secondary">متابعة</Badge>
                    ) : null}
                  </div>
                  <div className="text-foreground">
                    {visit.nurse?.fullName ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {visit.notes ?? visit.followUpNotes ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

