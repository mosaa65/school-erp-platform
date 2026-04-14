"use client";

import * as React from "react";
import {
  CalendarClock,
  Eye,
  Layers3,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  UserRound,
  Workflow,
} from "lucide-react";
import { SystemMessageInline } from "@/components/feedback/system-message-inline";
import { Badge } from "@/components/ui/badge";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import {
  useAuditLogDetailsQuery,
  useAuditLogRetentionPolicyQuery,
  useAuditLogTimelineQuery,
  useAuditLogsQuery,
} from "@/features/audit-logs/hooks/use-audit-logs-query";
import { useSystemMessage } from "@/hooks/use-system-message";
import {
  useRollbackAuditLogMutation,
  useUpdateAuditLogRetentionPolicyMutation,
} from "@/features/audit-logs/hooks/use-audit-logs-mutations";
import type {
  AuditRollbackMode,
  AuditLogListItem,
  AuditLogTimelineItem,
  AuditStatus,
} from "@/lib/api/client";
import { resolveSystemMessageIconVisibility } from "@/theme/system-message-tokens";

type ActionFilterValue =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "EXPORT"
  | "APPROVE"
  | "REJECT";

type DomainFilterValue =
  | "attendance"
  | "grades"
  | "fees"
  | "students"
  | "teachers"
  | "permissions"
  | "notifications"
  | "system";

type DomainDisplayValue = DomainFilterValue | "general";

type DraftFilters = {
  search: string;
  actionType: "all" | ActionFilterValue;
  domain: "all" | DomainFilterValue;
  user: string;
  status: "all" | AuditStatus;
  fromDate: string;
  toDate: string;
};

type AppliedFilters = {
  search?: string;
  actionType?: ActionFilterValue;
  domain?: DomainFilterValue;
  user?: string;
  status?: AuditStatus;
  from?: string;
  to?: string;
};

type ParsedAuditDetails = {
  description?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  outcome?: string;
  errorMessage?: string;
  actorRoleCodes: string[];
  requestContext?: Record<string, unknown>;
  technicalExtras?: Record<string, unknown>;
};

const PAGE_SIZE = 15;
const RETENTION_MIN_DAYS_FALLBACK = 7;
const RETENTION_MAX_DAYS_FALLBACK = 3650;
const RETENTION_RECOMMENDED_DAYS_FALLBACK = 365;

const KNOWN_ACTION_VERBS = new Set([
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "UNAPPROVE",
  "LOGIN",
  "LOGOUT",
  "RESET_PASSWORD",
  "ASSIGN",
  "REVOKE",
  "IMPORT",
  "EXPORT",
]);

const ACTION_TYPE_LABELS: Record<string, string> = {
  CREATE: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
  LOGIN: "تسجيل دخول",
  LOGOUT: "تسجيل خروج",
  IMPORT: "استيراد",
  EXPORT: "تصدير",
  APPROVE: "اعتماد",
  REJECT: "إلغاء اعتماد",
  UNAPPROVE: "إلغاء اعتماد",
  REVOKE: "إلغاء اعتماد",
};

const DOMAIN_LABELS: Record<DomainDisplayValue, string> = {
  attendance: "الحضور والغياب",
  grades: "الدرجات",
  fees: "الرسوم",
  students: "الطلاب",
  teachers: "المعلمين",
  permissions: "الصلاحيات",
  notifications: "الإشعارات",
  system: "النظام والإعدادات",
  general: "عام",
};

const DOMAIN_RESOURCE_KEYWORDS: Record<DomainFilterValue, string[]> = {
  attendance: ["attendance", "absence", "presence"],
  grades: ["grade", "grading", "assessment", "exam", "score", "subject"],
  fees: ["fee", "invoice", "installment", "billing", "payment", "finance"],
  students: ["student", "enrollment", "guardian"],
  teachers: ["teacher", "employee", "staff"],
  permissions: ["permission", "role", "auth"],
  notifications: ["notification", "reminder"],
  system: ["setting", "audit", "catalog"],
};

const RESOURCE_LABEL_MAP: Record<string, string> = {
  users: "المستخدمين",
  roles: "الأدوار",
  permissions: "الصلاحيات",
  students: "الطلاب",
  employees: "الموظفين",
  guardians: "أولياء الأمور",
  attendance: "الحضور والغياب",
  grades: "الدرجات",
  fees: "الرسوم",
  "academic-years": "السنوات الأكاديمية",
  "academic-terms": "الفصول الأكاديمية",
  "academic-months": "الأشهر الأكاديمية",
  "audit-logs": "سجل التدقيق",
  "audit-trail": "الأثر المالي",
  "global-settings": "الإعدادات العامة",
  "system-settings": "إعدادات النظام",
  "user-permissions": "صلاحيات المستخدمين",
  notifications: "الإشعارات",
  "finance/journal-entries": "القيود اليومية",
  "finance/revenues": "الإيرادات",
  "finance/expenses": "المصروفات",
};

const DEFAULT_DRAFT_FILTERS: DraftFilters = {
  search: "",
  actionType: "all",
  domain: "all",
  user: "",
  status: "all",
  fromDate: "",
  toDate: "",
};

const ACTION_FILTER_OPTIONS: Array<{
  value: ActionFilterValue;
  label: string;
}> = [
  { value: "CREATE", label: "إضافة" },
  { value: "UPDATE", label: "تعديل" },
  { value: "DELETE", label: "حذف" },
  { value: "LOGIN", label: "تسجيل دخول" },
  { value: "EXPORT", label: "تصدير" },
  { value: "APPROVE", label: "اعتماد" },
  { value: "REJECT", label: "إلغاء اعتماد" },
];

const DOMAIN_FILTER_OPTIONS: Array<{
  value: DomainFilterValue;
  label: string;
}> = [
  { value: "attendance", label: DOMAIN_LABELS.attendance },
  { value: "grades", label: DOMAIN_LABELS.grades },
  { value: "fees", label: DOMAIN_LABELS.fees },
  { value: "students", label: DOMAIN_LABELS.students },
  { value: "teachers", label: DOMAIN_LABELS.teachers },
  { value: "permissions", label: DOMAIN_LABELS.permissions },
  { value: "notifications", label: DOMAIN_LABELS.notifications },
  { value: "system", label: DOMAIN_LABELS.system },
];

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toIsoDateBoundary(
  localDate: string,
  boundary: "start" | "end",
): string | undefined {
  const normalized = localDate.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (boundary === "end") {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed.toISOString();
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("ar-EG");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickFirstValue(
  source: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }

  return undefined;
}

function pickFirstString(
  source: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      const normalized = value.trim();
      if (normalized) {
        return normalized;
      }
    }
  }

  return undefined;
}

