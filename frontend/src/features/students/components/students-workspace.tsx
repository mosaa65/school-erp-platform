"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Users,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  User,
  CalendarDays,
  MapPin,
  Droplets,
  HeartPulse,
  Heart,
  Activity,
  UserCheck,
  Building,
  GraduationCap,
  Layout,
  Target,
  Settings2,
  Stethoscope,
  ShieldCheck,
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
import { useGeographyOptionsQuery } from "@/features/lookup-catalog/hooks/use-geography-options-query";
import {
  buildGeographyMaps,
  resolveSelectionFromLocality,
} from "@/features/lookup-catalog/lib/geography";
import { useLookupOrphanStatusesQuery } from "@/features/lookup-orphan-statuses/hooks/use-lookup-orphan-statuses-query";
import {
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useUpdateStudentMutation,
} from "@/features/students/hooks/use-students-mutations";
import { useBloodTypeOptionsQuery } from "@/features/students/hooks/use-blood-type-options-query";
import { useStudentGenderOptionsQuery } from "@/features/students/hooks/use-gender-options-query";
import { useHealthStatusOptionsQuery } from "@/features/students/hooks/use-health-status-options-query";
import { useStudentsQuery } from "@/features/students/hooks/use-students-query";
import {
  translateStudentGender,
  translateStudentHealthStatus,
  translateStudentOrphanStatus,
} from "@/lib/i18n/ar";
import type {
  StudentGender,
  StudentHealthStatus,
  StudentListItem,
  StudentOrphanStatus,
} from "@/lib/api/client";

