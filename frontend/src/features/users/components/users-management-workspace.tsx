"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  Mail,
  User,
  UserCheck,
  ShieldCheck,
  Building,
  Key,
  Settings2,
  Phone,
  UserRoundCheck,
  Fingerprint,
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Fab } from "@/components/ui/fab";
import { PageShell } from "@/components/ui/page-shell";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useUpdateUserMutation,
} from "@/features/users/hooks/use-users-mutations";
import { useUsersQuery } from "@/features/users/hooks/use-users-query";
import {
  useEmployeeOptionsQuery,
  useGuardianOptionsQuery,
  useRoleOptionsQuery,
} from "@/features/users/hooks/use-user-form-options-query";
import { translateRoleCode } from "@/lib/i18n/ar";
import {
  findCountryDialCodeOptionByDialCode,
} from "@/lib/intl/phone";
import type { UserListItem } from "@/lib/api/client";

type UserFormState = {
  email: string;
  username: string;
  phoneCountryCode: string;
  phoneNationalNumber: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  employeeId: string;
  guardianId: string;
  roleIds: string[];
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: UserFormState = {
  email: "",
  username: "",
  phoneCountryCode: "",
  phoneNationalNumber: "",
  firstName: "",
  lastName: "",
  isActive: true,
  employeeId: "",
  guardianId: "",
  roleIds: [],
};

function toFormState(user: UserListItem): UserFormState {
  return {
    email: user.email,
    username: user.username ?? "",
    phoneCountryCode: user.phoneCountryCode ?? "",
    phoneNationalNumber: user.phoneNationalNumber ?? "",
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    employeeId: user.employee?.id ?? "",
    guardianId: user.guardian?.id ?? "",
    roleIds: user.userRoles.map((item) => item.role.id),
  };
}

export function UsersManagementWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("users.create");
  const canUpdate = hasPermission("users.update");
  const canDelete = hasPermission("users.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive" | "deleted">("all");
  const [filterDraft, setFilterDraft] = React.useState<"all" | "active" | "inactive" | "deleted">("all");

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<UserFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = React.useState<string | null>(null);

  const usersQuery = useUsersQuery({
    page, limit: PAGE_SIZE, search,
    isActive: activeFilter === "all" || activeFilter === "deleted" ? undefined : activeFilter === "active",
    deletedOnly: activeFilter === "deleted" ? true : undefined,
  });

  const rolesQuery = useRoleOptionsQuery();
  const employeesQuery = useEmployeeOptionsQuery();
  const guardiansQuery = useGuardianOptionsQuery();

  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();

  const records = React.useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data?.data]);
  const pagination = usersQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft(activeFilter);
  }, [activeFilter, isFilterOpen]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
    setFormError(null);
    setCreatedSummary(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: UserListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phoneNationalNumber.trim()) {
      setFormError("الاسم الأول، اللقب، ورقم الهاتف حقول مطلوبة.");
      return;
    }

    const payload = {
      email: form.email.trim().toLowerCase() || undefined,
      username: form.username.trim() || undefined,
      phoneCountryCode: form.phoneCountryCode.trim(),
      phoneNationalNumber: form.phoneNationalNumber.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      employeeId: form.employeeId || undefined,
      guardianId: form.guardianId || undefined,
      isActive: form.isActive,
      roleIds: form.roleIds,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ userId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { 
        onSuccess: (res) => {
          setCreatedSummary(`تم الإنشاء! كود التفعيل: ${res.activationSetup.initialOneTimePassword}`);
          // Don't close immediately if we want to show the password
          setPage(1);
        } 
      });
    }
  };

  const handleDelete = (item: UserListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف المستخدم ${item.firstName} ${item.lastName}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setActiveFilter(filterDraft);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setActiveFilter("all");
    setFilterDraft("all");
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, activeFilter !== "all" ? 1 : 0].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, searchInput]);

  return (
    <PageShell
      title="إدارة الهوية والوصول"
      subtitle="تنظيم حسابات المستخدمين، تعيين الأدوار الوظيفية، والتحكم في صلاحيات الدخول للمنصة الأكاديمية."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث بالاسم، البريد، أو رقم الهاتف..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void usersQuery.refetch()} disabled={usersQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${usersQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="معايير فرز المستخدمين"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">حالة الحساب</label>
            <SelectField value={filterDraft} onChange={(e) => setFilterDraft(e.target.value as "all" | "active" | "inactive" | "deleted")}>
              <option value="all">كل الحسابات</option>
              <option value="active">نشطة فقط</option>
              <option value="inactive">معطلة فقط</option>
              <option value="deleted">الأرشيف (المحذوفة)</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" />
                سجل حسابات المستخدمين
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {usersQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل قائمة المستخدمين...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-secondary/5 border border-secondary/10 group-hover:bg-secondary/10 transition-colors shadow-sm relative">
                         <User className="h-6 w-6 text-primary/60" />
                         {item.isActive && <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.firstName} {item.lastName}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-muted-foreground border-border/70">
                             {item.username || "NO-USERNAME"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Mail className="h-3.5 w-3.5" /> <span>{item.email || "بدون بريد"}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Phone className="h-3.5 w-3.5" /> <span>{item.phoneE164 || "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Authorized User" : "Access Denied"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 text-blue-600 bg-blue-50">
                          {item.activationStatus === "ACTIVE" ? "Identified" : "Pending Activation"}
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
                        <Fingerprint className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">الأدوار والصلاحيات</span>
                           <div className="flex flex-wrap gap-1 mt-1">
                              {item.userRoles.length > 0 ? (
                                item.userRoles.map(r => <Badge key={r.role.id} variant="outline" className="h-4 text-[7px] border-border/70">{translateRoleCode(r.role.code)}</Badge>)
                              ) : <span className="text-[10px] italic">بدون أدوار</span>}
                           </div>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <Building className="h-4 w-4 text-emerald-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">الربط مع الموظفين</span>
                           <span className="text-[10px] font-bold truncate leading-tight">
                              {item.employee ? `${item.employee.fullName} (${item.employee.jobNumber})` : "غير مرتبط بموظف"}
                           </span>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <UserRoundCheck className="h-4 w-4 text-amber-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">الربط مع أولياء الأمور</span>
                           <span className="text-[10px] font-bold truncate leading-tight">
                              {item.guardian ? item.guardian.fullName : "غير مرتبط بولي أمر"}
                           </span>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {!usersQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا يوجد مستخدمون متطابقون مع الفلترة الحالية.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نظام التحكم: مركز الهويات الموحد</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة مستخدم" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحديث بيانات الهوية" : "تسجيل مستخدم جديد بنظام الهوية"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
             <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><UserCheck className="h-5 w-5 text-primary" /></div>
                <div>
                   <h4 className="text-xs font-bold uppercase text-primary leading-none">ملف الهوية الشخصية</h4>
                   <p className="text-[10px] text-muted-foreground mt-1">المعلومات الأساسية وقنوات التواصل</p>
                </div>
             </div>
             
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الاسم الأول *</label>
                <Input value={form.firstName} onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="أحمد" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">اللقب / العائلة *</label>
                <Input value={form.lastName} onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="علي" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">رقم الهاتف (رقم الجوال) *</label>
                <InternationalPhoneField 
                   nationalNumber={form.phoneNationalNumber}
                   countryIso2={findCountryDialCodeOptionByDialCode(form.phoneCountryCode)?.iso2 || "YE"}
                   onChange={(next) => setForm(p => ({ ...p, phoneNationalNumber: next.nationalNumber, phoneCountryCode: next.dialCode }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">البريد الإلكتروني</label>
                <Input value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="example@school.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1 text-primary italic">اسم المستخدم (Username)</label>
                <Input value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))} placeholder="ahmed.ali" disabled={isEditing} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
             <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Fingerprint className="h-5 w-5 text-blue-600" /></div>
                <div>
                   <h4 className="text-xs font-bold uppercase text-blue-600 leading-none">مصفوفة الأدوار والربط</h4>
                   <p className="text-[10px] text-muted-foreground mt-1">تعيين الصلاحيات والارتباط مع الكادر التربوي</p>
                </div>
             </div>

            <div className="space-y-3">
               <label className="text-xs font-bold text-muted-foreground uppercase px-1">الأدوار الممنوحة</label>
               <div className="grid grid-cols-2 gap-2">
                  {(rolesQuery.data ?? []).map(r => (
                    <label key={r.id} className="flex items-center gap-2 p-2 rounded-xl border border-border/40 bg-background/50 cursor-pointer hover:bg-background transition-colors">
                       <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded text-blue-600" 
                          checked={form.roleIds.includes(r.id)} 
                          onChange={(e) => {
                             const next = e.target.checked ? [...form.roleIds, r.id] : form.roleIds.filter(id => id !== r.id);
                             setForm(p => ({ ...p, roleIds: next }));
                          }}
                       />
                       <span className="text-[10px] font-black uppercase text-foreground/80">{translateRoleCode(r.code)}</span>
                    </label>
                  ))}
               </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">ربط موظف</label>
                <SelectField value={form.employeeId} onChange={(e) => setForm(p => ({ ...p, employeeId: e.target.value, guardianId: "" }))}>
                  <option value="">بدون ربط</option>
                  {(employeesQuery.data ?? []).map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase px-1">ربط ولي أمر</label>
                <SelectField value={form.guardianId} onChange={(e) => setForm(p => ({ ...p, guardianId: e.target.value, employeeId: "" }))}>
                  <option value="">بدون ربط</option>
                  {(guardiansQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.fullName}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-3">
             <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> صلاحية الدخول</h4>
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">نشط (Account Active)</span>
                <p className="text-[10px] text-muted-foreground">السماح لهذا المستخدم بطلب الدخول للنظام</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
            </label>
          </div>

          {createdSummary && (
             <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 border-dashed">
                <h5 className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1.5"><Key className="h-3.5 w-3.5" /> معلومات التفعيل الأولي</h5>
                <p className="text-xs font-bold text-foreground tracking-tight select-all">{createdSummary}</p>
                <p className="text-[9px] text-muted-foreground leading-tight italic">الرجاء تزويد المستخدم بهذه المعلومات لإكمال عملية تفعيل الحساب.</p>
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