function toErrorMessage(value: unknown): string | undefined {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || undefined;
  }

  if (isRecord(value)) {
    const direct = pickFirstString(value, ["message", "error", "reason"]);
    if (direct) {
      return direct;
    }
  }

  return undefined;
}

function formatDetails(value: unknown): string {
  if (value === undefined) {
    return "غير متوفر";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function inferActionVerb(action: string): string {
  const normalized = action.trim().toUpperCase();
  if (!normalized) {
    return "UNKNOWN";
  }

  if (KNOWN_ACTION_VERBS.has(normalized)) {
    return normalized;
  }

  const parts = normalized.split(/[_\s-]+/).filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

function translateAction(action: string): string {
  const verb = inferActionVerb(action);
  const mapped = ACTION_TYPE_LABELS[verb];
  if (mapped) {
    return mapped;
  }

  return verb.replace(/_/g, " ").toLowerCase();
}

function translateResource(resource: string): string {
  const normalized = resource.trim().toLowerCase();
  if (!normalized) {
    return "غير محدد";
  }

  return RESOURCE_LABEL_MAP[normalized] ?? normalized.replace(/[-_/]/g, " ");
}

function inferDomain(resource: string): DomainDisplayValue {
  const normalized = resource.trim().toLowerCase();
  if (!normalized) {
    return "general";
  }

  for (const [domain, keywords] of Object.entries(DOMAIN_RESOURCE_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return domain as DomainFilterValue;
    }
  }

  return "general";
}

function getActorLabel(log: AuditLogListItem): string {
  if (log.actorUser) {
    const fullName = `${log.actorUser.firstName} ${log.actorUser.lastName}`.trim();
    if (fullName) {
      return fullName;
    }

    return log.actorUser.email;
  }

  return log.actorUserId ?? "خدمة النظام";
}

function getActorRoles(
  log: AuditLogListItem,
  parsedRoleCodes: string[] = [],
): string {
  const roleNames =
    log.actorUser?.userRoles
      ?.map((entry) => entry.role.name?.trim() || entry.role.code?.trim())
      .filter((value): value is string => Boolean(value)) ?? [];

  if (roleNames.length > 0) {
    return roleNames.join("، ");
  }

  if (parsedRoleCodes.length > 0) {
    return parsedRoleCodes.join("، ");
  }

  return "غير متوفر";
}

function getActionNarrative(action: string, resourceLabel: string): string {
  const verb = inferActionVerb(action);
  const narrativeMap: Record<string, string> = {
    CREATE: `تمت إضافة ${resourceLabel}`,
    UPDATE: `تم تعديل ${resourceLabel}`,
    DELETE: `تم حذف ${resourceLabel}`,
    LOGIN: "تم تسجيل دخول المستخدم",
    LOGOUT: "تم تسجيل خروج المستخدم",
    IMPORT: `تم استيراد بيانات ${resourceLabel}`,
    EXPORT: `تم تصدير بيانات ${resourceLabel}`,
    APPROVE: `تم اعتماد ${resourceLabel}`,
    REJECT: `تم إلغاء اعتماد ${resourceLabel}`,
    UNAPPROVE: `تم إلغاء اعتماد ${resourceLabel}`,
    REVOKE: `تم إلغاء اعتماد ${resourceLabel}`,
    RESET_PASSWORD: "تمت إعادة تعيين كلمة المرور",
    ASSIGN: `تم إسناد ${resourceLabel}`,
  };

  return narrativeMap[verb] ?? `${translateAction(action)} على ${resourceLabel}`;
}

function buildExecutiveSummary(
  log: AuditLogListItem,
  parsedDetails?: ParsedAuditDetails,
): string {
  const actorLabel = getActorLabel(log);
  const resourceLabel = translateResource(log.resource);
  const domainLabel = DOMAIN_LABELS[inferDomain(log.resource)];
  const actionNarrative = getActionNarrative(log.action, resourceLabel);
  const baseSentence = `${actionNarrative} ضمن مجال ${domainLabel} بواسطة ${actorLabel}.`;

  if (log.status === "SUCCESS") {
    return `${baseSentence} النتيجة: ناجحة.`;
  }

  const failureReason = parsedDetails?.errorMessage ?? parsedDetails?.outcome;
  if (failureReason) {
    return `${baseSentence} النتيجة: فاشلة. السبب: ${failureReason}.`;
  }

  return `${baseSentence} النتيجة: فاشلة.`;
}

function parseAuditDetails(details: unknown): ParsedAuditDetails {
  if (!isRecord(details)) {
    return {
      actorRoleCodes: [],
    };
  }

  const beforeValue = pickFirstValue(details, [
    "before",
    "beforeData",
    "previous",
    "oldValue",
    "old",
    "dataBefore",
  ]);

  const afterValue = pickFirstValue(details, [
    "after",
    "afterData",
    "current",
    "newValue",
    "new",
    "dataAfter",
  ]);

  const description = pickFirstString(details, [
    "description",
    "summary",
    "changeSummary",
    "message",
    "event",
  ]);

  const outcome = pickFirstString(details, ["outcome", "result", "statusMessage"]);

  const errorCandidate = pickFirstValue(details, [
    "errorMessage",
    "failureReason",
    "reason",
    "error",
  ]);
  const errorMessage = toErrorMessage(errorCandidate);

  const roleCodesCandidate = pickFirstValue(details, [
    "actorRoleCodes",
    "actorRoles",
    "roleCodes",
  ]);
  const actorRoleCodes = Array.isArray(roleCodesCandidate)
    ? roleCodesCandidate
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  const requestContext = isRecord(details._requestContext)
    ? details._requestContext
    : undefined;

  const knownKeys = new Set([
    "before",
    "beforeData",
    "previous",
    "oldValue",
    "old",
    "dataBefore",
    "after",
    "afterData",
    "current",
    "newValue",
    "new",
    "dataAfter",
    "description",
    "summary",
    "changeSummary",
    "message",
    "event",
    "outcome",
    "result",
    "statusMessage",
    "errorMessage",
    "failureReason",
    "reason",
    "error",
    "actorRoleCodes",
    "actorRoles",
    "roleCodes",
    "_requestContext",
  ]);

  const technicalExtrasEntries = Object.entries(details).filter(
    ([key]) => !knownKeys.has(key),
  );
  const technicalExtras =
    technicalExtrasEntries.length > 0
      ? Object.fromEntries(technicalExtrasEntries)
      : undefined;

  return {
    description,
    beforeValue,
    afterValue,
    outcome,
    errorMessage,
    actorRoleCodes,
    requestContext,
    technicalExtras,
  };
}

function readContextValue(
  context: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!context) {
    return undefined;
  }

  const value = context[key];
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || undefined;
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  return String(value);
}

function buildTimelineChangeHint(parsedDetails: ParsedAuditDetails): string {
  const hasBefore = parsedDetails.beforeValue !== undefined;
  const hasAfter = parsedDetails.afterValue !== undefined;

  if (hasBefore && hasAfter) {
    return "يتضمن هذا السجل مقارنة مباشرة بين البيانات قبل وبعد التعديل.";
  }

  if (hasAfter) {
    return "السجل يحتوي على البيانات الناتجة بعد تنفيذ العملية.";
  }

  if (hasBefore) {
    return "السجل يحتوي على البيانات السابقة قبل تنفيذ العملية.";
  }

  if (parsedDetails.description) {
    return parsedDetails.description;
  }

  return "لا توجد بيانات مقارنة تفصيلية قبل/بعد لهذا السجل.";
}

function getTimelineMeta(log: AuditLogListItem) {
  const totalChanges = log.timeline?.totalChanges ?? 1;
  const previousChanges = log.timeline?.previousChanges ?? Math.max(totalChanges - 1, 0);
  const displayedChanges = log.timeline?.displayedChanges ?? Math.min(totalChanges, 10);

  return {
    totalChanges,
    previousChanges,
    displayedChanges,
    hasPreviousChanges: previousChanges > 0,
  };
}

function getErrorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-dashed border-border/70 p-3">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className={mono ? "text-sm font-medium font-mono" : "text-sm font-medium"}>
        {value}
      </div>
    </div>
  );
}

