"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Users,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  Briefcase,
  BadgeDollarSign,
  GraduationCap,
  Calendar,
  MapPinned,
  Network,
  GitBranch,
  ScrollText,
  Building,
  User,
  ShieldCheck,
  Target,
  Settings2,
  Stethoscope,
  Phone,
  MessageSquare,
  Clock,
  Layout,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InternationalPhoneField } from "@/components/ui/international-phone-field";
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
import {
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useUpdateEmployeeMutation,
} from "@/features/employees/hooks/use-employees-mutations";
import { useGenderOptionsQuery } from "@/features/employees/hooks/use-gender-options-query";
import { useIdTypeOptionsQuery } from "@/features/employees/hooks/use-id-type-options-query";
import { useJobRoleOptionsQuery } from "@/features/employees/hooks/use-job-role-options-query";
import { useEmployeeOrganizationOptionsQuery } from "@/features/employees/hooks/use-employee-organization-options-query";
import { useEmployeesQuery } from "@/features/employees/hooks/use-employees-query";
import { useQualificationOptionsQuery } from "@/features/employees/hooks/use-qualification-options-query";
import {
  translateEmployeeGender,
  translateEmploymentType,
} from "@/lib/i18n/ar";
import {
  DEFAULT_COUNTRY_ISO2,
  normalizePhoneValue,
  parseStoredPhoneValue,
} from "@/lib/intl/phone";
import type {
  EmployeeGender,
  EmployeeListItem,
  EmployeeSystemAccessStatus,
  EmploymentType,
  OperationalReadinessFilter,
} from "@/lib/api/client";

