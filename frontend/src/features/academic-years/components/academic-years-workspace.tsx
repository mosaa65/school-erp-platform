"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CalendarDays,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  Star,
  Activity,
  CheckCircle2,
  History,
  Lock,
  Clock,
  Settings2,
  Info,
  CalendarCheck,
  Layout,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Fab } from "@/components/ui/fab";
import { PageShell } from "@/components/ui/page-shell";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateAcademicYearMutation,
  useDeleteAcademicYearMutation,
  useUpdateAcademicYearMutation,
} from "@/features/academic-years/hooks/use-academic-years-mutations";
import { useAcademicYearsQuery } from "@/features/academic-years/hooks/use-academic-years-query";
import type { AcademicYearListItem, AcademicYearStatus } from "@/lib/api/client";

type FormState = {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  isCurrent: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM: FormState = {
  code: "",
  name: "",
  startDate: "",
  endDate: "",
  status: "PLANNED",
  isCurrent: false,
};

function formatDateInput(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toUtcStartIso(dateInput: string): string { return `${dateInput}T00:00:00.000Z`; }
function toUtcEndIso(dateInput: string): string { return `${dateInput}T23:59:59.999Z`; }

function toFormState(year: AcademicYearListItem): FormState {
  return {
    code: year.code,
    name: year.name,
    startDate: formatDateInput(year.startDate),
    endDate: formatDateInput(year.endDate),
    status: year.status,
    isCurrent: year.isCurrent,
  };
}

function statusLabel(status: AcademicYearStatus): string {
  switch (status) {
    case "PLANNED": return "مخططة";
    case "ACTIVE": return "نشطة";
    case "CLOSED": return "مغلقة";
    case "ARCHIVED": return "مؤرشفة";
    default: return status;
  }
}

export function AcademicYearsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("academic-years.create");
  const canUpdate = hasPermission("academic-years.update");
  const canDelete = hasPermission("academic-years.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AcademicYearStatus | "all">("all");
  const [filterDraft, setFilterDraft] = React.useState({ status: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState<string | null>(null);

  const yearsQuery = useAcademicYearsQuery({
    page, limit: PAGE_SIZE, search,
    status: statusFilter === "all" ? undefined : statusFilter as any,
  });

  const createMutation = useCreateAcademicYearMutation();
  const updateMutation = useUpdateAcademicYearMutation();
  const deleteMutation = useDeleteAcademicYearMutation();

  const records = React.useMemo(() => yearsQuery.data?.data ?? [], [yearsQuery.data?.data]);
  const pagination = yearsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ status: statusFilter });
  }, [isFilterOpen, statusFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: AcademicYearListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) {
      setFormError("الرجاء إكمال كافة الحقول الأساسية.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      startDate: toUtcStartIso(form.startDate),
      endDate: toUtcEndIso(form.endDate),
      status: form.status,
      isCurrent: form.isCurrent,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ academicYearId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: AcademicYearListItem) => {
    if (!canDelete || !window.confirm(`حذف السنة الأكاديمية ${item.name}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setStatusFilter(filterDraft.status);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setFilterDraft({ status: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, statusFilter !== "all" ? 1 : 0].reduce((acc, v) => acc + v, 0);
  }, [searchInput, statusFilter]);

  return (
    <PageShell
      title="السنوات الأكاديمية"
      subtitle="تحديد الفترات الزمنية للعام الدراسي المعتمد، إدارة حالات الأرشفة، وتعيين السنة الحالية للنظام."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم السنة أو الرمز..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void yearsQuery.refetch()} disabled={yearsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${yearsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفلترة"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الحالة التشغيلية</label>
            <SelectField value={filterDraft.status} onChange={(e) => setFilterDraft({ status: e.target.value as any })}>
              <option value="all">كل الحالات الأكاديمية</option>
              <option value="PLANNED">مخططة</option>
              <option value="ACTIVE">نشطة</option>
              <option value="CLOSED">مغلقة</option>
              <option value="ARCHIVED">مؤرشفة</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <CalendarCheck className="h-5 w-5 text-primary" />
                سجل الدورات التعليمية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {yearsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل البيانات...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                        <CalendarDays className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.name}</p>
                          {item.isCurrent && <Badge className="bg-emerald-500 hover:bg-emerald-600 h-5 text-[8px] font-black uppercase">Active Current</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Layout className="h-3.5 w-3.5" /> <span>{item.code}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Clock className="h-3.5 w-3.5" /> <span>{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.status === 'ACTIVE' ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.status === 'ACTIVE' ? 'bg-primary/20 text-primary border-primary/30' : ''}`}>
                          {statusLabel(item.status)}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 italic">
                          <History className="h-2.5 w-2.5 mr-1 inline" /> {item._count.academicTerms} Terms
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11px] font-bold gap-1.5" onClick={() => handleStartEdit(item)} disabled={!canUpdate}>
                          <PencilLine className="h-3.5 w-3.5" /> تعديل
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)} disabled={!canDelete}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!yearsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد سنوات أكاديمية مسجلة تتوافق مع البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط العرض: دورات التحليل الزمني</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة سنة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير السنة الأكاديمية" : "رسم دورة أكاديمية جديدة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> التعريف العام</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">اسم السنة الأكاديمية *</label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: العام الدراسي 2026/2027" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">رمز المعرف (ID Code)</label>
                <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="AY-2026" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> الفترة التشغيلية</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">تاريخ الانطلاق *</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">تاريخ الإغلاق *</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> تحكم النظام</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">حالة السنة</label>
                <SelectField value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as any }))}>
                  <option value="PLANNED">مخططة (Planned)</option>
                  <option value="ACTIVE">نشطة (Active)</option>
                  <option value="CLOSED">مغلقة (Closed)</option>
                  <option value="ARCHIVED">مؤرشفة (Archived)</option>
                </SelectField>
              </div>
              <label className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 cursor-pointer transition-colors hover:bg-background">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">تعيين كـ "سنة حالية"</span>
                  <p className="text-[10px] text-muted-foreground">جعل هذه السنة هي الافتراضية لكافة العمليات الحالية</p>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={form.isCurrent} onChange={(e) => setForm(p => ({ ...p, isCurrent: e.target.checked }))} />
              </label>
            </div>
          </div>

          {!form.isCurrent && !isEditing && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-3 text-xs text-amber-800 leading-relaxed">
              <Info className="h-5 w-5 flex-shrink-0 text-amber-500" />
              <p>تغيير السنة الحالية سيؤثر على رصد الدرجات الافتراضي وتوزيع الطلاب في كافة واجهات النظام.</p>
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-bold text-center">
              {formError}
            </div>
          )}
        </div>
      </CrudFormSheet>
    </PageShell>
  );
}
