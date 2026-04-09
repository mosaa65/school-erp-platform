"use client";

import * as React from "react";
import { Check, Menu, MonitorSmartphone, PanelRight, Rows3, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigationPreferences } from "@/hooks/use-navigation-preferences";
import {
  getHeaderMenuButtonVisibilityLabel,
  getMobileNavigatorPresentationLabel,
  getNavigationDensityLabel,
  getNavigationLayoutLabel,
  getNavigationLandingPageLabel,
} from "@/navigation/navigation-preferences";

type ProfileNavigationSectionProps = {
  className?: string;
};

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
    <div className="rounded-[1.05rem] border border-white/70 bg-background/80 px-2 py-2.5 text-slate-900 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-black/25 dark:text-white">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-white/55">
        <Icon className="h-3 w-3 text-[color:var(--app-accent-color)]" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold">{value}</p>
    </div>
  );
}

function ControlBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.25rem] border border-white/70 bg-white/68 p-3 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_12px_30px_-24px_rgba(15,23,42,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="h-px flex-1 bg-black/[0.06] dark:bg-white/10" />
      </div>
      {children}
    </section>
  );
}

export function ProfileNavigationSection({ className }: ProfileNavigationSectionProps) {
  const navigation = useNavigationPreferences();

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary tiles — 2 columns on mobile, more on larger screens */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
        <SummaryTile
          label="نمط الملاحة"
          value={getNavigationLayoutLabel(navigation.layoutMode)}
          icon={PanelRight}
        />
        <SummaryTile
          label="تنقل الجوال"
          value={getMobileNavigatorPresentationLabel(navigation.mobilePresentation)}
          icon={Smartphone}
        />
        <SummaryTile
          label="الكثافة"
          value={getNavigationDensityLabel(navigation.density)}
          icon={Rows3}
        />
        <SummaryTile
          label="ابدأ من"
          value={getNavigationLandingPageLabel(navigation.landingPage)}
          icon={MonitorSmartphone}
        />
        <SummaryTile
          label="زر الهيدر"
          value={getHeaderMenuButtonVisibilityLabel(navigation.showHeaderMenuButton)}
          icon={Menu}
        />
      </div>

      <ControlBlock title="نمط الملاحة">
        <div className="grid gap-2 sm:grid-cols-3">
          {navigation.layoutOptions.map((option) => {
            const active = navigation.layoutMode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={!option.available}
                onClick={() => navigation.setLayoutMode(option.value)}
                className={cn(
                  "rounded-[1rem] border px-3 py-3 text-right transition-all",
                  option.available
                    ? active
                      ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                      : "border-white/70 bg-background/75 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    : "cursor-not-allowed border-dashed border-slate-300 bg-slate-50/80 text-slate-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/35",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{option.label}</span>
                  {active ? <Check className="h-4 w-4" /> : null}
                </div>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
                  {option.description}
                </p>
                {!option.available ? (
                  <span className="mt-2 inline-flex rounded-full border border-dashed px-2 py-1 text-[10px]">
                    قريبًا
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </ControlBlock>

      <div className="grid gap-3 xl:grid-cols-2">
        <ControlBlock title="تنقل الجوال">
          <div className="grid grid-cols-2 gap-2">
            {navigation.mobilePresentationOptions.map((option) => {
              const active = navigation.mobilePresentation === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => navigation.setMobilePresentation(option.value)}
                  className={cn(
                    "rounded-[1rem] border px-3 py-3 text-right transition-all",
                    active
                      ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                      : "border-white/70 bg-background/75 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white",
                  )}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </ControlBlock>

        <ControlBlock title="كثافة العناصر">
          <div className="grid grid-cols-2 gap-2">
            {navigation.densityOptions.map((option) => {
              const active = navigation.density === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => navigation.setDensity(option.value)}
                  className={cn(
                    "rounded-[1rem] border px-3 py-3 text-right transition-all",
                    active
                      ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                      : "border-white/70 bg-background/75 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white",
                  )}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </ControlBlock>
      </div>

      <ControlBlock title="ابدأ من">
        <div className="grid gap-2 sm:grid-cols-3">
          {navigation.landingPageOptions.map((option) => {
            const active = navigation.landingPage === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={!option.available}
                onClick={() => navigation.setLandingPage(option.value)}
                className={cn(
                  "rounded-[1rem] border px-3 py-3 text-right transition-all",
                  option.available
                    ? active
                      ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                      : "border-white/70 bg-background/75 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    : "cursor-not-allowed border-dashed border-slate-300 bg-slate-50/80 text-slate-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/35",
                )}
              >
                <span className="text-sm font-semibold">{option.label}</span>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
                  {option.description}
                </p>
                {!option.available ? (
                  <span className="mt-2 inline-flex rounded-full border border-dashed px-2 py-1 text-[10px]">
                    قريبًا
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </ControlBlock>

      <ControlBlock title="زر فتح القائمة في الهيدر">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigation.setShowHeaderMenuButton(true)}
            className={cn(
              "rounded-[1rem] border px-3 py-3 text-right transition-all",
              navigation.showHeaderMenuButton
                ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                : "border-white/70 bg-background/75 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white",
            )}
          >
            <span className="text-sm font-semibold">إظهار الزر</span>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
              يظهر زر القائمة في الهيدر على الجوال.
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigation.setShowHeaderMenuButton(false)}
            className={cn(
              "rounded-[1rem] border px-3 py-3 text-right transition-all",
              !navigation.showHeaderMenuButton
                ? "border-[color:var(--app-accent-strong)] bg-[color:var(--app-accent-soft)] text-[color:var(--app-accent-color)]"
                : "border-white/70 bg-background/75 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white",
            )}
          >
            <span className="text-sm font-semibold">إخفاء الزر</span>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
              إخفاء زر الهيدر والاكتفاء بزر التنقل السفلي.
            </p>
          </button>
        </div>
      </ControlBlock>

      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full rounded-[1.1rem] border border-white/70 bg-background/75 text-slate-800 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] dark:hover:text-white"
        onClick={() => navigation.resetNavigationPreferences()}
      >
        إعادة إعدادات التنقل
      </Button>
    </div>
  );
}