type EmployeeFormState = {
  jobNumber: string;
  financialNumber: string;
  fullName: string;
  genderId: string;
  birthDate: string;
  phonePrimary: string;
  phonePrimaryCountryIso2: string;
  phonePrimaryNationalNumber: string;
  phoneSecondary: string;
  phoneSecondaryCountryIso2: string;
  phoneSecondaryNationalNumber: string;
  hasWhatsapp: boolean;
  qualificationId: string;
  qualificationDate: string;
  specialization: string;
  idNumber: string;
  idTypeId: string;
  localityId: string;
  departmentId: string;
  branchId: string;
  directManagerEmployeeId: string;
  costCenterId: string;
  idExpiryDate: string;
  experienceYears: string;
  employmentType: EmploymentType | "";
  jobRoleId: string;
  hireDate: string;
  previousSchool: string;
  salaryApproved: boolean;
  systemAccessStatus: EmployeeSystemAccessStatus;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: EmployeeFormState = {
  jobNumber: "",
  financialNumber: "",
  fullName: "",
  genderId: "",
  birthDate: "",
  phonePrimary: "",
  phonePrimaryCountryIso2: DEFAULT_COUNTRY_ISO2,
  phonePrimaryNationalNumber: "",
  phoneSecondary: "",
  phoneSecondaryCountryIso2: DEFAULT_COUNTRY_ISO2,
  phoneSecondaryNationalNumber: "",
  hasWhatsapp: true,
  qualificationId: "",
  qualificationDate: "",
  specialization: "",
  idNumber: "",
  idTypeId: "",
  localityId: "",
  departmentId: "",
  branchId: "",
  directManagerEmployeeId: "",
  costCenterId: "",
  idExpiryDate: "",
  experienceYears: "0",
  employmentType: "",
  jobRoleId: "",
  hireDate: "",
  previousSchool: "",
  salaryApproved: false,
  systemAccessStatus: "GRANTED",
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

function toPhoneFieldState(value: string | null | undefined): {
  phone: string;
  countryIso2: string;
  nationalNumber: string;
} {
  const parsed = parseStoredPhoneValue(value, DEFAULT_COUNTRY_ISO2);
  return { phone: parsed.e164, countryIso2: parsed.countryIso2, nationalNumber: parsed.nationalNumber };
}

function composePhoneValue(countryIso2: string, nationalNumber: string): string | undefined {
  const normalized = nationalNumber.trim();
  if (!normalized) return undefined;
  const result = normalizePhoneValue({ countryIso2, nationalNumber: normalized });
  return result.ok ? result.e164 : undefined;
}

function toFormState(employee: EmployeeListItem): EmployeeFormState {
  const pPhone = toPhoneFieldState(employee.phonePrimary);
  const sPhone = toPhoneFieldState(employee.phoneSecondary);
  return {
    jobNumber: employee.jobNumber ?? "",
    financialNumber: employee.financialNumber ?? "",
    fullName: employee.fullName,
    genderId: employee.genderId ? String(employee.genderId) : "",
    birthDate: toDateInput(employee.birthDate),
    phonePrimary: pPhone.phone,
    phonePrimaryCountryIso2: pPhone.countryIso2,
    phonePrimaryNationalNumber: pPhone.nationalNumber,
    phoneSecondary: sPhone.phone,
    phoneSecondaryCountryIso2: sPhone.countryIso2,
    phoneSecondaryNationalNumber: sPhone.nationalNumber,
    hasWhatsapp: employee.hasWhatsapp,
    qualificationId: employee.qualificationId ? String(employee.qualificationId) : "",
    qualificationDate: toDateInput(employee.qualificationDate),
    specialization: employee.specialization ?? "",
    idNumber: employee.idNumber ?? "",
    idTypeId: employee.idTypeId ? String(employee.idTypeId) : "",
    localityId: employee.localityId ? String(employee.localityId) : "",
    departmentId: employee.departmentId ?? "",
    branchId: employee.branchId ? String(employee.branchId) : "",
    directManagerEmployeeId: employee.directManagerEmployeeId ?? "",
    costCenterId: employee.costCenterId ? String(employee.costCenterId) : "",
    idExpiryDate: toDateInput(employee.idExpiryDate),
    experienceYears: String(employee.experienceYears),
    employmentType: employee.employmentType ?? "",
    jobRoleId: employee.jobRoleId ? String(employee.jobRoleId) : "",
    hireDate: toDateInput(employee.hireDate),
    previousSchool: employee.previousSchool ?? "",
    salaryApproved: employee.salaryApproved,
    systemAccessStatus: employee.systemAccessStatus,
    isActive: employee.isActive,
  };
}

export function EmployeesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employees.create");
  const canUpdate = hasPermission("employees.update");
  const canDelete = hasPermission("employees.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState("all");
  const [empTypeFilter, setEmpTypeFilter] = React.useState("all");
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ gender: "all", empType: "all", dept: "all", role: "all", active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<EmployeeFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [fGovId, setFGovId] = React.useState("");
  const [fDirId, setFDirId] = React.useState("");
  const [fSubId, setFSubId] = React.useState("");
  const [fVilId, setFVilId] = React.useState("");

  const employeesQuery = useEmployeesQuery({
    page, limit: PAGE_SIZE, search,
    genderId: genderFilter === "all" ? undefined : Number(genderFilter),
    employmentType: empTypeFilter === "all" ? undefined : empTypeFilter as any,
    departmentId: deptFilter === "all" ? undefined : deptFilter,
    jobRoleId: roleFilter === "all" ? undefined : Number(roleFilter),
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const genderOptionsQuery = useGenderOptionsQuery();
  const geoQuery = useGeographyOptionsQuery("employees");
  const orgQuery = useEmployeeOrganizationOptionsQuery();
  const qualQuery = useQualificationOptionsQuery();
  const roleQuery = useJobRoleOptionsQuery();

  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const deleteMutation = useDeleteEmployeeMutation();

  const records = React.useMemo(() => employeesQuery.data?.data ?? [], [employeesQuery.data?.data]);
  const pagination = employeesQuery.data?.pagination;
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
    setFilterDraft({ gender: genderFilter, empType: empTypeFilter, dept: deptFilter, role: roleFilter, active: activeFilter });
  }, [activeFilter, deptFilter, empTypeFilter, genderFilter, isFilterOpen, roleFilter]);

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

  const handleStartEdit = (item: EmployeeListItem) => {
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
      jobNumber: form.jobNumber.trim() || undefined,
      financialNumber: form.financialNumber.trim() || undefined,
      fullName: form.fullName.trim(),
      genderId: Number(form.genderId),
      birthDate: form.birthDate ? toDateIso(form.birthDate) : undefined,
      phonePrimary: composePhoneValue(form.phonePrimaryCountryIso2, form.phonePrimaryNationalNumber),
      phoneSecondary: composePhoneValue(form.phoneSecondaryCountryIso2, form.phoneSecondaryNationalNumber),
      hasWhatsapp: form.hasWhatsapp,
      qualificationId: form.qualificationId ? Number(form.qualificationId) : null,
      qualificationDate: form.qualificationDate ? toDateIso(form.qualificationDate) : undefined,
      specialization: form.specialization.trim() || undefined,
      idNumber: form.idNumber.trim() || undefined,
      idTypeId: form.idTypeId ? Number(form.idTypeId) : null,
      localityId: form.localityId ? Number(form.localityId) : null,
      departmentId: form.departmentId || null,
      branchId: form.branchId ? Number(form.branchId) : null,
      directManagerEmployeeId: form.directManagerEmployeeId || null,
      costCenterId: form.costCenterId ? Number(form.costCenterId) : null,
      idExpiryDate: form.idExpiryDate ? toDateIso(form.idExpiryDate) : undefined,
      experienceYears: Number(form.experienceYears) || 0,
      employmentType: form.employmentType || undefined,
      jobRoleId: form.jobRoleId ? Number(form.jobRoleId) : null,
      hireDate: form.hireDate ? toDateIso(form.hireDate) : undefined,
      previousSchool: form.previousSchool.trim() || undefined,
      salaryApproved: form.salaryApproved,
      systemAccessStatus: form.systemAccessStatus,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ employeeId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: EmployeeListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف بيانات الموظف ${item.fullName}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setGenderFilter(filterDraft.gender);
    setEmpTypeFilter(filterDraft.empType);
    setDeptFilter(filterDraft.dept);
    setRoleFilter(filterDraft.role);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setGenderFilter("all");
    setEmpTypeFilter("all");
    setDeptFilter("all");
    setRoleFilter("all");
    setActiveFilter("all");
    setFilterDraft({ gender: "all", empType: "all", dept: "all", role: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0, genderFilter !== "all" ? 1 : 0, empTypeFilter !== "all" ? 1 : 0,
      deptFilter !== "all" ? 1 : 0, roleFilter !== "all" ? 1 : 0, activeFilter !== "all" ? 1 : 0
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, deptFilter, empTypeFilter, genderFilter, roleFilter, searchInput]);

  return (
    <PageShell
      title="بوابـة الكـادر الوظيفي"
      subtitle="إدارة بيانات الموظفين، العقود، التوزيع الإداري والهيكلية التنظيمية للمؤسسة التعليمية."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الموظف أو الرقم الوظيفي..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void employeesQuery.refetch()} disabled={employeesQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${employeesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="معايير الاستعلام"
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
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">نوع التعاقد</label>
              <SelectField value={filterDraft.empType} onChange={(e) => setFilterDraft(p => ({ ...p, empType: e.target.value as any }))}>
                <option value="all">كل الأنواع</option>
                <option value="PERMANENT">دائم / رسمي</option>
                <option value="CONTRACTOR">متقاعد / تعاقدي</option>
                <option value="TEMPORARY">مؤقت / متطوع</option>
              </SelectField>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">القسم / الإدارة</label>
              <SelectField value={filterDraft.dept} onChange={(e) => setFilterDraft(p => ({ ...p, dept: e.target.value }))}>
                <option value="all">كل الأقسام</option>
                {(orgQuery.data?.departments ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Users className="h-5 w-5 text-primary" />
                سجل بيانات الموظفين
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {employeesQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل بيانات الكادر...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-secondary/5 border border-secondary/10 group-hover:bg-secondary/10 transition-colors shadow-sm">
                         <User className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.fullName}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-muted-foreground border-border/70 bg-stone-50">
                             {item.jobNumber || "NO-JOB-NO"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Briefcase className="h-3.5 w-3.5" /> <span>{item.jobRoleLookup?.nameAr || "غير محدد"}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Network className="h-3.5 w-3.5" /> <span>{item.department?.name || "بدون قسم"}</span>
                          {item.financialNumber && (
                            <>
                              <span className="mx-1 opacity-30">•</span>
                              <Badge variant="outline" className="h-4 text-[7px] border-emerald-500/20 text-emerald-600 bg-emerald-500/5">FIN: {item.financialNumber}</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Active Employee" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 text-blue-600 bg-blue-50">
                          {item.employmentType ? translateEmploymentType(item.employmentType) : "غير محدد"}
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

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                     {[
                        { label: "رقم التواصل", val: item.phonePrimary || "-", icon: Phone, color: "text-blue-500/60" },
                        { label: "الموقع السكني", val: item.locality?.nameAr || "غير محدد", icon: MapPinned, color: "text-emerald-500/60" },
                        { label: "المؤهل العلمي", val: item.qualificationLookup?.nameAr || item.qualification || "-", icon: GraduationCap, color: "text-amber-500/60" },
                        { label: "سنوات الخبرة", val: `${item.experienceYears} عام`, icon: Clock, color: "text-rose-500/60" },
                     ].map((stat, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                           <stat.icon className={`h-4 w-4 ${stat.color} mt-0.5 shrink-0`} />
                           <div className="flex flex-col overflow-hidden">
                              <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">{stat.label}</span>
                              <span className="text-[10px] font-bold truncate tracking-tight">{stat.val}</span>
                           </div>
                        </div>
                     ))}
                  </div>
                </div>
              ))}
            </div>

            {!employeesQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا يوجد موظفون متطابقون مع معايير البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط الإدارة: الأرشفة المركزية للكادر البشرية</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة موظف" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحديث بيانات الموظف" : "تسجيل موظف جديد بالمؤسسة"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> الهوية الوظيفية والشخصية</h4>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الاسم الرباعي المعتمد *</label>
                <Input value={form.fullName} onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="أدخل اسم الموظف كما في الوثائق الرسمية" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الرقم الوظيفي (Job #)</label>
                  <Input value={form.jobNumber} onChange={(e) => setForm(p => ({ ...p, jobNumber: e.target.value }))} placeholder="EMP-2024-XXX" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الرقم المالي</label>
                  <Input value={form.financialNumber} onChange={(e) => setForm(p => ({ ...p, financialNumber: e.target.value }))} placeholder="FIN-XXXX" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الجنس *</label>
                  <SelectField value={form.genderId} onChange={(e) => setForm(p => ({ ...p, genderId: e.target.value }))}>
                    <option value="">اختر الجنس</option>
                    {(genderOptionsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
                  </SelectField>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">تاريخ الميلاد</label>
                  <Input type="date" value={form.birthDate} onChange={(e) => setForm(p => ({ ...p, birthDate: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Network className="h-3.5 w-3.5" /> التوزيع الإداري وسجل التوظيف</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">الدور الوظيفي / الرتبة</label>
                <SelectField value={form.jobRoleId} onChange={(e) => setForm(p => ({ ...p, jobRoleId: e.target.value }))}>
                  <option value="">اختر الدور</option>
                  {(roleQuery.data ?? []).map(r => <option key={r.id} value={r.id}>{r.nameAr}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">القسم الأكاديمي / الإداري</label>
                <SelectField value={form.departmentId} onChange={(e) => setForm(p => ({ ...p, departmentId: e.target.value }))}>
                  <option value="">بدون تبعية لقسم</option>
                  {(orgQuery.data?.departments ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">نوع التعاقد</label>
                <SelectField value={form.employmentType} onChange={(e) => setForm(p => ({ ...p, employmentType: e.target.value as any }))}>
                  <option value="">اختر النوع</option>
                  <option value="PERMANENT">دائم / رسمي</option>
                  <option value="CONTRACTOR">متقاعد / تعاقدي</option>
                  <option value="TEMPORARY">مؤقت / متطوع</option>
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">تاريخ مباشرة العمل</label>
                <Input type="date" value={form.hireDate} onChange={(e) => setForm(p => ({ ...p, hireDate: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> قنوات التواصل</h4>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">رقم الهاتف الأساسي</label>
                <InternationalPhoneField 
                   value={form.phonePrimary} 
                   countryIso2={form.phonePrimaryCountryIso2}
                   onChange={(next) => setForm(p => ({ ...p, phonePrimary: next.nationalNumber, phonePrimaryNationalNumber: next.nationalNumber, phonePrimaryCountryIso2: next.countryIso2 }))}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80">
                <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.hasWhatsapp} onChange={(e) => setForm(p => ({ ...p, hasWhatsapp: e.target.checked }))} />
                <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> الرقم مرتبط بتطبيق واتساب</span>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> السيرة الأكاديمية والخبرات</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">أعلى مؤهل علمي</label>
                <SelectField value={form.qualificationId} onChange={(e) => setForm(p => ({ ...p, qualificationId: e.target.value }))}>
                  <option value="">بدون مؤهل محدد</option>
                  {(qualQuery.data ?? []).map(q => <option key={q.id} value={q.id}>{q.nameAr}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">التخصص الدقيق</label>
                <Input value={form.specialization} onChange={(e) => setForm(p => ({ ...p, specialization: e.target.value }))} placeholder="التربية / الرياضيات ..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> سنوات الخبرة السابقة</label>
                <Input type="number" value={form.experienceYears} onChange={(e) => setForm(p => ({ ...p, experienceYears: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">المدرسة/جهة العمل السابقة</label>
                <Input value={form.previousSchool} onChange={(e) => setForm(p => ({ ...p, previousSchool: e.target.value }))} placeholder="اسم المؤسسة السابقة" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> التحكم والمصادقات</h4>
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">اعتماد الراتب (Salary Approved)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل صرف المستحقات المالية لهذا الموظف</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={form.salaryApproved} onChange={(e) => setForm(p => ({ ...p, salaryApproved: e.target.checked }))} />
            </label>
            <div className="h-[1px] bg-border/40" />
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary">حالة التوظيف (Active)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل ملف الموظف لكافة العمليات الأكاديمية وصلاحيات النظام</p>
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