type StudentFormState = {
  admissionNo: string;
  fullName: string;
  genderId: string;
  birthDate: string;
  bloodTypeId: string;
  localityId: string;
  healthStatusId: string;
  healthNotes: string;
  orphanStatusId: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: StudentFormState = {
  admissionNo: "",
  fullName: "",
  genderId: "",
  birthDate: "",
  bloodTypeId: "",
  localityId: "",
  healthStatusId: "",
  healthNotes: "",
  orphanStatusId: "",
  isActive: true,
};

function toDateInput(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toDateIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("ar-SA");
}

function toFormState(student: StudentListItem): StudentFormState {
  return {
    admissionNo: student.admissionNo ?? "",
    fullName: student.fullName,
    genderId: student.genderId ? String(student.genderId) : "",
    birthDate: toDateInput(student.birthDate),
    bloodTypeId: student.bloodTypeId ? String(student.bloodTypeId) : "",
    localityId: student.localityId ? String(student.localityId) : "",
    healthStatusId: student.healthStatusId ? String(student.healthStatusId) : "",
    healthNotes: student.healthNotes ?? "",
    orphanStatusId: student.orphanStatusId ? String(student.orphanStatusId) : "",
    isActive: student.isActive,
  };
}

export function StudentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("students.create");
  const canUpdate = hasPermission("students.update");
  const canDelete = hasPermission("students.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState("all");
  const [bloodFilter, setBloodFilter] = React.useState("all");
  const [orphanFilter, setOrphanFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ gender: "all", blood: "all", orphan: "all", active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<StudentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [fGovId, setFGovId] = React.useState("");
  const [fDirId, setFDirId] = React.useState("");
  const [fSubId, setFSubId] = React.useState("");
  const [fVilId, setFVilId] = React.useState("");

  const studentsQuery = useStudentsQuery({
    page, limit: PAGE_SIZE, search,
    genderId: genderFilter === "all" ? undefined : Number(genderFilter),
    bloodTypeId: bloodFilter === "all" ? undefined : Number(bloodFilter),
    orphanStatusId: orphanFilter === "all" ? undefined : Number(orphanFilter),
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const genderOptionsQuery = useStudentGenderOptionsQuery();
  const bloodTypeOptionsQuery = useBloodTypeOptionsQuery();
  const geoQuery = useGeographyOptionsQuery("students");
  const healthQuery = useHealthStatusOptionsQuery();
  const orphanQuery = useLookupOrphanStatusesQuery({ page: 1, limit: 100, isActive: true });

  const createMutation = useCreateStudentMutation();
  const updateMutation = useUpdateStudentMutation();
  const deleteMutation = useDeleteStudentMutation();

  const records = React.useMemo(() => studentsQuery.data?.data ?? [], [studentsQuery.data?.data]);
  const pagination = studentsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const geoMaps = React.useMemo(() => buildGeographyMaps({
    governorates: geoQuery.data?.governorates ?? [],
    directorates: geoQuery.data?.directorates ?? [],
    subDistricts: geoQuery.data?.subDistricts ?? [],
    villages: geoQuery.data?.villages ?? [],
    localities: geoQuery.data?.localities ?? [],
  }), [geoQuery.data]);

  const filteredDirs = React.useMemo(() => fGovId ? (geoQuery.data?.directorates ?? []).filter(d => d.governorateId === Number(fGovId)) : [], [fGovId, geoQuery.data]);
  const filteredSubs = React.useMemo(() => fDirId ? (geoQuery.data?.subDistricts ?? []).filter(s => s.directorateId === Number(fDirId)) : [], [fDirId, geoQuery.data]);
  const filteredVils = React.useMemo(() => fSubId ? (geoQuery.data?.villages ?? []).filter(v => v.subDistrictId === Number(fSubId)) : [], [fSubId, geoQuery.data]);
  const filteredLocs = React.useMemo(() => {
    if (!fDirId) return [];
    const dirId = Number(fDirId);
    const selVilId = fVilId ? Number(fVilId) : null;
    return (geoQuery.data?.localities ?? []).filter(l => l.localityType === "URBAN" ? l.directorateId === dirId : l.villageId === selVilId);
  }, [fDirId, fVilId, geoQuery.data]);

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ gender: genderFilter, blood: bloodFilter, orphan: orphanFilter, active: activeFilter });
  }, [activeFilter, bloodFilter, genderFilter, isFilterOpen, orphanFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
    setFGovId(""); setFDirId(""); setFSubId(""); setFVilId("");
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: StudentListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    const fs = toFormState(item);
    setForm(fs);
    if (fs.localityId) {
      const loc = geoMaps.localityById.get(Number(fs.localityId));
      const sel = resolveSelectionFromLocality(loc, geoMaps);
      setFGovId(sel.governorateId); setFDirId(sel.directorateId); setFSubId(sel.subDistrictId); setFVilId(sel.villageId);
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.fullName.trim() || !form.genderId) {
      setFormError("الاسم الكامل والجنس حقول مطلوبة.");
      return;
    }

    const payload = {
      admissionNo: form.admissionNo.trim() || undefined,
      fullName: form.fullName.trim(),
      genderId: Number(form.genderId),
      birthDate: form.birthDate ? toDateIso(form.birthDate) : undefined,
      bloodTypeId: form.bloodTypeId ? Number(form.bloodTypeId) : null,
      localityId: form.localityId ? Number(form.localityId) : null,
      healthStatusId: form.healthStatusId ? Number(form.healthStatusId) : undefined,
      healthNotes: form.healthNotes.trim() || undefined,
      orphanStatusId: form.orphanStatusId ? Number(form.orphanStatusId) : undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ studentId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: StudentListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف بيانات الطالب ${item.fullName}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setGenderFilter(filterDraft.gender);
    setBloodFilter(filterDraft.blood);
    setOrphanFilter(filterDraft.orphan);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setGenderFilter("all");
    setBloodFilter("all");
    setOrphanFilter("all");
    setActiveFilter("all");
    setFilterDraft({ gender: "all", blood: "all", orphan: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0, genderFilter !== "all" ? 1 : 0, bloodFilter !== "all" ? 1 : 0, orphanFilter !== "all" ? 1 : 0, activeFilter !== "all" ? 1 : 0
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, bloodFilter, genderFilter, orphanFilter, searchInput]);

  return (
    <PageShell
      title="إدارة شؤون الطلاب"
      subtitle="تنظيم البيانات الشخصية للطلاب، السجلات الصحية، والتوزيعات الحغرافية للوصول الأمثل للخدمات."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الطالب أو رقم القبول..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void studentsQuery.refetch()} disabled={studentsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${studentsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="معايير البحث المتقدم"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الجنس</label>
              <SelectField value={filterDraft.gender} onChange={(e) => setFilterDraft(p => ({ ...p, gender: e.target.value }))}>
                <option value="all">الكل</option>
                {(genderOptionsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">فصيلة الدم</label>
              <SelectField value={filterDraft.blood} onChange={(e) => setFilterDraft(p => ({ ...p, blood: e.target.value }))}>
                <option value="all">الكل</option>
                            {(bloodTypeOptionsQuery.data ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </SelectField>
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">حالة اليتم</label>
                          <SelectField value={filterDraft.orphan} onChange={(e) => setFilterDraft(p => ({ ...p, orphan: e.target.value }))}>
                            <option value="all">كل الحالات</option>
                            {(orphanQuery.data?.data ?? []).map(o => <option key={o.id} value={o.id}>{o.nameAr}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الحالة</label>
              <SelectField value={filterDraft.active} onChange={(e) => setFilterDraft(p => ({ ...p, active: e.target.value as any }))}>
                <option value="all">كل الحالات</option>
                <option value="active">النشطين فقط</option>
                <option value="inactive">المكتومين فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Users className="h-5 w-5 text-primary" />
                سجل بيانات الطلاب
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {studentsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل بيانات الطلاب...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-secondary/5 border border-secondary/10 group-hover:bg-secondary/10 transition-colors">
                         {item.gender === 'FEMALE' ? <User className="h-6 w-6 text-pink-500/60" /> : <User className="h-6 w-6 text-blue-500/60" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.fullName}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-muted-foreground border-border/70">
                             {item.admissionNo || "NO-ADM"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <CalendarDays className="h-3.5 w-3.5" /> <span>{formatDate(item.birthDate)}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Badge variant="outline" className="h-4 text-[7px] border-border/70 bg-stone-50 text-stone-600 font-black">
                            {translateStudentGender(item.gender)}
                          </Badge>
                          {item.bloodType && (
                            <>
                              <span className="mx-1 opacity-30">•</span>
                              <Badge variant="outline" className="h-4 text-[7px] border-rose-500/20 text-rose-600 bg-rose-500/5"><Droplets className="h-2 w-2 mr-0.5" /> {item.bloodType.name}</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Active Student" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 text-emerald-600 bg-emerald-50">
                          {translateStudentOrphanStatus(item.orphanStatus)}
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

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <MapPin className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">الموقع الجغرافي</span>
                           <span className="text-[10px] font-bold truncate leading-tight">
                              {item.locality ? item.locality.nameAr : "غير محدد"}
                           </span>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <HeartPulse className="h-4 w-4 text-rose-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">الحالة الصحية</span>
                           <span className="text-[10px] font-bold leading-tight">
                              {item.healthStatus ? translateStudentHealthStatus(item.healthStatus) : "سليم"}
                              {item.healthNotes && <span className="text-[9px] font-normal text-muted-foreground block mt-0.5 truncate">{item.healthNotes}</span>}
                           </span>
                        </div>
                     </div>
                     <div className="hidden lg:flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <UserCheck className="h-4 w-4 text-blue-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">رقم الطالب الأكاديمي</span>
                           <span className="text-[10px] font-black leading-tight tracking-wider">{item.admissionNo || "-"}</span>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {!studentsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا يوجد طلاب متطابقين مع معايير البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط العرض: سجل الطالب الرقمي الموحد</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة طالب" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحديث ملف الطالب" : "تسجيل طالب جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> الهوية الشخصية</h4>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الاسم الكامل للطالب *</label>
                <Input value={form.fullName} onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="أدخل اسم الطالب رباعياً" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">رقم القبول</label>
                  <Input value={form.admissionNo} onChange={(e) => setForm(p => ({ ...p, admissionNo: e.target.value }))} placeholder="2024-XXXX" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">تاريخ الميلاد</label>
                  <Input type="date" value={form.birthDate} onChange={(e) => setForm(p => ({ ...p, birthDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الجنس *</label>
                  <SelectField value={form.genderId} onChange={(e) => setForm(p => ({ ...p, genderId: e.target.value }))}>
                    <option value="">اختر الجنس</option>
                    {(genderOptionsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
                  </SelectField>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">حالة اليتم *</label>
                  <SelectField value={form.orphanStatusId} onChange={(e) => setForm(p => ({ ...p, orphanStatusId: e.target.value }))}>
                    <option value="">اختر الحالة</option>
                    {(orphanQuery.data?.data ?? []).map(o => <option key={o.id} value={o.id}>{o.nameAr}</option>)}
                  </SelectField>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> الموضع الجغرافي</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">المحافظة</label>
                <SelectField value={fGovId} onChange={(e) => { setFGovId(e.target.value); setFDirId(""); setFSubId(""); setFVilId(""); setForm(p => ({ ...p, localityId: "" })); }}>
                  <option value="">اختر المحافظة</option>
                  {(geoQuery.data?.governorates ?? []).map(g => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">المديرية</label>
                <SelectField value={fDirId} onChange={(e) => { setFDirId(e.target.value); setFSubId(""); setFVilId(""); setForm(p => ({ ...p, localityId: "" })); }}>
                  <option value="">اختر المديرية</option>
                  {filteredDirs.map(d => <option key={d.id} value={d.id}>{d.nameAr}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">العزلة / المنطقة</label>
                <SelectField value={fSubId} onChange={(e) => { setFSubId(e.target.value); setFVilId(""); setForm(p => ({ ...p, localityId: "" })); }}>
                  <option value="">اختر المنطقة</option>
                  {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">القرية</label>
                <SelectField value={fVilId} onChange={(e) => { setFVilId(e.target.value); setForm(p => ({ ...p, localityId: "" })); }}>
                  <option value="">لا يوجد قرية</option>
                  {filteredVils.map(v => <option key={v.id} value={v.id}>{v.nameAr}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase font-black text-primary">المحلية (Locality)</label>
                <SelectField value={form.localityId} onChange={(e) => setForm(p => ({ ...p, localityId: e.target.value }))}>
                  <option value="">اختر المحلية المحددة</option>
                  {filteredLocs.map(l => <option key={l.id} value={l.id}>{l.nameAr} ({l.localityType})</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> سجل الحالة الصحية</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-rose-500" /> فصيلة الدم</label>
                <SelectField value={form.bloodTypeId} onChange={(e) => setForm(p => ({ ...p, bloodTypeId: e.target.value }))}>
                  <option value="">غير متاح</option>
                                {(bloodTypeOptionsQuery.data ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </SelectField>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-muted-foreground uppercase px-1">التصنيف الصحي</label>
                <SelectField value={form.healthStatusId} onChange={(e) => setForm(p => ({ ...p, healthStatusId: e.target.value }))}>
                  <option value="">سليم / عادي</option>
                  {(healthQuery.data ?? []).map(h => <option key={h.id} value={h.id}>{h.nameAr}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">ملاحظات طبية خاصة</label>
                <Input value={form.healthNotes} onChange={(e) => setForm(p => ({ ...p, healthNotes: e.target.value }))} placeholder="أدخل أية حساسيات، أمراض مزمنة أو احتياجات خاصة..." />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary">الحالة المهنية (Active)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل ملف الطالب للعمليات الأكاديمية</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            </label>
          </div>

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
