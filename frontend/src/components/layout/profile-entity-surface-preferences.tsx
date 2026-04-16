"use client";

import * as React from "react";
import {
  BookOpenText,
  GraduationCap,
  LayoutTemplate,
  PanelsTopLeft,
  ScanSearch,
  Sparkles,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useEntitySurface } from "@/hooks/use-entity-surface";
import { EntityDetailsShell } from "@/presentation/entity-surface/entity-details-shell";
import { EntityPresentationToolbar } from "@/presentation/entity-surface/entity-presentation-toolbar";
import { EntitySurfaceCard } from "@/presentation/entity-surface/entity-surface-card";
import { EntitySurfaceGrid } from "@/presentation/entity-surface/entity-surface-grid";
import { EntitySurfaceQuickActions } from "@/presentation/entity-surface/entity-surface-quick-actions";
import { EntitySurfaceRow } from "@/presentation/entity-surface/entity-surface-row";
import type {
  EntityDetailsMode,
  EntitySurfaceQuickAction,
} from "@/presentation/entity-surface/entity-surface-types";

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
    description: "طالب نشط ويحتاج اختصارات سريعة للتعديل والحذف وفتح الملف الدراسي.",
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
    description: "مثال لبطاقة أكثر حساسية تحتاج إبراز الحالة والتنبيه دون إغراق البطاقة.",
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
    description: "مثال للبطاقة الذكية مع بيانات مختصرة ثم تفاصيل أوسع داخل الواجهة المركزة.",
    avatarFallback: "يص",
  },
];

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
    <div className="rounded-[1.1rem] border border-white/70 bg-background/80 px-3 py-3 text-slate-900 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-black/25 dark:text-white">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-white/55">
        <Icon className="h-3 w-3 text-[color:var(--app-accent-color)]" />
        <span>{label}</span>
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold">{value}</p>
    </div>
  );
}

function GlassShell({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.25rem] border border-white/70 bg-white/68 p-3 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_30px_-24px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[color:var(--app-accent-color)]" />
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="h-px flex-1 bg-black/[0.06] dark:bg-white/10" />
      </div>
      {children}
    </section>
  );
}

