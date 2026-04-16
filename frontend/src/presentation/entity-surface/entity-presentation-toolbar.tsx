"use client";

import * as React from "react";
import { Image as ImageIcon, ListChecks, PanelTopOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityViewSwitcher } from "@/presentation/entity-surface/entity-view-switcher";
import type {
  EntitySurfaceAvatarMode,
  EntitySurfaceDensity,
  EntitySurfaceInlineActionsMode,
  EntitySurfaceViewMode,
} from "@/presentation/entity-surface/entity-surface-types";

type EntityPresentationToolbarProps = {
  viewMode: EntitySurfaceViewMode;
  onViewModeChange: (value: EntitySurfaceViewMode) => void;
  density: EntitySurfaceDensity;
  onDensityChange: (value: EntitySurfaceDensity) => void;
  avatarMode: EntitySurfaceAvatarMode;
  onAvatarModeChange: (value: EntitySurfaceAvatarMode) => void;
  inlineActionsMode: EntitySurfaceInlineActionsMode;
  onInlineActionsModeChange: (value: EntitySurfaceInlineActionsMode) => void;
  allowedViewModes?: EntitySurfaceViewMode[];
  className?: string;
};

function MiniToggle({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[0.95rem] border px-3 py-2 text-[11px] font-semibold transition-all",
        active
          ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
          : "border-white/70 bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:bg-white/[0.06] dark:hover:text-white",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

export function EntityPresentationToolbar({
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
  avatarMode,
  onAvatarModeChange,
  inlineActionsMode,
  onInlineActionsModeChange,
  allowedViewModes,
  className,
}: EntityPresentationToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[1.5rem] border border-white/70 bg-white/68 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <EntityViewSwitcher
          value={viewMode}
          onChange={onViewModeChange}
          allowedModes={allowedViewModes}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <MiniToggle
            active={density === "comfortable"}
            icon={Sparkles}
            label="مريح"
            onClick={() => onDensityChange("comfortable")}
          />
          <MiniToggle
            active={density === "balanced"}
            icon={Sparkles}
            label="متوازن"
            onClick={() => onDensityChange("balanced")}
          />
          <MiniToggle
            active={density === "compact"}
            icon={Sparkles}
            label="مضغوط"
            onClick={() => onDensityChange("compact")}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <MiniToggle
          active={avatarMode === "auto"}
          icon={ImageIcon}
          label="صورة"
          onClick={() => onAvatarModeChange("auto")}
        />
        <MiniToggle
          active={avatarMode === "fallback-only"}
          icon={ImageIcon}
          label="رمزي"
          onClick={() => onAvatarModeChange("fallback-only")}
        />
        <MiniToggle
          active={avatarMode === "hidden"}
          icon={ImageIcon}
          label="بدون"
          onClick={() => onAvatarModeChange("hidden")}
        />
        <MiniToggle
          active={inlineActionsMode === "always"}
          icon={PanelTopOpen}
          label="أزرار ظاهرة"
          onClick={() => onInlineActionsModeChange("always")}
        />
        <MiniToggle
          active={inlineActionsMode === "hover"}
          icon={PanelTopOpen}
          label="عند التفاعل"
          onClick={() => onInlineActionsModeChange("hover")}
        />
        <MiniToggle
          active={inlineActionsMode === "minimal"}
          icon={ListChecks}
          label="مصغرة"
          onClick={() => onInlineActionsModeChange("minimal")}
        />
      </div>
    </div>
  );
}
