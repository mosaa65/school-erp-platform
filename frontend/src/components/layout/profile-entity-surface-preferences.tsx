"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpenText,
  Check,
  Eye,
  GraduationCap,
  LayoutTemplate,
  MoveLeft,
  Palette,
  PencilLine,
  Plus,
  ScanSearch,
  Smartphone,
  Sparkles,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEntitySurface } from "@/hooks/use-entity-surface";
import { cn } from "@/lib/utils";
import { EntityDetailsShell } from "@/presentation/entity-surface/entity-details-shell";
import { EntitySurfaceCard } from "@/presentation/entity-surface/entity-surface-card";
import { EntitySurfaceGrid } from "@/presentation/entity-surface/entity-surface-grid";
import { EntitySurfaceHeaderActionButton } from "@/presentation/entity-surface/entity-surface-header-action-button";
import { EntitySurfaceQuickActions } from "@/presentation/entity-surface/entity-surface-quick-actions";
import { EntitySurfaceRow } from "@/presentation/entity-surface/entity-surface-row";
import type {
  EntityDetailsMode,
  EntitySurfaceColorMode,
  EntitySurfaceOption,
  EntitySurfaceQuickAction,
} from "@/presentation/entity-surface/entity-surface-types";

type PreviewPermissionMode = "summary-only" | "with-details";
type PreviewDeviceMode = "desktop" | "mobile";

type ProfileEntitySurfacePreferencesProps = {
  className?: string;
};

type PreviewStudent = {
  id: string;
  fullName: string;
  admissionNo: string;
  gradeLevel: string;
  section: string;
  status: string;
  statusTone: "success" | "warning" | "accent";
  attendance: string;
  guardian: string;
  phone: string;
  description: string;
  avatarFallback: string;
};

const PREVIEW_STUDENTS: PreviewStudent[] = [
  {
    id: "stu-1001",
    fullName: "أحمد محمد علي",
    admissionNo: "STU-1001",
    gradeLevel: "الصف السابع",
    section: "شعبة أ",
    status: "منتظم",
    statusTone: "success",
    attendance: "حضور 96%",
    guardian: "محمد علي",
    phone: "770 123 456",
    description: "طالب نشط ويحتاج وصولًا سريعًا للمعاينة والتعديل.",
    avatarFallback: "أم",
  },
  {
    id: "stu-1002",
    fullName: "سارة عبدالله حسن",
    admissionNo: "STU-1002",
    gradeLevel: "الصف السادس",
    section: "شعبة ب",
    status: "بحاجة مراجعة",
    statusTone: "warning",
    attendance: "حضور 84%",
    guardian: "عبدالله حسن",
    phone: "771 555 210",
    description: "مثال لبطاقة تحتاج إبراز الحالة مع المحافظة على الاختصار.",
    avatarFallback: "سع",
  },
  {
    id: "stu-1003",
    fullName: "يحيى صالح أحمد",
    admissionNo: "STU-1003",
    gradeLevel: "الصف الثامن",
    section: "شعبة ج",
    status: "مميز",
    statusTone: "accent",
    attendance: "حضور 99%",
    guardian: "صالح أحمد",
    phone: "733 404 001",
    description: "مثال للعرض الذي يسمح بإظهار بعض التفاصيل مباشرة داخل البطاقة.",
    avatarFallback: "يص",
  },
];

const PREVIEW_PERMISSION_OPTIONS: Array<{
  value: PreviewPermissionMode;
  label: string;
  description: string;
}> = [
  {
    value: "summary-only",
    label: "عرض عام فقط",
    description: "يعرض أيقونة الطالب مع الاسم فقط بدون تفاصيل.",
  },
  {
    value: "with-details",
    label: "عرض مع تفاصيل",
    description: "يسمح بالمعاينة وفتح التفاصيل ويمكن إظهار تفاصيل إضافية داخل البطاقة.",
  },
];

const PREVIEW_DEVICE_OPTIONS: Array<{
  value: PreviewDeviceMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "desktop",
    label: "كمبيوتر",
    description: "أيقونة ونص للأزرار داخل البطاقة.",
    icon: LayoutTemplate,
  },
  {
    value: "mobile",
    label: "جوال",
    description: "أيقونات فقط مع عرض مضغوط وموفر للمساحة.",
    icon: Smartphone,
  },
];

