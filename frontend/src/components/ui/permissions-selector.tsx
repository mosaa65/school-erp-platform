"use client";

import * as React from "react";
import { SearchField } from "@/components/ui/search-field";
import {
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  Filter,
  SlidersHorizontal,
  Settings2,
  RefreshCw,
  Zap,
  AlertTriangle,
  Check,
  X as CloseIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  translatePermissionCode,
  PERMISSION_RESOURCE_LABELS,
  PERMISSION_ACTION_LABELS,
} from "@/lib/i18n/ar";
import type { PermissionListItem } from "@/lib/api/client";

interface PermissionsSelectorProps {
  permissions: PermissionListItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

const RESOURCE_CATEGORIES: Record<string, string> = {
  // Global & Settings
  "global-settings": "settings",
  "system-settings": "settings",
  roles: "settings",
  users: "settings",
  permissions: "settings",
  "user-permissions": "settings",
  "audit-logs": "settings",
  "reminders-ticker": "settings",
  sessions: "settings",
  "school-profiles": "settings",

  // Lookups & General
  "lookup-blood-types": "lookups",
  "lookup-id-types": "lookups",
  "lookup-enrollment-statuses": "lookups",
  "lookup-orphan-statuses": "lookups",
  "lookup-ability-levels": "lookups",
  "lookup-activity-types": "lookups",
  "lookup-ownership-types": "lookups",
  "lookup-periods": "lookups",
  "lookup-catalog": "lookups",
  "lookup-grade-descriptions": "lookups",
  "lookup-school-types": "lookups",
  "lookup-genders": "lookups",
  "lookup-qualifications": "lookups",
  "lookup-job-roles": "lookups",
  "lookup-days": "lookups",
  "lookup-attendance-statuses": "lookups",
  "lookup-marital-statuses": "lookups",
  "lookup-health-statuses": "lookups",
  "lookup-relationship-types": "lookups",
  "lookup-talents": "lookups",
  "lookup-hijri-months": "lookups",
  "lookup-weeks": "lookups",
  "lookup-buildings": "lookups",
  "file-attachments": "lookups",
  "calendar-master": "lookups",
  "calendar-settings": "lookups",
  "calendar-adjustments-log": "lookups",
  governorates: "lookups",
  directorates: "lookups",
  "sub-districts": "lookups",
  villages: "lookups",
  localities: "lookups",

  // HR & Employees
  employees: "hr",
  talents: "hr",
  "employee-talents": "hr",
  "employee-courses": "hr",
  "employee-violations": "hr",
  "employee-tasks": "hr",
  "employee-teaching-assignments": "hr",
  "employee-section-supervisions": "hr",
  "employee-attendance": "hr",
  "employee-performance-evaluations": "hr",
  "hr-reports": "hr",

  // Students
  students: "students",
  guardians: "students",
  "student-guardians": "students",
  "student-enrollments": "students",
  "student-attendance": "students",
  "student-books": "students",
  "student-talents": "students",
  "student-siblings": "students",
  "student-problems": "students",
  "health-visits": "students",
  "parent-notifications": "students",

  // Academics & Grading
  "academic-years": "academics",
  "academic-terms": "academics",
  "academic-months": "academics",
  "grade-levels": "academics",
  sections: "academics",
  classrooms: "academics",
  subjects: "academics",
  "grade-level-subjects": "academics",
  "term-subject-offerings": "academics",
  "timetable-entries": "academics",
  "grading-policies": "academics",
  "grading-policy-components": "academics",
  "exam-periods": "academics",
  "exam-assessments": "academics",
  "student-exam-scores": "academics",
  "homework-types": "academics",
  homeworks: "academics",
  "student-homeworks": "academics",
  "monthly-grades": "academics",
  "monthly-custom-component-scores": "academics",
  "annual-statuses": "academics",
  "promotion-decisions": "academics",
  "grading-outcome-rules": "academics",
  "semester-grades": "academics",
  "annual-grades": "academics",
  "annual-results": "academics",
  "grading-reports": "academics",
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "جميع الأنظمة",
  settings: "الإعدادات والنظام",
  lookups: "المراجع والتقاويم",
  hr: "شؤون الموظفين",
  students: "شؤون الطلاب",
  academics: "الأكاديميات والدرجات",
};

const ACTION_LABELS: Record<string, string> = {
  all: "جميع الإجراءات",
  create: "صلاحيات الإضافة",
  read: "صلاحيات العرض",
  update: "صلاحيات التعديل",
  delete: "صلاحيات الحذف",
  manage: "إدارة وعمليات متقدمة", // Covers manage, assign-permissions, calculate, lock, etc.
};

function categorizeAction(actionCode: string) {
  if (["create", "read", "update", "delete"].includes(actionCode)) return actionCode;
  return "manage";
}

function getActionStyles(actionPart: string, isSelected: boolean) {
  // Ultra Deluxe luxurious stylings with smooth gradients
  if (isSelected) {
    if (actionPart === "create") return "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-400 ring-1 ring-emerald-500/50";
    if (actionPart === "read") return "bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)] border-sky-400 ring-1 ring-blue-500/50";
    if (actionPart === "update") return "bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.3)] border-amber-400 ring-1 ring-amber-500/50";
    if (actionPart === "delete" || actionPart === "revoke") return "bg-gradient-to-r from-red-500 to-rose-400 text-white shadow-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)] border-rose-400 ring-1 ring-red-500/50";
    return "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)] border-indigo-400 ring-1 ring-indigo-500/50";
  }

  // Not selected - sophisticated glassmorphic defaults
  if (actionPart === "create") return "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 dark:text-emerald-400 transition-all";
  if (actionPart === "read") return "bg-blue-500/5 text-blue-600 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40 dark:text-blue-400 transition-all";
  if (actionPart === "update") return "bg-amber-500/5 text-amber-600 border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40 dark:text-amber-400 transition-all";
  if (actionPart === "delete" || actionPart === "revoke") return "bg-red-500/5 text-red-600 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 dark:text-red-400 transition-all";
  return "bg-indigo-500/5 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/10 hover:border-indigo-500/40 dark:text-indigo-400 transition-all";
}

export function PermissionsSelector({
  permissions,
  selectedIds,
  onChange,
  disabled,
}: PermissionsSelectorProps) {
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [actionFilter, setActionFilter] = React.useState("all");
  // Track which details elements are open
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});
  // Track popover open states
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isActionsOpen, setIsActionsOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState<"select" | "clear" | null>(null);
  
  const filterRef = React.useRef<HTMLDivElement>(null);
  const actionsRef = React.useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false);
        setConfirmAction(null);
      }
    }
    if (isFilterOpen || isActionsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen, isActionsOpen]);

  const groups = React.useMemo(() => {
    const map = new Map<string, PermissionListItem[]>();
    for (const p of permissions) {
      const [resource] = p.code.split(".", 1);
      
      const cat = RESOURCE_CATEGORIES[resource] || "settings";
      if (categoryFilter !== "all" && cat !== categoryFilter) continue;

      const [, actionPart] = p.code.split(".", 2);
      const actionCat = categorizeAction(actionPart);
      if (actionFilter !== "all" && actionCat !== actionFilter) continue;

      const list = map.get(resource) ?? [];
      list.push(p);
      map.set(resource, list);
    }

    return Array.from(map.entries()).map(([resource, perms]) => ({
      resource,
      label: PERMISSION_RESOURCE_LABELS[resource] ?? resource,
      permissions: perms,
    })).sort((a, b) => a.label.localeCompare(b.label, "ar"));
  }, [permissions, categoryFilter, actionFilter]);

  const filteredGroups = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return groups;

    return groups.map((g) => {
      const groupMatches = g.label.toLowerCase().includes(keyword) || g.resource.toLowerCase().includes(keyword);
      if (groupMatches) return g;

      const matchingPerms = g.permissions.filter((p) => {
        const pLabel = translatePermissionCode(p.code).toLowerCase();
        return pLabel.includes(keyword) || p.code.toLowerCase().includes(keyword);
      });

      if (matchingPerms.length > 0) {
        return { ...g, permissions: matchingPerms };
      }

      return null;
    }).filter(Boolean) as typeof groups;
  }, [groups, search]);

  const handleTogglePermission = (id: string, isCurrentlySelected: boolean) => {
    if (disabled) return;
    if (isCurrentlySelected) {
      onChange(selectedIds.filter((existing) => existing !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleToggleGroup = (groupIds: string[], isAllSelected: boolean) => {
    if (disabled) return;
    if (isAllSelected) {
      const set = new Set(groupIds);
      onChange(selectedIds.filter((id) => !set.has(id)));
    } else {
      const newIds = new Set(selectedIds);
      for (const id of groupIds) newIds.add(id);
      onChange(Array.from(newIds));
    }
  };

   const handleSelectAll = () => {
    if (disabled) return;
    onChange(permissions.map((p) => p.id));
    setConfirmAction(null);
    setIsActionsOpen(false);
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    onChange([]);
    setConfirmAction(null);
    setIsActionsOpen(false);
  };

  const hasActiveFilters = search.trim() !== "" || categoryFilter !== "all" || actionFilter !== "all";
  const activeFiltersCount = (categoryFilter !== "all" ? 1 : 0) + (actionFilter !== "all" ? 1 : 0);

  React.useEffect(() => {
    if (hasActiveFilters) {
      const allOpen: Record<string, boolean> = {};
      for (const g of filteredGroups) {
        allOpen[g.resource] = true;
      }
      setOpenGroups(allOpen);
    }
  }, [search, filteredGroups, categoryFilter, actionFilter, hasActiveFilters]);

  // Total visible permissions counter
  const totalVisiblePermissionsCount = filteredGroups.reduce((acc, current) => acc + current.permissions.length, 0);
  const totalVisiblePermissionsIdsList = filteredGroups.flatMap(g => g.permissions.map(x => x.id));
  const selectedVisibleCount = totalVisiblePermissionsIdsList.filter(id => selectedIds.includes(id)).length;

  return (
    <div className="space-y-4 font-sans antialiased relative">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-white/10 dark:bg-black/10 p-3 shadow-lg backdrop-blur-3xl relative z-50">
        <div className="flex items-center gap-2 relative">
           <SearchField
              containerClassName="flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن صلاحية، نظام أو إجراء..."
           />
           
           <div className="relative" ref={filterRef}>
             <button
               type="button"
               onClick={() => setIsFilterOpen(!isFilterOpen)}
               className={cn(
                 "flex h-10 items-center justify-center gap-2 rounded-xl border px-3 transition-all duration-300 backdrop-blur-md",
                 activeFiltersCount > 0 
                   ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]" 
                   : "bg-background/40 border-border/50 text-muted-foreground hover:bg-background/80 hover:text-foreground hover:border-border/80"
               )}
             >
               <SlidersHorizontal className="h-4 w-4" />
               <span className="hidden sm:inline text-sm font-semibold">تصفية</span>
               {activeFiltersCount > 0 && (
                 <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                   {activeFiltersCount}
                 </span>
               )}
             </button>

             {/* Reverted to Deluxe Glassmorphic Filter Popover - Small & Elegant */}
             {isFilterOpen && (
               <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-3 w-[280px] rounded-2xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 p-5 shadow-2xl backdrop-blur-3xl z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 origin-top">
                 <div className="absolute -top-2 left-4 sm:left-auto sm:right-6 w-4 h-4 bg-white/80 dark:bg-slate-950/80 rotate-45 border-l border-t border-white/40 dark:border-white/10" />
                 
                 <div className="flex items-center gap-2 mb-5 pb-2 border-b border-primary/20 text-foreground relative">
                   <Settings2 className="h-4 w-4 text-primary animate-pulse" />
                   <h4 className="font-bold text-sm tracking-tight text-primary">إعدادات التصفية</h4>
                 </div>
                 
                 <div className="space-y-5 relative">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-primary/70 px-1">حسب النظام</label>
                     <div className="relative group">
                       <select
                         className="h-10 w-full rounded-xl border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/40 px-3 text-xs font-bold shadow-inner backdrop-blur-xl transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer text-right outline-none group-hover:bg-white/60 dark:group-hover:bg-black/60"
                         value={categoryFilter}
                         onChange={(e) => setCategoryFilter(e.target.value)}
                       >
                         {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                           <option key={key} value={key} className="bg-background text-foreground text-sm font-medium">{label}</option>
                         ))}
                       </select>
                       <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/50 pointer-events-none transition-transform group-hover:translate-y-[calc(-50%+1px)]" />
                     </div>
                   </div>
                   
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-primary/70 px-1">حسب الإجراء</label>
                     <div className="relative group">
                       <select
                         className="h-10 w-full rounded-xl border border-white/50 dark:border-white/10 bg-white/40 dark:bg-black/40 px-3 text-xs font-bold shadow-inner backdrop-blur-xl transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer text-right outline-none group-hover:bg-white/60 dark:group-hover:bg-black/60"
                         value={actionFilter}
                         onChange={(e) => setActionFilter(e.target.value)}
                       >
                         {Object.entries(ACTION_LABELS).map(([key, label]) => (
                           <option key={key} value={key} className="bg-background text-foreground text-sm font-medium">{label}</option>
                         ))}
                       </select>
                       <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/50 pointer-events-none transition-transform group-hover:translate-y-[calc(-50%+1px)]" />
                     </div>
                   </div>
                   
                   <button
                     type="button"
                     onClick={() => { setCategoryFilter("all"); setActionFilter("all"); setIsFilterOpen(false); }}
                     className="w-full mt-2 rounded-xl bg-primary/10 hover:bg-primary/20 py-2.5 text-xs font-black text-primary transition-all duration-300 flex items-center justify-center gap-2 border border-primary/20 hover:border-primary/40"
                   >
                     <RefreshCw className="h-3.5 w-3.5" /> مسح كافة الفلاتر
                   </button>
                 </div>
               </div>
             )}
           </div>

            <div className="relative" ref={actionsRef}>
             <button
               type="button"
               onClick={() => { setIsActionsOpen(!isActionsOpen); setConfirmAction(null); }}
               className={cn(
                 "flex h-10 items-center justify-center gap-2 rounded-xl border px-3 transition-all duration-300 backdrop-blur-md",
                 isActionsOpen 
                   ? "bg-slate-900/10 border-slate-900/30 text-slate-900 dark:bg-white/10 dark:border-white/30 dark:text-white"
                   : "bg-background/40 border-border/50 text-muted-foreground hover:bg-background/80 hover:text-foreground hover:border-border/80"
               )}
             >
               <Zap className="h-4 w-4" />
               <span className="hidden sm:inline text-sm font-semibold">إجراءات</span>
             </button>

             {/* Deluxe Bulk Actions Popover */}
             {isActionsOpen && (
               <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-3 w-[260px] rounded-2xl border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 p-5 shadow-2xl backdrop-blur-3xl z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 origin-top">
                 <div className="absolute -top-2 left-4 sm:left-auto sm:right-6 w-4 h-4 bg-white/80 dark:bg-slate-950/80 rotate-45 border-l border-t border-white/40 dark:border-white/10" />
                 
                 <div className="flex items-center gap-2 mb-4 pb-2 border-b border-primary/20 text-foreground relative">
                   <Zap className="h-4 w-4 text-indigo-500" />
                   <h4 className="font-bold text-sm tracking-tight text-indigo-500">إجراءات سريعة</h4>
                 </div>

                 {confirmAction === null ? (
                   <div className="space-y-2 relative">
                     <button
                       type="button"
                       onClick={() => setConfirmAction("select")}
                       className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/5 hover:bg-slate-900/10 dark:bg-white/5 dark:hover:bg-white/10 transition-all text-right group"
                     >
                       <div className="flex flex-col">
                         <span className="text-[13px] font-bold">تحديد الكل</span>
                         <span className="text-[10px] text-muted-foreground">اختيار كافة الصلاحيات المتاحة</span>
                       </div>
                       <CheckCircle2 className="h-5 w-5 text-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                     </button>
                     
                     <button
                       type="button"
                       onClick={() => setConfirmAction("clear")}
                       className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-all text-right group"
                     >
                       <div className="flex flex-col">
                         <span className="text-[13px] font-bold text-red-500">تصفير الكل</span>
                         <span className="text-[10px] text-red-400">إزالة جميع الصلاحيات المختارة</span>
                       </div>
                       <RefreshCw className="h-5 w-5 text-red-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                     </button>
                   </div>
                 ) : (
                   <div className="space-y-4 relative animate-in fade-in slide-in-from-right-2">
                     <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                       <div className="flex items-center gap-2 mb-1">
                         <AlertTriangle className="h-4 w-4" />
                         <span className="text-[13px] font-extrabold text-right">تحذير!</span>
                       </div>
                       <p className="text-[11px] font-bold leading-relaxed text-right">
                         {confirmAction === "select" 
                           ? "سيتم منح كافة الصلاحيات لهذا الدور، هل أنت متأكد؟" 
                           : "سيتم حذف كافة الصلاحيات المحددة، ستحتاج لإعادة اختيارها يدوياً!"}
                       </p>
                     </div>
                     <div className="flex items-center gap-2">
                       <button
                         type="button"
                         onClick={confirmAction === "select" ? handleSelectAll : handleDeselectAll}
                         className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1"
                       >
                         <Check className="h-3.5 w-3.5" /> نعم، متأكد
                       </button>
                       <button
                         type="button"
                         onClick={() => setConfirmAction(null)}
                         className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2 px-3 rounded-lg text-xs active:scale-95 transition-all flex items-center justify-center gap-1"
                       >
                         <CloseIcon className="h-3.5 w-3.5" /> تراجع
                       </button>
                     </div>
                   </div>
                 )}
               </div>
             )}
           </div>
        </div>

        {!disabled && (
          <div className="flex items-center justify-between border-t border-border/20 pt-3">
             <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-slate-900/5 dark:bg-white/5 border border-border/30 px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-inner">
                   <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
                   <span>محدد ({selectedVisibleCount} / {totalVisiblePermissionsCount})</span>
                </div>
             </div>
             <p className="text-[10px] font-bold text-muted-foreground opacity-60 italic">
                 تأكد من مراجعة الصلاحيات بعناية
             </p>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/30 dark:border-white/10 bg-white/30 dark:bg-black/20 overflow-hidden shadow-2xl relative backdrop-blur-[40px]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-primary/10 to-pink-500/10 pointer-events-none" />
        
        {filteredGroups.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-4 bg-transparent">
            <div className="relative">
               <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full" />
               <Filter className="h-12 w-12 text-primary/60 drop-shadow-md relative" />
            </div>
            <div className="space-y-1">
               <p className="font-bold text-lg text-foreground/80">لم نجد أية صلاحيات!</p>
               <p className="text-xs font-medium opacity-70">يبدو أن الفلاتر المختارة لا تتطابق مع أي نتيجة.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto custom-scrollbar relative z-10 scroll-smooth">
            {filteredGroups.map((group) => {
              const groupIds = group.permissions.map((p) => p.id);
              const selectedInGroupCount = groupIds.filter((id) => selectedIds.includes(id)).length;
              const isAllSelected = selectedInGroupCount === groupIds.length;
              const isIndeterminate = selectedInGroupCount > 0 && !isAllSelected;
              const isOpen = hasActiveFilters ? true : openGroups[group.resource];

              return (
                <details
                  key={group.resource}
                  className="group/details bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-colors duration-300 relative border-b border-white/20 dark:border-white/5 last:border-b-0 backdrop-blur-md"
                  open={isOpen}
                  onToggle={(e) => {
                    const el = e.currentTarget;
                    setOpenGroups((prev) => ({ ...prev, [group.resource]: el.open }));
                  }}
                >
                  <summary className="flex cursor-pointer select-none items-center justify-between p-4 list-none marker:hidden [&::-webkit-details-marker]:hidden focus:outline-none focus:bg-primary/5 dark:focus:bg-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20 shadow-inner group-open/details:from-primary group-open/details:to-primary/80 group-open/details:text-primary-foreground group-open/details:shadow-primary/30 group-open/details:shadow-lg transform group-open/details:scale-105 transition-all duration-300">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[15px] font-extrabold text-foreground/90 group-open/details:text-primary group-open/details:drop-shadow-sm transition-all duration-300">{group.label}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                           <div className="h-1.5 w-1.5 rounded-full bg-primary/40 group-open/details:bg-primary/80 transition-colors" />
                           <p className="text-[11px] font-bold text-muted-foreground group-open/details:text-primary/70">
                             {selectedInGroupCount} من {groupIds.length} محددة
                           </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      {!disabled && (
                         <button 
                           type="button"
                           onClick={(e) => {
                               e.stopPropagation();
                               handleToggleGroup(groupIds, isAllSelected);
                           }}
                           className="flex items-center gap-2 px-3 py-2 font-bold rounded-xl bg-background/40 border border-border/50 shadow-sm hover:bg-background hover:shadow-md hover:border-border/80 transition-all active:scale-[0.98]"
                         >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary cursor-pointer rounded border-white/20 pointer-events-none"
                              checked={isAllSelected}
                              ref={(input) => {
                                if (input) {
                                  input.indeterminate = isIndeterminate;
                                }
                              }}
                              readOnly
                            />
                            <span className="hidden sm:inline text-xs text-slate-700 dark:text-slate-300">الكل</span>
                         </button>
                      )}
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/30 border border-white/10 group-open/details:bg-primary/10 group-open/details:border-primary/20 transition-colors">
                        <ChevronDown className="h-5 w-5 text-muted-foreground/60 transition-transform duration-500 group-open/details:rotate-180 group-open/details:text-primary" />
                      </div>
                    </div>
                  </summary>

                  <div className="p-4 pt-4 border-t border-white/20 dark:border-white/10 bg-white/20 dark:bg-black/30 shadow-[inset_0_4px_20px_rgba(0,0,0,0.02)] backdrop-blur-xl">
                     <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3">
                       {group.permissions.map((p) => {
                         const isSelected = selectedIds.includes(p.id);
                         const [, actionPart] = p.code.split(".", 2);
                         const actionLabel = PERMISSION_ACTION_LABELS[actionPart] ?? actionPart;
                         const colorStyles = getActionStyles(actionPart, isSelected);

                         return (
                           <button
                             key={p.id}
                             type="button"
                             disabled={disabled}
                             onClick={() => handleTogglePermission(p.id, isSelected)}
                             className={cn(
                               "flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2.5 sm:py-3 rounded-xl border text-[12px] sm:text-[13px] font-extrabold transition-all duration-300 text-right group/btn backdrop-blur-xl relative overflow-hidden",
                               colorStyles,
                               disabled && "opacity-50 cursor-not-allowed grayscale",
                               !isSelected && "hover:shadow-lg hover:-translate-y-0.5",
                               isSelected && "scale-[1.02]"
                             )}
                           >
                             <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                             <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden z-10 w-full">
                               <div className={cn(
                                   "h-2 w-2 rounded-full shrink-0 shadow-sm transition-all duration-300",
                                   isSelected ? "bg-white shadow-white/50" : "bg-current opacity-40 group-hover/btn:opacity-100 group-hover/btn:scale-125"
                               )} />
                               <span className="truncate tracking-wide drop-shadow-sm leading-tight text-right w-full">{actionLabel}</span>
                             </div>
                             {isSelected && (
                               <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 drop-shadow-md z-10 text-white" />
                             )}
                           </button>
                         )
                       })}
                     </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
