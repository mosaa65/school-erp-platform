"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  KeyRound,
  RefreshCw,
  PencilLine,
  Trash2,
  ShieldCheck,
  ShieldOff,
  User,
  History,
  Clock,
  Shield,
  Activity,
  Calendar,
  Lock,
  Mail,
  Fingerprint,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
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
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateUserPermissionMutation,
  useDeleteUserPermissionMutation,
  useRevokeUserPermissionMutation,
  useUpdateUserPermissionMutation,
} from "@/features/user-permissions/hooks/use-user-permissions-mutations";
import { useUserPermissionsQuery } from "@/features/user-permissions/hooks/use-user-permissions-query";
import { usePermissionsOptionsQuery } from "@/features/permissions/hooks/use-permissions-options-query";
import { useUsersOptionsQuery } from "@/features/users/hooks/use-users-options-query";
import { PermissionsSelector } from "@/components/ui/permissions-selector";
import type { UserPermissionListItem } from "@/lib/api/client";
import { translatePermissionCode } from "@/lib/i18n/ar";

type UserPermissionFormState = {
  userId: string;
  permissionId: string;
  selectedPermissionIds: string[];
  validFrom: string;
  validUntil: string;
  grantReason: string;
  notes: string;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: UserPermissionFormState = {
  userId: "",
  permissionId: "",
  selectedPermissionIds: [],
  validFrom: "",
  validUntil: "",
  grantReason: "",
  notes: "",
};

function toLocalDateTimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoFromLocal(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  return new Date(normalized).toISOString();
}

function toFormState(item: UserPermissionListItem): UserPermissionFormState {
  return {
    userId: item.userId,
    permissionId: item.permissionId,
    selectedPermissionIds: [item.permissionId],
    validFrom: toLocalDateTimeInput(item.validFrom),
    validUntil: toLocalDateTimeInput(item.validUntil),
    grantReason: item.grantReason,
    notes: item.notes ?? "",
  };
}

export function UserPermissionsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("user-permissions.create");
  const canUpdate = hasPermission("user-permissions.update");
  const canDelete = hasPermission("user-permissions.delete");
  const canRevoke = hasPermission("user-permissions.revoke");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "current" | "revoked">("all");
  const [userFilter, setUserFilter] = React.useState<string>("all");
  const [filterDraft, setFilterDraft] = React.useState<{ status: "all" | "current" | "revoked"; user: string }>({ status: "all", user: "all" });

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<UserPermissionFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = React.useState(false);

  const userPermissionsQuery = useUserPermissionsQuery({
    page, limit: PAGE_SIZE, search,
    userId: userFilter === "all" ? undefined : userFilter,
    isRevoked: statusFilter === "revoked" ? true : undefined,
    isCurrent: statusFilter === "current" ? true : undefined,
  });

  const usersOptionsQuery = useUsersOptionsQuery();
  const permissionsOptionsQuery = usePermissionsOptionsQuery();

  const createMutation = useCreateUserPermissionMutation();
  const updateMutation = useUpdateUserPermissionMutation();
  const revokeMutation = useRevokeUserPermissionMutation();
  const deleteMutation = useDeleteUserPermissionMutation();

  const records = React.useMemo(() => userPermissionsQuery.data?.data ?? [], [userPermissionsQuery.data?.data]);
  const pagination = userPermissionsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = isBulkSubmitting || createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ status: statusFilter, user: userFilter });
  }, [isFilterOpen, statusFilter, userFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: UserPermissionListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && (!form.userId || form.selectedPermissionIds.length === 0)) {
      setFormError("يجب اختيار المستخدم وصلاحية واحدة على الأقل.");
      return;
    }

    const payload = {
      validFrom: toIsoFromLocal(form.validFrom),
      validUntil: toIsoFromLocal(form.validUntil),
      grantReason: form.grantReason.trim(),
      notes: form.notes.trim() || undefined,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ userPermissionId: editingId, payload }, { onSuccess: resetFormState });
      return;
    }

    setIsBulkSubmitting(true);
    try {
      await Promise.all(form.selectedPermissionIds.map(pid => 
        createMutation.mutateAsync({
          userId: form.userId,
          permissionId: pid,
          grantReason: payload.grantReason!,
          validFrom: payload.validFrom,
          validUntil: payload.validUntil,
          notes: payload.notes,
        })
      ));
      resetFormState();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "فشل منح بعض الصلاحيات.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleToggleRevoke = (item: UserPermissionListItem) => {
    if (!canRevoke || item.revokedAt) return;
    const reason = window.prompt("سبب سحب الصلاحية (اختياري):") ?? "";
    revokeMutation.mutate({
      userPermissionId: item.id,
      payload: { revokeReason: reason.trim() || undefined },
    });
  };

  const handleDelete = (item: UserPermissionListItem) => {
    if (!canDelete || !window.confirm("تأكيد حذف سجل الصلاحية المباشرة؟")) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setStatusFilter(filterDraft.status);
    setUserFilter(filterDraft.user);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setUserFilter("all");
    setFilterDraft({ status: "all", user: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0, statusFilter !== "all" ? 1 : 0,
      userFilter !== "all" ? 1 : 0
    ].reduce((acc, v) => acc + v, 0);
  }, [searchInput, statusFilter, userFilter]);

  return (
    <PageShell
      title="مصفوفة الصلاحيات المباشرة"
      subtitle="إدارة الاستثناءات والمنح المباشرة للمستخدمين بعيداً عن الأدوار الافتراضية، مع التحكم في النطاق الزمني."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث بالمستخدم أو كود الصلاحية..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void userPermissionsQuery.refetch()} disabled={userPermissionsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${userPermissionsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="تخصيص العرض"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">حالة الصلاحية</label>
              <SelectField value={filterDraft.status} onChange={(e) => setFilterDraft(p => ({ ...p, status: e.target.value as "all" | "current" | "revoked" }))}>
                <option value="all">كل السجلات</option>
                <option value="current">سارية حالياً</option>
                <option value="revoked">مسحوبة / ملغاة</option>
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">المستخدم الممنوح</label>
              <SelectField value={filterDraft.user} onChange={(e) => setFilterDraft(p => ({ ...p, user: e.target.value }))}>
                <option value="all">كافة المستخدمين</option>
                {(usersOptionsQuery.data ?? []).map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" />
                سجل المنح الاستثنائي
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {userPermissionsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ استرجاع بيانات الأمان...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-secondary/5 border border-secondary/10 group-hover:bg-secondary/10 transition-colors shadow-sm">
                         <Fingerprint className={`h-6 w-6 ${item.revokedAt ? 'text-muted-foreground' : 'text-primary/60'}`} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.user?.firstName} {item.user?.lastName}</p>
                          <Badge variant={item.revokedAt ? "outline" : "default"} className={`h-5 text-[8px] font-black uppercase ${item.revokedAt ? 'border-destructive/30 text-destructive' : 'bg-emerald-500 hover:bg-emerald-600 border-none'}`}>
                            {item.revokedAt ? "Revoked" : "Authorized"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Lock className="h-3.5 w-3.5" /> <span>{translatePermissionCode(item.permission.code)}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Mail className="h-3.5 w-3.5" /> <span>{item.user?.email || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11px] font-bold gap-1.5" onClick={() => handleStartEdit(item)} disabled={!canUpdate}>
                          <PencilLine className="h-3.5 w-3.5" /> تعديل
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11px] font-bold gap-1.5 text-amber-600 hover:bg-amber-50" onClick={() => handleToggleRevoke(item)} disabled={!canRevoke || !!item.revokedAt}>
                          <ShieldOff className="h-3.5 w-3.5" /> سحب
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)} disabled={!canDelete}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <Activity className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">سبب المنح (Reason)</span>
                           <span className="text-[10px] font-bold truncate tracking-tight">{item.grantReason}</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <Calendar className="h-4 w-4 text-emerald-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">نطاق السريان (Validity)</span>
                           <span className="text-[10px] font-bold truncate tracking-tight">
                              {item.validFrom ? `من: ${new Date(item.validFrom).toLocaleDateString()}` : "دائمة"}
                           </span>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <History className="h-4 w-4 text-amber-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">تاريخ الانتهاء</span>
                           <span className="text-[10px] font-bold truncate tracking-tight">
                              {item.validUntil ? `إلى: ${new Date(item.validUntil).toLocaleDateString()}` : "مفتوحة"}
                           </span>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {!userPermissionsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد سجلات منح مباشرة حالياً.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide font-mono">ENCRYPTION-LEVEL: DIRECT-GRANT-PROTOCOL</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<KeyRound className="h-5 w-5" />} label="منح صلاحية" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحديث سجل الصلاحية" : "إجراء منح صلاحية مباشر"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> اختيار المستفيد</h4>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">المستخدم الممنوح *</label>
              <SelectField value={form.userId} onChange={(e) => setForm(p => ({ ...p, userId: e.target.value }))} disabled={isEditing}>
                <option value="">اختر المستخدم</option>
                {(usersOptionsQuery.data ?? []).map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}
              </SelectField>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> الصلاحيات المحددة</h4>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">قائمة الصلاحيات *</label>
              {isEditing ? (
                 <div className="p-3 rounded-xl border border-border/30 bg-background/50 font-bold text-xs uppercase">
                    {translatePermissionCode((permissionsOptionsQuery.data ?? []).find(p => p.id === form.permissionId)?.code || "N/A")}
                 </div>
              ) : (
                <PermissionsSelector
                  permissions={permissionsOptionsQuery.data ?? []}
                  selectedIds={form.selectedPermissionIds}
                  onChange={(ids) => setForm(p => ({ ...p, selectedPermissionIds: ids }))}
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> النطاق الزمني والسبب</h4>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">تاريخ البدء</label>
                    <Input type="datetime-local" value={form.validFrom} onChange={(e) => setForm(p => ({ ...p, validFrom: e.target.value }))} />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">تاريخ الانتهاء</label>
                    <Input type="datetime-local" value={form.validUntil} onChange={(e) => setForm(p => ({ ...p, validUntil: e.target.value }))} />
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">سبب المنح (Grant Reason) *</label>
                 <Input value={form.grantReason} onChange={(e) => setForm(p => ({ ...p, grantReason: e.target.value }))} placeholder="مثال: ترقية مؤقتة للموظف" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">ملاحظات إضافية</label>
                 <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="اختياري..." />
              </div>
            </div>
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