function resolvePreviewDetailsMode(value: string, compact: boolean): EntityDetailsMode {
  if (value === "screen-default") {
    return compact ? "inline" : "dialog";
  }

  return value as EntityDetailsMode;
}

function SummaryTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[1.1rem] border border-white/70 bg-background/82 px-3 py-3 text-slate-900 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-black/25 dark:text-white">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-white/55">
        <Icon className="h-3 w-3 text-[color:var(--app-accent-color)]" />
        <span>{label}</span>
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold">{value}</p>
    </div>
  );
}

function SectionShell({
  title,
  icon: Icon,
  description,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.4rem] border border-white/70 bg-white/72 p-3 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]",
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          {description ? (
            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function OptionGrid<TValue extends string>({
  items,
  selected,
  onSelect,
  className,
}: {
  items: Array<EntitySurfaceOption<TValue>>;
  selected: TValue;
  onSelect: (value: TValue) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-1.5", className)}>
      {items.map((item) => {
        const active = item.value === selected;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "rounded-[1rem] border px-3 py-2.5 text-right transition-all",
              active
                ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                : "border-white/70 bg-background/82 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white/75 dark:hover:bg-white/[0.06]",
            )}
          >
            <p className="text-xs font-semibold">{item.label}</p>
            <p className="mt-1 text-[10px] leading-4 opacity-80">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function PreviewModeGrid<TValue extends string>({
  items,
  selected,
  onSelect,
}: {
  items: Array<{
    value: TValue;
    label: string;
    description: string;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  selected: TValue;
  onSelect: (value: TValue) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {items.map((item) => {
        const active = item.value === selected;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "rounded-[1rem] border px-3 py-2.5 text-right transition-all",
              active
                ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                : "border-white/70 bg-background/82 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white/75 dark:hover:bg-white/[0.06]",
            )}
          >
            <div className="flex items-center gap-2">
              {Icon ? <Icon className="h-4 w-4" /> : null}
              <p className="text-xs font-semibold">{item.label}</p>
            </div>
            <p className="mt-1 text-[10px] leading-4 opacity-80">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/70 bg-background/82 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-right">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-white/55">
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function ColorOptionButton({
  value,
  label,
  description,
  selected,
  onSelect,
}: {
  value: EntitySurfaceColorMode;
  label: string;
  description: string;
  selected: boolean;
  onSelect: (value: EntitySurfaceColorMode) => void;
}) {
  const swatches =
    value === "accent"
      ? [
          "bg-[color:var(--app-accent-color)]",
          "bg-[color:var(--app-accent-soft)]",
          "bg-[color:var(--app-accent-strong)]",
        ]
      : value === "emerald"
        ? ["bg-emerald-500", "bg-emerald-300", "bg-emerald-700"]
      : value === "sunset"
          ? ["bg-orange-500", "bg-amber-300", "bg-amber-700"]
          : value === "berry"
            ? ["bg-rose-500", "bg-fuchsia-300", "bg-fuchsia-700"]
            : value === "custom"
              ? ["bg-violet-500", "bg-violet-300", "bg-violet-700"]
            : ["bg-cyan-500", "bg-sky-300", "bg-sky-700"];

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-[1rem] border px-3 py-2.5 text-right transition-all",
        selected
          ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
          : "border-white/70 bg-background/82 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white/75 dark:hover:bg-white/[0.06]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {swatches.map((swatch, index) => (
            <span
              key={`${value}-${index}`}
              className={cn(
                "h-3 w-3 rounded-full border border-white/70 shadow-sm dark:border-black/15",
                swatch,
              )}
            />
          ))}
        </div>
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-1 text-[10px] leading-4 opacity-80">{description}</p>
    </button>
  );
}

function CurrentSelectionList({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[1rem] border border-white/70 bg-background/82 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <p className="text-[10px] text-slate-500 dark:text-white/50">{item.label}</p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-900 dark:text-white">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ProfileEntitySurfacePreferences({
  className,
}: ProfileEntitySurfacePreferencesProps) {
  const entitySurface = useEntitySurface();
  const [selectedPreviewId, setSelectedPreviewId] = React.useState<string | null>(null);
  const [contextPreviewId, setContextPreviewId] = React.useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = React.useState<string | null>(null);
  const [showCustomColorForm, setShowCustomColorForm] = React.useState(false);
  const [previewPermissionMode, setPreviewPermissionMode] =
    React.useState<PreviewPermissionMode>("summary-only");
  const [previewDeviceMode, setPreviewDeviceMode] =
    React.useState<PreviewDeviceMode>("desktop");
  const [previewEditEnabled, setPreviewEditEnabled] = React.useState(true);
  const [previewDeleteEnabled, setPreviewDeleteEnabled] = React.useState(true);
  const [customColor, setCustomColor] = React.useState(entitySurface.customColorHex);

  const selectedPreview =
    PREVIEW_STUDENTS.find((item) => item.id === selectedPreviewId) ?? PREVIEW_STUDENTS[0];
  const previewCanReadDetails = previewPermissionMode === "with-details";
  const previewCanShowCardDetails =
    previewCanReadDetails && entitySurface.showExtendedDetailsInCards;
  const previewLabelMode = previewDeviceMode === "mobile" ? "hidden" : "always";
  const previewIsCompact =
    previewDeviceMode === "mobile" || entitySurface.defaultViewMode === "dense-row";
  const resolvedDetailsMode = resolvePreviewDetailsMode(
    entitySurface.detailsOpenMode,
    previewIsCompact,
  );
  const usesBlurBackdrop = entitySurface.longPressMode === "enabled-with-blur";

  React.useEffect(() => {
    setCustomColor(entitySurface.customColorHex);
  }, [entitySurface.customColorHex]);

  React.useEffect(() => {
    if (previewCanReadDetails) {
      return;
    }

    setSelectedPreviewId(null);
    setContextPreviewId(null);
  }, [previewCanReadDetails]);

  const buildHeaderActions = React.useCallback(
    (student: PreviewStudent) => {
      const actions: React.ReactNode[] = [];

      if (previewCanReadDetails) {
        actions.push(
          <EntitySurfaceHeaderActionButton
            key={`${student.id}-preview`}
            label="معاينة"
            icon={<Eye className="h-3.5 w-3.5" />}
            tone="preview"
            colorMode={entitySurface.colorMode}
            entityKey="students"
            labelMode={previewLabelMode}
            onClick={() => {
              setSelectedPreviewId(student.id);
              setContextPreviewId(null);
            }}
          />,
        );
      }

      if (previewEditEnabled) {
        actions.push(
          <EntitySurfaceHeaderActionButton
            key={`${student.id}-edit`}
            label="تعديل"
            icon={<PencilLine className="h-3.5 w-3.5" />}
            tone="edit"
            colorMode={entitySurface.colorMode}
            entityKey="students"
            labelMode={previewLabelMode}
            onClick={() => setPreviewNotice(`هذه معاينة فقط، ولن يتم تعديل ${student.fullName}.`)}
          />,
        );
      }

      if (previewDeleteEnabled) {
        actions.push(
          <EntitySurfaceHeaderActionButton
            key={`${student.id}-delete`}
            label="حذف"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            tone="delete"
            labelMode={previewLabelMode}
            onClick={() => setPreviewNotice(`هذه معاينة فقط، ولن يتم حذف ${student.fullName}.`)}
          />,
        );
      }

      return actions.length > 0 ? <div className="flex items-center gap-1">{actions}</div> : null;
    },
    [previewCanReadDetails, previewDeleteEnabled, previewEditEnabled, previewLabelMode],
  );

  const buildQuickActions = React.useCallback(
    (student: PreviewStudent): EntitySurfaceQuickAction[] => {
      const actions: EntitySurfaceQuickAction[] = [];

      if (previewCanReadDetails) {
        actions.push({
          key: "preview",
          label: "معاينة",
          icon: <Eye className="h-3.5 w-3.5" />,
          tone: "accent",
          onClick: () => {
            setSelectedPreviewId(student.id);
            setContextPreviewId(null);
          },
        });
      }

      if (previewEditEnabled) {
        actions.push({
          key: "edit",
          label: "تعديل",
          icon: <PencilLine className="h-3.5 w-3.5" />,
          onClick: () => setPreviewNotice(`تم فتح تعديل تجريبي لـ ${student.fullName}.`),
        });
      }

      if (previewDeleteEnabled) {
        actions.push({
          key: "delete",
          label: "حذف",
          icon: <Trash2 className="h-3.5 w-3.5" />,
          tone: "danger",
          onClick: () => setPreviewNotice(`هذه معاينة فقط، ولن يتم حذف ${student.fullName}.`),
        });
      }

      return actions;
    },
    [previewCanReadDetails, previewDeleteEnabled, previewEditEnabled],
  );

  const renderPreviewCard = (student: PreviewStudent) => {
    const quickActions = buildQuickActions(student);
    const headerActions = buildHeaderActions(student);
    const canOpenContext =
      entitySurface.longPressMode !== "disabled" && quickActions.length > 0;
    const commonCardProps = {
      density: entitySurface.density,
      richness: entitySurface.richness,
      colorMode: entitySurface.colorMode,
      visualStyle: entitySurface.visualStyle,
      effectsPreset: entitySurface.effectsPreset,
      shapePreset: entitySurface.shapePreset,
      entityKey: "students",
      inlineActionsMode: entitySurface.inlineActionsMode,
      motionPreset: entitySurface.motionPreset,
      reducedMotion: entitySurface.reducedMotion,
      avatarMode: entitySurface.avatarMode,
      headerActions,
      contextOpen: contextPreviewId === student.id,
      onClick: previewCanReadDetails
        ? () => {
            setSelectedPreviewId(student.id);
            setContextPreviewId(null);
          }
        : undefined,
      onLongPress: () => {
        if (!canOpenContext) {
          return;
        }
        setContextPreviewId(student.id);
      },
    } as const;

    if (entitySurface.defaultViewMode === "dense-row") {
      return (
        <EntitySurfaceRow
          key={student.id}
          title={student.fullName}
          subtitle={previewCanShowCardDetails ? `${student.admissionNo} • ${student.gradeLevel}` : undefined}
          meta={previewCanShowCardDetails ? `${student.section} • ${student.attendance}` : undefined}
          avatar={{
            fallback: student.avatarFallback,
            alt: student.fullName,
            icon: <UserCircle2 className="h-5 w-5" />,
            colorSeed: student.admissionNo,
          }}
          statusChips={
            previewCanShowCardDetails
              ? [
                  { label: student.status, tone: student.statusTone },
                  { label: student.section, tone: "outline" },
                ]
              : undefined
          }
          detailsAffordance={previewCanReadDetails}
          longPressMode={entitySurface.longPressMode}
          {...commonCardProps}
        />
      );
    }

    return (
      <EntitySurfaceCard
        key={student.id}
        title={student.fullName}
        subtitle={previewCanShowCardDetails ? `${student.admissionNo} • ${student.gradeLevel}` : undefined}
        description={previewCanShowCardDetails ? student.description : undefined}
        avatar={{
          fallback: student.avatarFallback,
          alt: student.fullName,
          icon: <GraduationCap className="h-5 w-5" />,
          colorSeed: student.admissionNo,
        }}
        fields={
          previewCanShowCardDetails
            ? [
                { label: "الشعبة", value: student.section },
                { label: "الحضور", value: student.attendance },
                { label: "ولي الأمر", value: student.guardian },
              ]
            : undefined
        }
        statusChips={
          previewCanShowCardDetails
            ? [
                { label: student.status, tone: student.statusTone },
                { label: student.section, tone: "outline" },
              ]
            : undefined
        }
        detailsAffordance={previewCanReadDetails}
        viewMode={entitySurface.defaultViewMode}
        longPressMode={entitySurface.longPressMode}
        {...commonCardProps}
      />
    );
  };

  const currentSelections = [
    {
      label: "العرض",
      value:
        entitySurface.viewModeOptions.find((item) => item.value === entitySurface.defaultViewMode)?.label ??
        entitySurface.defaultViewMode,
    },
    {
      label: "الكثافة",
      value:
        entitySurface.densityOptions.find((item) => item.value === entitySurface.density)?.label ??
        entitySurface.density,
    },
    {
      label: "الألوان",
      value:
        entitySurface.colorOptions.find((item) => item.value === entitySurface.colorMode)?.label ??
        entitySurface.colorMode,
    },
    {
      label: "التفاصيل",
      value:
        entitySurface.detailsOpenModeOptions.find((item) => item.value === entitySurface.detailsOpenMode)?.label ??
        entitySurface.detailsOpenMode,
    },
    {
      label: "الضغط المطول",
      value:
        entitySurface.longPressOptions.find((item) => item.value === entitySurface.longPressMode)?.label ??
        entitySurface.longPressMode,
    },
    {
      label: "الحركة",
      value:
        entitySurface.motionOptions.find((item) => item.value === entitySurface.motionPreset)?.label ??
        entitySurface.motionPreset,
    },
  ];

  return (
    <div className={cn("mx-auto max-w-7xl space-y-4", className)}>
      <div className="rounded-[1.8rem] border border-white/70 bg-white/76 p-4 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.24)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/58 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">
              إعدادات موحدة
            </Badge>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
                بطاقات العرض والتفاصيل
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-white/60">
                هذه الصفحة تتحكم الآن في قالب بطاقات الطلاب مباشرة. أي تغيير تحفظه هنا سيظهر
                في واجهة الطلاب والمعاينة في الوقت نفسه.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild type="button" variant="outline" className="h-11 rounded-2xl">
              <Link href="/app/profile">
                <MoveLeft className="h-4 w-4" />
                الرجوع للملف الشخصي
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              onClick={entitySurface.resetPreferences}
            >
              إعادة الإعدادات
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <SummaryTile
            label="العرض"
            value={
              entitySurface.viewModeOptions.find((item) => item.value === entitySurface.defaultViewMode)?.label ??
              entitySurface.defaultViewMode
            }
            icon={LayoutTemplate}
          />
          <SummaryTile
            label="اللون"
            value={
              entitySurface.colorOptions.find((item) => item.value === entitySurface.colorMode)?.label ??
              entitySurface.colorMode
            }
            icon={Palette}
          />
          <SummaryTile
            label="التفاصيل"
            value={
              entitySurface.detailsOpenModeOptions.find((item) => item.value === entitySurface.detailsOpenMode)?.label ??
              entitySurface.detailsOpenMode
            }
            icon={BookOpenText}
          />
          <SummaryTile
            label="الحركة"
            value={
              entitySurface.motionOptions.find((item) => item.value === entitySurface.motionPreset)?.label ??
              entitySurface.motionPreset
            }
            icon={Sparkles}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <SectionShell
            title="المعاينة الحية"
            icon={ScanSearch}
            description="غيّر أي خيار من الأسفل وستتحدث هذه المعاينة مباشرة. يمكنك أيضًا تبديل حالة الصلاحيات بين عرض عام فقط وعرض مع تفاصيل."
          >
            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    حالة الصلاحيات في المعاينة
                  </p>
                  <PreviewModeGrid
                    items={PREVIEW_PERMISSION_OPTIONS}
                    selected={previewPermissionMode}
                    onSelect={setPreviewPermissionMode}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    مقاس شاشة المعاينة
                  </p>
                  <PreviewModeGrid
                    items={PREVIEW_DEVICE_OPTIONS}
                    selected={previewDeviceMode}
                    onSelect={setPreviewDeviceMode}
                  />
                </div>
              </div>

              <div className="grid gap-2 lg:grid-cols-2">
                <ToggleRow
                  label="إظهار تفاصيل إضافية داخل البطاقة"
                  description="يعرض بعض معلومات التفاصيل داخل البطاقة العامة إذا كانت صلاحية التفاصيل متاحة."
                  checked={entitySurface.showExtendedDetailsInCards}
                  onCheckedChange={entitySurface.setShowExtendedDetailsInCards}
                  disabled={!previewCanReadDetails}
                />
                <ToggleRow
                  label="زر التعديل"
                  description="معاينة ظهور زر التعديل بجوار الاسم في البطاقة."
                  checked={previewEditEnabled}
                  onCheckedChange={setPreviewEditEnabled}
                />
                <ToggleRow
                  label="زر الحذف"
                  description="معاينة ظهور زر الحذف بجوار الاسم في البطاقة."
                  checked={previewDeleteEnabled}
                  onCheckedChange={setPreviewDeleteEnabled}
                />
                <div className="rounded-[1rem] border border-white/70 bg-background/82 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    ملاحظات المعاينة
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-white/55">
                    في وضع "عرض عام فقط" ستظهر البطاقة كأيقونة طالب مع الاسم فقط. في وضع
                    "عرض مع تفاصيل" يظهر زر المعاينة ويمكن اختيار عرض تفاصيل إضافية داخل البطاقة.
                  </p>
                </div>
              </div>

              {previewNotice ? (
                <div className="rounded-[1rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-3 py-2 text-xs text-[color:var(--app-accent-color)]">
                  {previewNotice}
                </div>
              ) : null}
            </div>
          </SectionShell>

          <SectionShell
            title="العرض الأساسي"
            icon={LayoutTemplate}
            description="هذه الخيارات تؤثر على كثافة البطاقة ونمط العرض الافتراضي واختصار المحتوى."
          >
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                  نمط العرض
                </p>
                <OptionGrid
                  items={entitySurface.viewModeOptions}
                  selected={entitySurface.defaultViewMode}
                  onSelect={entitySurface.setDefaultViewMode}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    الكثافة
                  </p>
                  <OptionGrid
                    items={entitySurface.densityOptions}
                    selected={entitySurface.density}
                    onSelect={entitySurface.setDensity}
                    className="grid-cols-1"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    ثراء المحتوى
                  </p>
                  <OptionGrid
                    items={entitySurface.richnessOptions}
                    selected={entitySurface.richness}
                    onSelect={entitySurface.setRichness}
                    className="grid-cols-1"
                  />
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            title="الألوان والهوية"
            icon={Palette}
            description="اختر ألوانًا جاهزة أو اجعل كل نظام يستخدم لونه الخاص. وضع الطلاب سيأخذ اللون نفسه مباشرة."
          >
            <div className="space-y-3">
              <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {entitySurface.colorOptions.map((item) => (
                  <ColorOptionButton
                    key={item.value}
                    value={item.value}
                    label={item.label}
                    description={item.description}
                    selected={item.value === entitySurface.colorMode}
                    onSelect={entitySurface.setColorMode}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowCustomColorForm((value) => !value)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-[1rem] border px-3 py-3 text-right transition-all",
                  showCustomColorForm || entitySurface.colorMode === "custom"
                    ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                    : "border-dashed border-slate-300 bg-background/70 text-slate-700 hover:bg-white dark:border-white/15 dark:bg-white/[0.02] dark:text-white/75 dark:hover:bg-white/[0.05]",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed"
                    style={{
                      borderColor:
                        showCustomColorForm || entitySurface.colorMode === "custom"
                          ? customColor
                          : "#94a3b8",
                      backgroundColor:
                        showCustomColorForm || entitySurface.colorMode === "custom"
                          ? `${customColor}22`
                          : "transparent",
                    }}
                  >
                    {showCustomColorForm || entitySurface.colorMode === "custom" ? (
                      <X className="h-3 w-3" />
                    ) : (
                      <Plus className="h-3 w-3 text-slate-400 dark:text-white/40" />
                    )}
                  </span>
                  <span className="text-xs font-semibold">لون مخصص</span>
                </span>
                <span className="text-[10px] opacity-80">اختيار يدوي</span>
              </button>

              {showCustomColorForm || entitySurface.colorMode === "custom" ? (
                <div className="rounded-[1rem] border border-white/70 bg-background/80 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="mb-2 text-xs font-semibold text-slate-800 dark:text-white">
                    اختر لون البطاقات المخصص
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(event) => setCustomColor(event.target.value)}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-white/70 bg-transparent p-0.5 dark:border-white/10"
                    />
                    <div
                      className="h-10 flex-1 rounded-lg transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${customColor}16, ${customColor}70)`,
                        border: `1.5px solid ${customColor}55`,
                      }}
                    />
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: customColor }}
                    >
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        entitySurface.setCustomColorHex(customColor);
                        setShowCustomColorForm(false);
                      }}
                      className="h-9 flex-1 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: customColor }}
                    >
                      تطبيق اللون
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomColorForm(false)}
                      className="h-9 rounded-lg border border-white/70 bg-background/75 px-4 text-xs font-medium text-slate-700 transition-colors hover:bg-white dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[0.06]"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    الأسلوب البصري
                  </p>
                  <OptionGrid
                    items={entitySurface.visualStyleOptions}
                    selected={entitySurface.visualStyle}
                    onSelect={entitySurface.setVisualStyle}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    التأثيرات
                  </p>
                  <OptionGrid
                    items={entitySurface.effectsOptions}
                    selected={entitySurface.effectsPreset}
                    onSelect={entitySurface.setEffectsPreset}
                    className="grid-cols-1"
                  />
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            title="التفاعل والتفاصيل"
            icon={BookOpenText}
            description="اضبط كيفية فتح التفاصيل، ظهور الصور، أسلوب الضغط المطول، وحركة العناصر."
          >
            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    شكل الحواف
                  </p>
                  <OptionGrid
                    items={entitySurface.shapeOptions}
                    selected={entitySurface.shapePreset}
                    onSelect={entitySurface.setShapePreset}
                    className="grid-cols-1"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    الصور والرموز
                  </p>
                  <OptionGrid
                    items={entitySurface.avatarOptions}
                    selected={entitySurface.avatarMode}
                    onSelect={entitySurface.setAvatarMode}
                    className="grid-cols-1"
                  />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    الأزرار داخل البطاقة
                  </p>
                  <OptionGrid
                    items={entitySurface.inlineActionsOptions}
                    selected={entitySurface.inlineActionsMode}
                    onSelect={entitySurface.setInlineActionsMode}
                    className="grid-cols-1"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    فتح التفاصيل
                  </p>
                  <OptionGrid
                    items={entitySurface.detailsOpenModeOptions}
                    selected={entitySurface.detailsOpenMode}
                    onSelect={entitySurface.setDetailsOpenMode}
                  />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    الضغط المطول
                  </p>
                  <OptionGrid
                    items={entitySurface.longPressOptions}
                    selected={entitySurface.longPressMode}
                    onSelect={entitySurface.setLongPressMode}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-white/70">
                    الحركة
                  </p>
                  <OptionGrid
                    items={entitySurface.motionOptions}
                    selected={entitySurface.motionPreset}
                    onSelect={entitySurface.setMotionPreset}
                    className="grid-cols-1"
                  />
                </div>
              </div>

              <ToggleRow
                label="تقليل الحركة"
                description="يخفف الأنيميشن والتكبير والضبابية في البطاقات والمعاينة وواجهة الطلاب."
                checked={entitySurface.reducedMotion}
                onCheckedChange={entitySurface.setReducedMotion}
              />
            </div>
          </SectionShell>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <SectionShell
            title="بطاقات المعاينة"
            icon={ScanSearch}
            description="هذه البطاقات ثابتة هنا حتى ترى أي تغيير مباشرة أثناء تعديل الإعدادات."
          >
            {previewNotice ? (
              <div className="mb-3 rounded-[1rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-3 py-2 text-xs text-[color:var(--app-accent-color)]">
                {previewNotice}
              </div>
            ) : null}

            <div
              className={cn(
                "rounded-[1.35rem] border border-white/70 bg-background/70 p-3 dark:border-white/10 dark:bg-white/[0.02]",
                previewDeviceMode === "mobile" ? "mx-auto max-w-[390px]" : "",
              )}
            >
              <EntitySurfaceGrid
                viewMode={entitySurface.defaultViewMode}
                density={entitySurface.density}
                richness={entitySurface.richness}
                colorMode={entitySurface.colorMode}
                visualStyle={entitySurface.visualStyle}
                effectsPreset={entitySurface.effectsPreset}
                shapePreset={entitySurface.shapePreset}
                entityKey="students"
                inlineActionsMode={entitySurface.inlineActionsMode}
              >
                {PREVIEW_STUDENTS.map((student) => renderPreviewCard(student))}
              </EntitySurfaceGrid>
            </div>
          </SectionShell>

          <SectionShell
            title="الحالة الحالية"
            icon={BadgeCheck}
            description="ملخص سريع لأهم الإعدادات المطبقة الآن على قالب الطلاب."
          >
            <CurrentSelectionList items={currentSelections} />
          </SectionShell>

          <SectionShell
            title="كيف ستظهر الصلاحيات"
            icon={Eye}
            description="هذه القواعد نفسها هي التي تعتمد عليها واجهة الطلاب الآن."
          >
            <div className="space-y-2 text-[11px] leading-5 text-slate-600 dark:text-white/65">
              <div className="rounded-[1rem] border border-white/70 bg-background/82 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="font-semibold text-slate-900 dark:text-white">
                  صلاحية عرض الطلاب
                </p>
                <p className="mt-1">
                  تعرض أيقونة الطالب مع الاسم فقط داخل القائمة العامة.
                </p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-background/82 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="font-semibold text-slate-900 dark:text-white">
                  صلاحية عرض التفاصيل
                </p>
                <p className="mt-1">
                  تضيف زر المعاينة وتسمح بفتح التفاصيل أو إظهار تفاصيل أكثر داخل البطاقة عند تفعيل ذلك.
                </p>
              </div>
              <div className="rounded-[1rem] border border-white/70 bg-background/82 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="font-semibold text-slate-900 dark:text-white">
                  صلاحيات التعديل والحذف
                </p>
                <p className="mt-1">
                  تظهر بجوار الاسم: في الكمبيوتر أيقونة ونص، وفي الجوال أيقونات فقط.
                </p>
              </div>
            </div>
          </SectionShell>
        </div>
      </div>

      {contextPreviewId ? (
        <div className="fixed inset-0 z-[85]">
          <div
            className={cn(
              "absolute inset-0",
              usesBlurBackdrop ? "bg-black/24 backdrop-blur-sm" : "bg-black/18",
            )}
            onClick={() => setContextPreviewId(null)}
          />
          <div className="absolute inset-x-4 bottom-4 mx-auto max-w-sm">
            <div className="rounded-[1.6rem] border border-white/70 bg-white/88 p-3 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/88">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                اختصارات البطاقة
              </p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
                هذه معاينة للضغط المطول على البطاقة مع الإجراءات التي يحددها المستخدم وصلاحياته.
              </p>
              <EntitySurfaceQuickActions
                actions={buildQuickActions(
                  PREVIEW_STUDENTS.find((item) => item.id === contextPreviewId) ?? PREVIEW_STUDENTS[0],
                )}
                className="mt-3"
              />
            </div>
          </div>
        </div>
      ) : null}

      {previewCanReadDetails ? (
        <EntityDetailsShell
          open={Boolean(selectedPreviewId)}
          mode={resolvedDetailsMode}
          title={selectedPreview.fullName}
          subtitle={`${selectedPreview.admissionNo} • ${selectedPreview.gradeLevel} • ${selectedPreview.section}`}
          statusChips={[
            { label: selectedPreview.status, tone: selectedPreview.statusTone },
            { label: selectedPreview.attendance, tone: "outline" },
          ]}
          actions={[
            {
              key: "preview",
              label: "معاينة",
              icon: <Eye className="h-3.5 w-3.5" />,
              onClick: () => setPreviewNotice(`أنت الآن تشاهد تفاصيل ${selectedPreview.fullName}.`),
            },
            ...(previewEditEnabled
              ? [
                  {
                    key: "edit",
                    label: "تعديل",
                    icon: <PencilLine className="h-3.5 w-3.5" />,
                    onClick: () =>
                      setPreviewNotice(`فتحنا وضع التعديل التجريبي لـ ${selectedPreview.fullName}.`),
                  },
                ]
              : []),
            ...(previewDeleteEnabled
              ? [
                  {
                    key: "delete",
                    label: "حذف",
                    icon: <Trash2 className="h-3.5 w-3.5" />,
                    onClick: () =>
                      setPreviewNotice(`هذه معاينة فقط، ولن يتم حذف ${selectedPreview.fullName}.`),
                  },
                ]
              : []),
          ]}
          density={entitySurface.density}
          visualStyle={entitySurface.visualStyle}
          effectsPreset={entitySurface.effectsPreset}
          shapePreset={entitySurface.shapePreset}
          onClose={() => setSelectedPreviewId(null)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.15rem] border border-white/70 bg-background/82 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">الملف المختصر</p>
              <div className="mt-2 space-y-2 text-[11px] text-slate-600 dark:text-white/65">
                <p>الاسم: {selectedPreview.fullName}</p>
                <p>الرقم: {selectedPreview.admissionNo}</p>
                <p>الصف: {selectedPreview.gradeLevel}</p>
                <p>الشعبة: {selectedPreview.section}</p>
              </div>
            </div>
            <div className="rounded-[1.15rem] border border-white/70 bg-background/82 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">تفاصيل إضافية</p>
              <div className="mt-2 space-y-2 text-[11px] text-slate-600 dark:text-white/65">
                <p>ولي الأمر: {selectedPreview.guardian}</p>
                <p>الهاتف: {selectedPreview.phone}</p>
                <p>الحضور: {selectedPreview.attendance}</p>
                <p>{selectedPreview.description}</p>
              </div>
            </div>
          </div>
        </EntityDetailsShell>
      ) : null}
    </div>
  );
}