function SegmentedOptions<TValue extends string>({
  items,
  selected,
  onSelect,
}: {
  items: Array<{ value: TValue; label: string; description: string }>;
  selected: TValue;
  onSelect: (value: TValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
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
                : "border-white/70 bg-background/78 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:text-white/75 dark:hover:bg-white/[0.06]",
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

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/70 bg-background/78 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-right">
        <p className="text-xs font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-white/55">
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function resolvePreviewDetailsMode(value: string, compact: boolean): EntityDetailsMode {
  if (value === "screen-default") {
    return compact ? "inline" : "dialog";
  }

  return value as EntityDetailsMode;
}

export function ProfileEntitySurfacePreferences({
  className,
}: ProfileEntitySurfacePreferencesProps) {
  const entitySurface = useEntitySurface();
  const [selectedPreviewId, setSelectedPreviewId] = React.useState<string | null>(null);
  const [contextPreviewId, setContextPreviewId] = React.useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = React.useState<string | null>(null);
  const selectedPreview =
    PREVIEW_STUDENTS.find((item) => item.id === selectedPreviewId) ?? PREVIEW_STUDENTS[0];
  const resolvedDetailsMode = resolvePreviewDetailsMode(
    entitySurface.detailsOpenMode,
    entitySurface.defaultViewMode === "dense-row",
  );
  const usesBlurBackdrop = entitySurface.longPressMode === "enabled-with-blur";

  const buildQuickActions = React.useCallback(
    (student: PreviewStudent): EntitySurfaceQuickAction[] => [
      {
        key: "edit",
        label: "تعديل",
        icon: <PanelsTopLeft className="h-3.5 w-3.5" />,
        onClick: () => setPreviewNotice(`تم تشغيل تعديل تجريبي لبطاقة ${student.fullName}.`),
      },
      {
        key: "details",
        label: "تفاصيل",
        icon: <BookOpenText className="h-3.5 w-3.5" />,
        tone: "accent",
        onClick: () => {
          setSelectedPreviewId(student.id);
          setContextPreviewId(null);
        },
      },
      {
        key: "delete",
        label: "حذف",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        tone: "danger",
        onClick: () => setPreviewNotice(`هذه معاينة فقط، ولن يتم حذف ${student.fullName}.`),
      },
    ],
    [],
  );

  const renderPreviewCard = (student: PreviewStudent) => {
    const quickActions = buildQuickActions(student);
    const sharedProps = {
      density: entitySurface.density,
      richness: entitySurface.richness,
      visualStyle: entitySurface.visualStyle,
      effectsPreset: entitySurface.effectsPreset,
      shapePreset: entitySurface.shapePreset,
      inlineActionsMode: entitySurface.inlineActionsMode,
      motionPreset: entitySurface.motionPreset,
      reducedMotion: entitySurface.reducedMotion,
      avatarMode: entitySurface.avatarMode,
      contextOpen: contextPreviewId === student.id,
      detailsAffordance: true,
      onClick: () => setSelectedPreviewId(student.id),
    } as const;

    if (entitySurface.defaultViewMode === "dense-row") {
      return (
        <EntitySurfaceRow
          key={student.id}
          title={student.fullName}
          subtitle={`${student.admissionNo} • ${student.gradeLevel}`}
          meta={`${student.section} • ${student.attendance}`}
          avatar={{
            fallback: student.avatarFallback,
            alt: student.fullName,
            icon: <UserCircle2 className="h-5 w-5" />,
            colorSeed: student.admissionNo,
          }}
          statusChips={[
            { label: student.status, tone: student.statusTone },
            { label: student.section, tone: "outline" },
          ]}
          quickActions={quickActions}
          {...sharedProps}
        />
      );
    }

    return (
      <EntitySurfaceCard
        key={student.id}
        title={student.fullName}
        subtitle={`${student.admissionNo} • ${student.gradeLevel}`}
        description={student.description}
        avatar={{
          fallback: student.avatarFallback,
          alt: student.fullName,
          icon: <GraduationCap className="h-5 w-5" />,
          colorSeed: student.admissionNo,
        }}
        fields={[
          { label: "الشعبة", value: student.section },
          { label: "الحضور", value: student.attendance },
          { label: "ولي الأمر", value: student.guardian },
        ]}
        statusChips={[
          { label: student.status, tone: student.statusTone },
          { label: student.section, tone: "outline" },
        ]}
        quickActions={quickActions}
        viewMode={entitySurface.defaultViewMode}
        longPressMode={entitySurface.longPressMode}
        onLongPress={() => {
          if (entitySurface.longPressMode === "disabled") {
            return;
          }
          setContextPreviewId(student.id);
        }}
        {...sharedProps}
      />
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <SummaryTile
          label="العرض"
          value={
            entitySurface.viewModeOptions.find((item) => item.value === entitySurface.defaultViewMode)?.label ??
            entitySurface.defaultViewMode
          }
          icon={LayoutTemplate}
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
          label="الاختصارات"
          value={
            entitySurface.longPressOptions.find((item) => item.value === entitySurface.longPressMode)?.label ??
            entitySurface.longPressMode
          }
          icon={ScanSearch}
        />
        <SummaryTile
          label="الأسلوب"
          value={
            entitySurface.visualStyleOptions.find((item) => item.value === entitySurface.visualStyle)?.label ??
            entitySurface.visualStyle
          }
          icon={Sparkles}
        />
      </div>

      <GlassShell title="معاينة بطاقات الطلاب" icon={LayoutTemplate}>
        <p className="mb-3 text-[11px] leading-5 text-slate-500 dark:text-white/55">
          هذه معاينة حيّة للنظام الجديد قبل ربطه بواجهة الطلاب الفعلية. اضغط على البطاقة لفتح
          التفاصيل، أو اضغط مطولًا لفتح الاختصارات السريعة.
        </p>

        <EntityPresentationToolbar
          viewMode={entitySurface.defaultViewMode}
          onViewModeChange={entitySurface.setDefaultViewMode}
          density={entitySurface.density}
          onDensityChange={entitySurface.setDensity}
          avatarMode={entitySurface.avatarMode}
          onAvatarModeChange={entitySurface.setAvatarMode}
          inlineActionsMode={entitySurface.inlineActionsMode}
          onInlineActionsModeChange={entitySurface.setInlineActionsMode}
        />

        {previewNotice ? (
          <div className="mt-3 rounded-[1rem] border border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] px-3 py-2 text-xs text-[color:var(--app-accent-color)]">
            {previewNotice}
          </div>
        ) : null}

        <EntitySurfaceGrid
          className="mt-3"
          viewMode={entitySurface.defaultViewMode}
          density={entitySurface.density}
          richness={entitySurface.richness}
          visualStyle={entitySurface.visualStyle}
          effectsPreset={entitySurface.effectsPreset}
          shapePreset={entitySurface.shapePreset}
          inlineActionsMode={entitySurface.inlineActionsMode}
        >
          {PREVIEW_STUDENTS.map((student) => renderPreviewCard(student))}
        </EntitySurfaceGrid>
      </GlassShell>

      <div className="grid gap-3 xl:grid-cols-2">
        <GlassShell title="المحتوى والشكل" icon={PanelsTopLeft}>
          <div className="space-y-2">
            <SegmentedOptions
              items={entitySurface.richnessOptions}
              selected={entitySurface.richness}
              onSelect={entitySurface.setRichness}
            />
            <SegmentedOptions
              items={entitySurface.visualStyleOptions}
              selected={entitySurface.visualStyle}
              onSelect={entitySurface.setVisualStyle}
            />
            <SegmentedOptions
              items={entitySurface.effectsOptions}
              selected={entitySurface.effectsPreset}
              onSelect={entitySurface.setEffectsPreset}
            />
            <SegmentedOptions
              items={entitySurface.shapeOptions}
              selected={entitySurface.shapePreset}
              onSelect={entitySurface.setShapePreset}
            />
          </div>
        </GlassShell>

        <GlassShell title="التفاصيل والتفاعل" icon={ScanSearch}>
          <div className="space-y-2">
            <SegmentedOptions
              items={entitySurface.detailsOpenModeOptions}
              selected={entitySurface.detailsOpenMode}
              onSelect={entitySurface.setDetailsOpenMode}
            />
            <SegmentedOptions
              items={entitySurface.longPressOptions}
              selected={entitySurface.longPressMode}
              onSelect={entitySurface.setLongPressMode}
            />
            <SegmentedOptions
              items={entitySurface.motionOptions}
              selected={entitySurface.motionPreset}
              onSelect={entitySurface.setMotionPreset}
            />
            <ToggleRow
              label="تقليل الحركة"
              description="يخفف التكبير والانتقالات والـ blur في المعاينة وفي النظام لاحقًا."
              checked={entitySurface.reducedMotion}
              onCheckedChange={entitySurface.setReducedMotion}
            />
          </div>
        </GlassShell>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-2xl"
        onClick={entitySurface.resetPreferences}
      >
        إعادة إعدادات بطاقات العرض
      </Button>

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
                اختصارات سريعة
              </p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
                هذه معاينة للضغط المطول على البطاقة مع إبراز الإجراءات الأكثر استخدامًا.
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
            key: "edit",
            label: "تعديل",
            icon: <PanelsTopLeft className="h-3.5 w-3.5" />,
            onClick: () => setPreviewNotice(`فتحنا وضع التعديل التجريبي لـ ${selectedPreview.fullName}.`),
          },
        ]}
        density={entitySurface.density}
        visualStyle={entitySurface.visualStyle}
        effectsPreset={entitySurface.effectsPreset}
        shapePreset={entitySurface.shapePreset}
        onClose={() => setSelectedPreviewId(null)}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.15rem] border border-white/70 bg-background/78 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">ملخص السجل</p>
            <div className="mt-2 space-y-2 text-[11px] text-slate-600 dark:text-white/65">
              <p>الاسم: {selectedPreview.fullName}</p>
              <p>الرقم: {selectedPreview.admissionNo}</p>
              <p>الصف: {selectedPreview.gradeLevel}</p>
              <p>الشعبة: {selectedPreview.section}</p>
            </div>
          </div>
          <div className="rounded-[1.15rem] border border-white/70 bg-background/78 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">معلومات إضافية</p>
            <div className="mt-2 space-y-2 text-[11px] text-slate-600 dark:text-white/65">
              <p>ولي الأمر: {selectedPreview.guardian}</p>
              <p>الهاتف: {selectedPreview.phone}</p>
              <p>الحضور: {selectedPreview.attendance}</p>
              <p>{selectedPreview.description}</p>
            </div>
          </div>
        </div>
      </EntityDetailsShell>
    </div>
  );
}