function JsonPanel({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <div className="rounded-md border border-dashed border-border/70 p-3">
      <p className="mb-2 text-xs text-muted-foreground">{title}</p>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground/90">
        {formatDetails(value)}
      </pre>
    </div>
  );
}

export function AuditLogsWorkspace() {
  const [page, setPage] = React.useState(1);
  const [draftFilters, setDraftFilters] = React.useState<DraftFilters>(
    DEFAULT_DRAFT_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = React.useState<AppliedFilters>({});
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [selectedLogId, setSelectedLogId] = React.useState<string | null>(null);
  const [rollbackLogId, setRollbackLogId] = React.useState<string | null>(null);
  const [selectedRollbackTargetId, setSelectedRollbackTargetId] = React.useState<
    string | null
  >(null);
  const [rollbackFeedback, setRollbackFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isRetentionPolicyOpen, setIsRetentionPolicyOpen] = React.useState(false);
  const [retentionEnabledDraft, setRetentionEnabledDraft] = React.useState(false);
  const [retentionDaysDraft, setRetentionDaysDraft] = React.useState(
    String(RETENTION_RECOMMENDED_DAYS_FALLBACK),
  );
  const [retentionFeedback, setRetentionFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const logsQuery = useAuditLogsQuery({
    page,
    limit: PAGE_SIZE,
    actionType: appliedFilters.actionType,
    domain: appliedFilters.domain,
    status: appliedFilters.status,
    user: appliedFilters.user,
    search: appliedFilters.search,
    from: appliedFilters.from,
    to: appliedFilters.to,
  });

  const detailsQuery = useAuditLogDetailsQuery(selectedLogId);
  const timelineQuery = useAuditLogTimelineQuery(selectedLogId, {
    limit: 10,
    enabled: Boolean(selectedLogId),
  });
  const rollbackTimelineQuery = useAuditLogTimelineQuery(rollbackLogId, {
    limit: 10,
    enabled: Boolean(rollbackLogId),
  });
  const retentionPolicyQuery = useAuditLogRetentionPolicyQuery({
    enabled: isRetentionPolicyOpen,
  });
  const rollbackMutation = useRollbackAuditLogMutation();
  const updateRetentionPolicyMutation = useUpdateAuditLogRetentionPolicyMutation();
  const { preferences } = useSystemMessage();

  const logs = React.useMemo(() => logsQuery.data?.data ?? [], [logsQuery.data?.data]);
  const pagination = logsQuery.data?.pagination;
  const retentionPolicy = updateRetentionPolicyMutation.data ?? retentionPolicyQuery.data;
  const visibleLogsCount = logs.length;
  const successLogsCount = React.useMemo(
    () => logs.filter((item) => item.status === "SUCCESS").length,
    [logs],
  );
  const failureLogsCount = React.useMemo(
    () => logs.filter((item) => item.status === "FAILURE").length,
    [logs],
  );

  const activeFiltersCount = React.useMemo(() => {
    return [
      appliedFilters.search ? 1 : 0,
      appliedFilters.actionType ? 1 : 0,
      appliedFilters.domain ? 1 : 0,
      appliedFilters.user ? 1 : 0,
      appliedFilters.status ? 1 : 0,
      appliedFilters.from ? 1 : 0,
      appliedFilters.to ? 1 : 0,
    ].reduce((total, current) => total + current, 0);
  }, [appliedFilters]);

  const appliedFilterBadges = React.useMemo(() => {
    const items: string[] = [];
    if (appliedFilters.search) {
      items.push(`بحث: ${appliedFilters.search}`);
    }
    if (appliedFilters.user) {
      items.push(`مستخدم: ${appliedFilters.user}`);
    }
    if (appliedFilters.actionType) {
      items.push(
        `العملية: ${ACTION_FILTER_OPTIONS.find((option) => option.value === appliedFilters.actionType)?.label ?? appliedFilters.actionType}`,
      );
    }
    if (appliedFilters.domain) {
      items.push(
        `المجال: ${DOMAIN_FILTER_OPTIONS.find((option) => option.value === appliedFilters.domain)?.label ?? appliedFilters.domain}`,
      );
    }
    if (appliedFilters.status) {
      items.push(`الحالة: ${appliedFilters.status === "SUCCESS" ? "ناجحة" : "فاشلة"}`);
    }
    if (draftFilters.fromDate) {
      items.push(`من: ${draftFilters.fromDate}`);
    }
    if (draftFilters.toDate) {
      items.push(`إلى: ${draftFilters.toDate}`);
    }
    return items;
  }, [appliedFilters, draftFilters.fromDate, draftFilters.toDate]);

  const inlineMessageProps = React.useMemo(
    () => ({
      colorMode: preferences.colorMode,
      densityPreset: preferences.densityPreset,
      variant: preferences.variant,
      dismissible: false,
    }),
    [preferences.colorMode, preferences.densityPreset, preferences.variant],
  );

  const resolveInlineIcon = React.useCallback(
    (tone: "success" | "error" | "warning" | "info" | "neutral" | "loading", hasAction = false) =>
      resolveSystemMessageIconVisibility(preferences.iconMode, tone, hasAction),
    [preferences.iconMode],
  );

  const selectedLogFromList = React.useMemo(() => {
    if (!selectedLogId) {
      return null;
    }

    return logs.find((item) => item.id === selectedLogId) ?? null;
  }, [logs, selectedLogId]);

  const selectedLog = detailsQuery.data ?? selectedLogFromList;
  const timelineItems = React.useMemo(
    () => timelineQuery.data?.data ?? [],
    [timelineQuery.data?.data],
  );
  const rollbackTimelineItems = React.useMemo(
    () => rollbackTimelineQuery.data?.data ?? [],
    [rollbackTimelineQuery.data?.data],
  );

  React.useEffect(() => {
    if (!rollbackLogId) {
      return;
    }

    if (selectedRollbackTargetId) {
      return;
    }

    const initialTargetId = rollbackTimelineItems[1]?.id ?? rollbackTimelineItems[0]?.id;
    if (initialTargetId) {
      setSelectedRollbackTargetId(initialTargetId);
    }
  }, [rollbackLogId, rollbackTimelineItems, selectedRollbackTargetId]);

  React.useEffect(() => {
    if (!isRetentionPolicyOpen) {
      return;
    }

    if (!retentionPolicy) {
      return;
    }

    setRetentionEnabledDraft(retentionPolicy.autoDeleteEnabled);
    setRetentionDaysDraft(
      String(
        retentionPolicy.retentionDays ??
          retentionPolicy.recommendedRetentionDays ??
          RETENTION_RECOMMENDED_DAYS_FALLBACK,
      ),
    );
  }, [
    isRetentionPolicyOpen,
    retentionPolicy,
    retentionPolicy?.autoDeleteEnabled,
    retentionPolicy?.retentionDays,
    retentionPolicy?.recommendedRetentionDays,
  ]);

  const parsedDetails = React.useMemo(
    () => parseAuditDetails(selectedLog?.details),
    [selectedLog?.details],
  );

  const contextRequestId = readContextValue(parsedDetails.requestContext, "requestId");
  const contextCorrelationId = readContextValue(
    parsedDetails.requestContext,
    "correlationId",
  );
  const contextMethod = readContextValue(parsedDetails.requestContext, "method");
  const contextPath = readContextValue(parsedDetails.requestContext, "path");
  const previousRollbackItem = rollbackTimelineItems[1] ?? null;
  const selectedRollbackItem = React.useMemo(
    () =>
      rollbackTimelineItems.find((item) => item.id === selectedRollbackTargetId) ??
      null,
    [rollbackTimelineItems, selectedRollbackTargetId],
  );

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      search: toOptionalString(draftFilters.search),
      actionType:
        draftFilters.actionType === "all" ? undefined : draftFilters.actionType,
      domain: draftFilters.domain === "all" ? undefined : draftFilters.domain,
      user: toOptionalString(draftFilters.user),
      status: draftFilters.status === "all" ? undefined : draftFilters.status,
      from: toIsoDateBoundary(draftFilters.fromDate, "start"),
      to: toIsoDateBoundary(draftFilters.toDate, "end"),
    });
    setIsFilterOpen(false);
  };

  const handleToolbarSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPage(1);
    setDraftFilters((prev) => ({ ...prev, search: value }));
    setAppliedFilters((prev) => ({
      ...prev,
      search: toOptionalString(value),
    }));
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_DRAFT_FILTERS);
    setAppliedFilters({});
    setPage(1);
    setIsFilterOpen(false);
  };

  const closeDetails = () => {
    setSelectedLogId(null);
  };

  const openRollbackSheet = (logId: string) => {
    setRollbackLogId(logId);
    setSelectedRollbackTargetId(null);
    setRollbackFeedback(null);
  };

  const closeRollbackSheet = () => {
    setRollbackLogId(null);
    setSelectedRollbackTargetId(null);
    setRollbackFeedback(null);
  };

  const submitRollback = async (mode: AuditRollbackMode) => {
    if (!rollbackLogId) {
      return;
    }

    if (mode === "TARGET" && !selectedRollbackTargetId) {
      setRollbackFeedback({
        type: "error",
        message: "اختر التغيير الذي تريد التراجع إليه أولًا.",
      });
      return;
    }

    setRollbackFeedback(null);

    try {
      const payload =
        mode === "PREVIOUS"
          ? { mode: "PREVIOUS" as const }
          : {
              mode: "TARGET" as const,
              targetAuditLogId: selectedRollbackTargetId ?? undefined,
            };

      const result = await rollbackMutation.mutateAsync({
        auditLogId: rollbackLogId,
        payload,
      });

      setRollbackFeedback({
        type: "success",
        message:
          mode === "PREVIOUS"
            ? "تم التراجع إلى التغيير السابق بنجاح."
            : `تم التراجع إلى التغيير المحدد (#${result.targetAuditLogId}) بنجاح.`,
      });

      void logsQuery.refetch();
      void rollbackTimelineQuery.refetch();

      if (selectedLogId) {
        void detailsQuery.refetch();
        void timelineQuery.refetch();
      }
    } catch (error) {
      setRollbackFeedback({
        type: "error",
        message: getErrorText(error, "تعذر تنفيذ التراجع. تحقق من صلاحياتك أو بيانات السجل."),
      });
    }
  };

  const retentionMinDays =
    retentionPolicy?.minRetentionDays ?? RETENTION_MIN_DAYS_FALLBACK;
  const retentionMaxDays =
    retentionPolicy?.maxRetentionDays ?? RETENTION_MAX_DAYS_FALLBACK;
  const retentionSummaryText = retentionPolicy
    ? retentionPolicy.autoDeleteEnabled
      ? `الحذف التلقائي بعد ${retentionPolicy.retentionDays} يوم`
      : "الحذف التلقائي معطّل"
    : "سياسة الحذف التلقائي";

  const openRetentionPolicySheet = () => {
    setRetentionFeedback(null);
    setIsRetentionPolicyOpen(true);
  };

  const closeRetentionPolicySheet = () => {
    setRetentionFeedback(null);
    setIsRetentionPolicyOpen(false);
  };

  const handleRefresh = async () => {
    await logsQuery.refetch();
    if (selectedLogId) {
      void detailsQuery.refetch();
      void timelineQuery.refetch();
    }
  };

  const submitRetentionPolicy = async () => {
    if (retentionEnabledDraft) {
      const parsedDays = Number(retentionDaysDraft);
      if (
        !Number.isInteger(parsedDays) ||
        parsedDays < retentionMinDays ||
        parsedDays > retentionMaxDays
      ) {
        setRetentionFeedback({
          type: "error",
          message: `أدخل مدة صحيحة بين ${retentionMinDays} و ${retentionMaxDays} يومًا.`,
        });
        return;
      }

      try {
        await updateRetentionPolicyMutation.mutateAsync({
          retentionDays: parsedDays,
        });
        setRetentionFeedback({
          type: "success",
          message: `تم تحديث سياسة الحذف التلقائي إلى ${parsedDays} يوم بنجاح.`,
        });
      } catch (error) {
        setRetentionFeedback({
          type: "error",
          message: getErrorText(error, "تعذر حفظ سياسة الحذف التلقائي."),
        });
      }

      return;
    }

    try {
      await updateRetentionPolicyMutation.mutateAsync({
        retentionDays: null,
      });
      setRetentionFeedback({
        type: "success",
        message: "تم تعطيل الحذف التلقائي لسجل التدقيق.",
      });
    } catch (error) {
      setRetentionFeedback({
        type: "error",
        message: getErrorText(error, "تعذر حفظ سياسة الحذف التلقائي."),
      });
    }
  };

  return (
    <>
      <PageShell
      title="سجل التدقيق"
      subtitle="واجهة إدارية أوضح لتتبع العمليات، مراجعة التغييرات، والتحكم في الاحتفاظ بالسجلات دون ازدحام بصري."
      eyebrow="Audit Log"
      actions={
        <>
          <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={openRetentionPolicySheet}
            data-testid="audit-log-open-retention-policy"
          >
            <Settings2 className="h-4 w-4" />
            سياسة الحذف التلقائي
          </Button>
        </>
      }
    >
        <div className="space-y-4">
        <ManagementToolbar
          searchValue={draftFilters.search}
          onSearchChange={handleToolbarSearchChange}
          searchPlaceholder="ابحث بالمستخدم أو العملية أو المورد أو معرف السجل..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
          filterButtonTestId="audit-log-open-filters"
          actions={
            <>
              <Badge variant="outline">الأحدث أولًا</Badge>
              <Badge variant={retentionPolicy?.autoDeleteEnabled ? "secondary" : "outline"}>
                {retentionSummaryText}
              </Badge>
              {logsQuery.isFetching && !logsQuery.isPending ? (
                <Badge variant="outline" className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  تحديث تدريجي...
                </Badge>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => void handleRefresh()}
                disabled={logsQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${logsQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </>
          }
        />

        {activeFiltersCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-[color:var(--app-accent-strong)]/25 bg-[color:var(--app-accent-soft)]/30 px-4 py-3">
            <span className="text-xs font-semibold text-[color:var(--app-accent-color)]">
              الفلاتر المطبقة
            </span>
            {appliedFilterBadges.map((label) => (
              <Badge key={label} variant="outline" className="max-w-full truncate">
                {label}
              </Badge>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ms-auto"
              onClick={clearFilters}
            >
              مسح الكل
            </Button>
          </div>
        ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-[color:var(--app-accent-strong)]/25 bg-gradient-to-br from-[color:var(--app-accent-soft)]/35 via-background/95 to-background/85">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted-foreground">السجلات المعروضة</p>
              <p className="text-2xl font-semibold">{visibleLogsCount}</p>
              <p className="text-xs text-muted-foreground">الصفحة الحالية من نتائج البحث والفلترة.</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-emerald-500/[0.04]">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted-foreground">عمليات ناجحة</p>
              <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
                {successLogsCount}
              </p>
              <p className="text-xs text-muted-foreground">عدد السجلات الناجحة في الصفحة الحالية.</p>
            </CardContent>
          </Card>
          <Card className="border-rose-500/20 bg-rose-500/[0.04]">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted-foreground">عمليات فاشلة</p>
              <p className="text-2xl font-semibold text-rose-700 dark:text-rose-300">
                {failureLogsCount}
              </p>
              <p className="text-xs text-muted-foreground">تحتاج متابعة أو تحقيق أدق.</p>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/78">
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted-foreground">الاحتفاظ التلقائي</p>
              <p className="text-lg font-semibold">{retentionSummaryText}</p>
              <p className="text-xs text-muted-foreground">يمكن تعديل السياسة من الزر أعلى الصفحة.</p>
            </CardContent>
          </Card>
        </div>

          <FilterDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="فلترة سجل التدقيق"
        actionButtons={
          <FilterDrawerActions
            onClear={clearFilters}
            onApply={applyFilters}
            clearTestId="audit-log-filters-clear"
            applyTestId="audit-log-filters-apply"
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="بحث نصي">
            <Input
              icon={<Search />}
              placeholder="عملية، مستخدم، مورد، أو رقم سجل"
              value={draftFilters.search}
              data-testid="audit-log-filter-search"
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
          </FormField>
          <FormField label="المستخدم">
            <Input
              icon={<UserRound />}
              placeholder="اسم، بريد، أو معرف"
              value={draftFilters.user}
              data-testid="audit-log-filter-user"
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, user: event.target.value }))
              }
            />
          </FormField>
          <FormField label="نوع العملية">
            <SelectField
              icon={<Workflow />}
              value={draftFilters.actionType}
              data-testid="audit-log-filter-action-type"
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  actionType: event.target.value as DraftFilters["actionType"],
                }))
              }
            >
              <option value="all">كل أنواع العمليات</option>
              {ACTION_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="المجال">
            <SelectField
              icon={<Layers3 />}
              value={draftFilters.domain}
              data-testid="audit-log-filter-domain"
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  domain: event.target.value as DraftFilters["domain"],
                }))
              }
            >
              <option value="all">كل المجالات</option>
              {DOMAIN_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </FormField>
          <FormField label="الحالة">
            <SelectField
              icon={<ShieldCheck />}
              value={draftFilters.status}
              data-testid="audit-log-filter-status"
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  status: event.target.value as DraftFilters["status"],
                }))
              }
            >
              <option value="all">كل الحالات</option>
              <option value="SUCCESS">ناجحة</option>
              <option value="FAILURE">فاشلة</option>
            </SelectField>
          </FormField>
          <FormField label="من تاريخ">
            <Input
              type="date"
              icon={<CalendarClock />}
              value={draftFilters.fromDate}
              data-testid="audit-log-filter-from-date"
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, fromDate: event.target.value }))
              }
            />
          </FormField>
          <FormField label="إلى تاريخ">
            <Input
              type="date"
              icon={<CalendarClock />}
              value={draftFilters.toDate}
              data-testid="audit-log-filter-to-date"
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, toDate: event.target.value }))
              }
            />
          </FormField>
        </div>
      </FilterDrawer>

          <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              التسلسل الزمني للعمليات
            </CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            تظهر العمليات هنا بشكل موجز ومنظّم، مع الدخول للتفاصيل أو التراجع فقط عند الحاجة.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {logsQuery.isPending ? (
            <SystemMessageInline
              tone="loading"
              message="جارٍ تحميل سجلات التدقيق..."
              showIcon={resolveInlineIcon("loading")}
              {...inlineMessageProps}
            />
          ) : null}

          {logsQuery.error ? (
            <SystemMessageInline
              tone="error"
              message={
                logsQuery.error instanceof Error
                  ? logsQuery.error.message
                  : "تعذر تحميل سجلات التدقيق."
              }
              showIcon={resolveInlineIcon("error", true)}
              action={{ label: "إعادة المحاولة", onClick: () => void handleRefresh() }}
              {...inlineMessageProps}
            />
          ) : null}

          {!logsQuery.isPending && logs.length === 0 ? (
            <SystemMessageInline
              tone={activeFiltersCount > 0 ? "warning" : "neutral"}
              message={
                activeFiltersCount > 0
                  ? "لا توجد سجلات مطابقة للفلاتر الحالية."
                  : "لا توجد سجلات تدقيق لعرضها حاليًا."
              }
              showIcon={resolveInlineIcon(activeFiltersCount > 0 ? "warning" : "neutral", activeFiltersCount > 0)}
              action={
                activeFiltersCount > 0
                  ? { label: "مسح الفلاتر", onClick: clearFilters }
                  : undefined
              }
              {...inlineMessageProps}
            />
          ) : null}

          {logs.map((log) => {
            const domain = inferDomain(log.resource);
            const actionLabel = translateAction(log.action);
            const parsedRowDetails = parseAuditDetails(log.details);
            const timelineMeta = getTimelineMeta(log);
            const timelineSummaryText = timelineMeta.hasPreviousChanges
              ? `لهذا السجل ${timelineMeta.previousChanges} تغييرات سابقة. في التسلسل سنعرض آخر ${timelineMeta.displayedChanges} تغييرات فقط.`
              : "لا توجد تغييرات سابقة على هذا السجل حتى الآن.";
            const statusBadge =
              log.status === "SUCCESS" ? (
                <Badge variant="default" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  ناجحة
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  فاشلة
                </Badge>
              );

            return (
              <div
                key={log.id}
                data-testid="audit-log-item"
                className="space-y-3 rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-background/95 to-background/72 p-4 shadow-[0_18px_46px_-34px_rgba(15,23,42,0.35)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{getActorLabel(log)}</p>
                      <Badge variant="outline">{actionLabel}</Badge>
                      <Badge variant="outline">{DOMAIN_LABELS[domain]}</Badge>
                      <Badge
                        variant={timelineMeta.hasPreviousChanges ? "secondary" : "outline"}
                        className="max-w-full truncate"
                      >
                        {timelineMeta.hasPreviousChanges
                          ? `تغييرات سابقة: ${timelineMeta.previousChanges}`
                          : "بدون تغييرات سابقة"}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/90">
                      {buildExecutiveSummary(log, parsedRowDetails)}
                    </p>
                    <p className="text-xs text-muted-foreground">{timelineSummaryText}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>وقت العملية: {formatDateTime(log.occurredAt)}</span>
                      <span>المورد: {translateResource(log.resource)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {statusBadge}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    onClick={() => openRollbackSheet(log.id)}
                    disabled={!timelineMeta.hasPreviousChanges}
                    data-testid={`audit-log-rollback-${log.id}`}
                  >
                    <Undo2 className="h-4 w-4" />
                    تراجع الآن
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setSelectedLogId(log.id)}
                    data-testid={`audit-log-view-details-${log.id}`}
                  >
                    <Eye className="h-4 w-4" />
                    عرض التفاصيل
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">
              صفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination || pagination.page <= 1 || logsQuery.isFetching}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) =>
                    pagination ? Math.min(prev + 1, pagination.totalPages) : prev,
                  )
                }
                disabled={
                  !pagination || pagination.page >= pagination.totalPages || logsQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void handleRefresh()}
                disabled={logsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${logsQuery.isFetching ? "animate-spin" : ""}`}
                />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
          </Card>
        </div>
      </PageShell>

      <BottomSheetForm
        open={isRetentionPolicyOpen}
        title="سياسة الحذف التلقائي لسجل التدقيق"
        description="اختر مدة الاحتفاظ بسجلات التدقيق قبل حذفها تلقائيًا. هذا الإجراء لا يؤثر على السجلات الأحدث."
        eyebrow="Retention"
        onClose={closeRetentionPolicySheet}
        onSubmit={() => void submitRetentionPolicy()}
        submitLabel="حفظ السياسة"
        isSubmitting={updateRetentionPolicyMutation.isPending}
        showCancelButton
        panelClassName="md:max-w-[620px]"
      >
        <div className="space-y-4">
          {retentionPolicyQuery.isFetching && !retentionPolicy ? (
            <SystemMessageInline
              tone="loading"
              message="جارٍ تحميل السياسة الحالية..."
              showIcon={resolveInlineIcon("loading")}
              {...inlineMessageProps}
            />
          ) : null}

          {retentionPolicyQuery.error ? (
            <SystemMessageInline
              tone="error"
              message={getErrorText(retentionPolicyQuery.error, "تعذر تحميل سياسة الحذف التلقائي.")}
              showIcon={resolveInlineIcon("error")}
              {...inlineMessageProps}
            />
          ) : null}

          {retentionFeedback ? (
            <SystemMessageInline
              tone={retentionFeedback.type === "success" ? "success" : "error"}
              message={retentionFeedback.message}
              showIcon={resolveInlineIcon(
                retentionFeedback.type === "success" ? "success" : "error",
              )}
              {...inlineMessageProps}
            />
          ) : null}

          <section className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">تفعيل الحذف التلقائي</p>
                <p className="text-xs text-muted-foreground">
                  عند التفعيل سيحذف النظام السجلات الأقدم من المدة المحددة تلقائيًا.
                </p>
              </div>
              <Switch
                checked={retentionEnabledDraft}
                onCheckedChange={(checked) => {
                  setRetentionEnabledDraft(checked);
                  setRetentionFeedback(null);
                }}
                disabled={updateRetentionPolicyMutation.isPending}
                data-testid="audit-log-retention-enabled-switch"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">مدة الاحتفاظ (بالأيام)</p>
              <Input
                type="number"
                min={retentionMinDays}
                max={retentionMaxDays}
                value={retentionDaysDraft}
                disabled={!retentionEnabledDraft || updateRetentionPolicyMutation.isPending}
                onChange={(event) => {
                  setRetentionDaysDraft(event.target.value);
                  setRetentionFeedback(null);
                }}
                data-testid="audit-log-retention-days-input"
              />
              <p className="text-xs text-muted-foreground">
                المدى المسموح: من {retentionMinDays} إلى {retentionMaxDays} يومًا.
              </p>
              <p className="text-xs text-muted-foreground">
                دورة التنظيف التلقائي: كل{" "}
                {retentionPolicy?.cleanupIntervalMinutes ?? 60} دقيقة.
              </p>
            </div>
          </section>
        </div>
      </BottomSheetForm>

      <BottomSheetForm
        open={Boolean(selectedLogId)}
        title="تفاصيل سجل التدقيق"
        description="عرض إداري واضح مع بيانات تقنية داعمة للتحقيق."
        eyebrow="Audit Log"
        onClose={closeDetails}
        onSubmit={() => undefined}
        showFooter={false}
        panelClassName="md:max-w-[760px]"
        overlayClassName="audit-log-details-overlay"
      >
        <div className="space-y-4">
          {detailsQuery.isFetching ? (
            <SystemMessageInline
              tone="loading"
              message="جارٍ تحميل أحدث التفاصيل..."
              showIcon={resolveInlineIcon("loading")}
              {...inlineMessageProps}
            />
          ) : null}

          {detailsQuery.error ? (
            <SystemMessageInline
              tone="error"
              message={
                detailsQuery.error instanceof Error
                  ? detailsQuery.error.message
                  : "تعذر تحميل تفاصيل السجل."
              }
              showIcon={resolveInlineIcon("error")}
              {...inlineMessageProps}
            />
          ) : null}

          {!selectedLog ? (
            <SystemMessageInline
              tone="neutral"
              message="لم يتم العثور على تفاصيل العملية."
              showIcon={resolveInlineIcon("neutral")}
              {...inlineMessageProps}
            />
          ) : (
            <>
              <section className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-4">
                <h3 className="text-sm font-semibold">ملخص تنفيذي</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailField label="معرف السجل Audit ID" value={selectedLog.id} mono />
                  <DetailField
                    label="المستخدم المنفذ"
                    value={getActorLabel(selectedLog)}
                  />
                  <DetailField
                    label="الدور الوظيفي"
                    value={getActorRoles(selectedLog, parsedDetails.actorRoleCodes)}
                  />
                  <DetailField
                    label="نوع العملية"
                    value={translateAction(selectedLog.action)}
                  />
                  <DetailField
                    label="المجال"
                    value={DOMAIN_LABELS[inferDomain(selectedLog.resource)]}
                  />
                  <DetailField
                    label="النتيجة النهائية"
                    value={selectedLog.status === "SUCCESS" ? "ناجحة" : "فاشلة"}
                  />
                  <div className="md:col-span-2">
                    <DetailField
                      label="الوصف الكامل لما حدث"
                      value={
                        parsedDetails.description
                          ? `${buildExecutiveSummary(selectedLog, parsedDetails)} تفاصيل إضافية: ${parsedDetails.description}`
                          : buildExecutiveSummary(selectedLog, parsedDetails)
                      }
                    />
                  </div>
                  <DetailField
                    label="وقت التنفيذ"
                    value={formatDateTime(selectedLog.occurredAt)}
                  />
                  <DetailField
                    label="رسالة الخطأ"
                    value={
                      parsedDetails.errorMessage ??
                      (selectedLog.status === "FAILURE" ? "غير متوفر" : "لا توجد")
                    }
                  />
                </div>
              </section>

              <section className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-4">
                <h3 className="text-sm font-semibold">بيانات التغيير</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <JsonPanel title="البيانات قبل التعديل" value={parsedDetails.beforeValue} />
                  <JsonPanel title="البيانات بعد التعديل" value={parsedDetails.afterValue} />
                </div>
              </section>

              <section
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-4"
                data-testid="audit-log-timeline-section"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">آخر 10 تغييرات</h3>
                  <Badge variant="outline">
                    {timelineQuery.data?.total ?? timelineItems.length} تغيير إجمالي
                  </Badge>
                </div>

                {timelineQuery.isFetching ? (
                  <SystemMessageInline
                    tone="loading"
                    message="جارٍ تحميل التسلسل..."
                    showIcon={resolveInlineIcon("loading")}
                    {...inlineMessageProps}
                  />
                ) : null}

                {timelineQuery.error ? (
                  <SystemMessageInline
                    tone="error"
                    message={
                      timelineQuery.error instanceof Error
                        ? timelineQuery.error.message
                        : "تعذر تحميل تسلسل التغييرات."
                    }
                    showIcon={resolveInlineIcon("error")}
                    {...inlineMessageProps}
                  />
                ) : null}

                {!timelineQuery.isFetching && timelineItems.length === 0 ? (
                  <SystemMessageInline
                    tone="neutral"
                    message="لا توجد تغييرات متاحة لهذا السجل."
                    showIcon={resolveInlineIcon("neutral")}
                    {...inlineMessageProps}
                  />
                ) : null}

                <div className="space-y-2">
                  {timelineItems.map((timelineItem: AuditLogTimelineItem) => {
                    const itemDetails = parseAuditDetails(timelineItem.details);
                    const itemActor = getActorLabel(timelineItem);
                    const itemAction = translateAction(timelineItem.action);

                    return (
                      <div
                        key={timelineItem.id}
                        className="rounded-md border border-border/70 bg-background/80 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">#{timelineItem.timelineOrder}</Badge>
                            <Badge
                              variant={timelineItem.status === "SUCCESS" ? "default" : "destructive"}
                            >
                              {timelineItem.status === "SUCCESS" ? "ناجحة" : "فاشلة"}
                            </Badge>
                            {timelineItem.isLatest ? (
                              <Badge variant="secondary">الأحدث</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(timelineItem.occurredAt)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm font-medium">
                          {itemAction} بواسطة {itemActor}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {buildTimelineChangeHint(itemDetails)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-4">
                <h3 className="text-sm font-semibold">بيانات تقنية</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailField
                    label="عنوان IP"
                    value={selectedLog.ipAddress ?? "غير متوفر"}
                    mono
                  />
                  <DetailField
                    label="الجهاز / المتصفح"
                    value={selectedLog.userAgent ?? "غير متوفر"}
                  />
                  <DetailField
                    label="الإجراء التقني"
                    value={selectedLog.action}
                    mono
                  />
                  <DetailField
                    label="المورد التقني"
                    value={selectedLog.resource}
                    mono
                  />
                  <DetailField
                    label="معرف المورد"
                    value={selectedLog.resourceId ?? "غير متوفر"}
                    mono
                  />
                  <DetailField
                    label="Outcome إضافي"
                    value={parsedDetails.outcome ?? "غير متوفر"}
                  />
                  <DetailField
                    label="Request ID"
                    value={contextRequestId ?? "غير متوفر"}
                    mono
                  />
                  <DetailField
                    label="Correlation ID"
                    value={contextCorrelationId ?? "غير متوفر"}
                    mono
                  />
                  <DetailField
                    label="HTTP Method"
                    value={contextMethod ?? "غير متوفر"}
                    mono
                  />
                  <DetailField
                    label="Path"
                    value={contextPath ?? "غير متوفر"}
                    mono
                  />
                </div>

                {parsedDetails.technicalExtras ? (
                  <JsonPanel
                    title="بيانات تقنية إضافية مفيدة للمطورين"
                    value={parsedDetails.technicalExtras}
                  />
                ) : null}

                {!parsedDetails.technicalExtras && selectedLog.details ? (
                  <JsonPanel title="البيانات الخام (Raw Details)" value={selectedLog.details} />
                ) : null}
              </section>
            </>
          )}
        </div>
      </BottomSheetForm>

      <BottomSheetForm
        open={Boolean(rollbackLogId)}
        title="التراجع من سجل التغييرات"
        description="اختر طريقة التراجع: إلى آخر تغيير سابق مباشرة أو إلى تغيير محدد من آخر 10 تغييرات."
        eyebrow="Rollback"
        onClose={closeRollbackSheet}
        onSubmit={() => undefined}
        showFooter={false}
        panelClassName="md:max-w-[760px]"
      >
        <div className="space-y-4">
          {rollbackFeedback ? (
            <SystemMessageInline
              tone={rollbackFeedback.type === "success" ? "success" : "error"}
              message={rollbackFeedback.message}
              showIcon={resolveInlineIcon(
                rollbackFeedback.type === "success" ? "success" : "error",
              )}
              {...inlineMessageProps}
            />
          ) : null}

          {rollbackTimelineQuery.isFetching ? (
            <SystemMessageInline
              tone="loading"
              message="جارٍ تحميل آخر 10 تغييرات..."
              showIcon={resolveInlineIcon("loading")}
              {...inlineMessageProps}
            />
          ) : null}

          {rollbackTimelineQuery.error ? (
            <SystemMessageInline
              tone="error"
              message={getErrorText(rollbackTimelineQuery.error, "تعذر تحميل تسلسل التغييرات.")}
              showIcon={resolveInlineIcon("error")}
              {...inlineMessageProps}
            />
          ) : null}

          {!rollbackTimelineQuery.isFetching && rollbackTimelineItems.length === 0 ? (
            <SystemMessageInline
              tone="neutral"
              message="لا توجد بيانات تسلسل متاحة لهذا السجل."
              showIcon={resolveInlineIcon("neutral")}
              {...inlineMessageProps}
            />
          ) : null}

          {rollbackTimelineItems.length > 0 ? (
            <section className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">التغييرات المتاحة للتراجع</h3>
                <Badge variant="outline">
                  آخر {Math.min(rollbackTimelineItems.length, 10)} تغييرات
                </Badge>
              </div>

              <div className="space-y-2">
                {rollbackTimelineItems.map((timelineItem) => {
                  const itemDetails = parseAuditDetails(timelineItem.details);
                  const itemSummary = buildTimelineChangeHint(itemDetails);
                  const isSelected = selectedRollbackTargetId === timelineItem.id;
                  const isLatest = timelineItem.isLatest;

                  return (
                    <button
                      key={timelineItem.id}
                      type="button"
                      onClick={() => setSelectedRollbackTargetId(timelineItem.id)}
                      className={`w-full rounded-md border p-3 text-start transition ${
                        isSelected
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/70 bg-background/80 hover:border-primary/30"
                      }`}
                      disabled={rollbackMutation.isPending}
                      data-testid={`audit-log-rollback-option-${timelineItem.id}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">#{timelineItem.timelineOrder}</Badge>
                          <Badge
                            variant={
                              timelineItem.status === "SUCCESS" ? "default" : "destructive"
                            }
                          >
                            {timelineItem.status === "SUCCESS" ? "ناجحة" : "فاشلة"}
                          </Badge>
                          {isLatest ? <Badge variant="secondary">الحالة الحالية</Badge> : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(timelineItem.occurredAt)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-medium">
                        {translateAction(timelineItem.action)} بواسطة {getActorLabel(timelineItem)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{itemSummary}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={closeRollbackSheet}
              disabled={rollbackMutation.isPending}
            >
              إغلاق
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-1.5"
              onClick={() => void submitRollback("PREVIOUS")}
              disabled={!previousRollbackItem || rollbackMutation.isPending}
              data-testid="audit-log-rollback-previous"
            >
              <Undo2 className="h-4 w-4" />
              التراجع إلى التغيير السابق
            </Button>
            <Button
              type="button"
              className="gap-1.5"
              onClick={() => void submitRollback("TARGET")}
              disabled={!selectedRollbackItem || rollbackMutation.isPending}
              data-testid="audit-log-rollback-selected"
            >
              <Undo2 className="h-4 w-4" />
              التراجع إلى التغيير المحدد
            </Button>
          </div>
        </div>
      </BottomSheetForm>
    </>
  );
}
