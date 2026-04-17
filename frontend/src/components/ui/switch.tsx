"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center overflow-hidden rounded-full border border-[color:var(--app-accent-strong)]/55 bg-background/80 p-1 [direction:ltr] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_14px_30px_-22px_rgba(15,23,42,0.45)] backdrop-blur-sm transition-all duration-300 before:pointer-events-none before:absolute before:inset-[2px] before:rounded-full before:bg-gradient-to-l before:from-[color:var(--app-accent-soft)]/85 before:via-transparent before:to-white/35 before:opacity-100 before:transition-opacity before:duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[color:var(--app-accent-color)]/75 data-[state=checked]:bg-[color:var(--app-accent-color)]/92 data-[state=checked]:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_34px_-24px_color-mix(in_oklab,var(--app-accent-color)_68%,transparent)] data-[state=checked]:before:from-white/16 data-[state=checked]:before:via-white/10 data-[state=checked]:before:to-transparent data-[state=unchecked]:bg-background/78 dark:data-[state=unchecked]:bg-slate-950/70",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none relative z-[1] ml-auto block h-5 w-5 rounded-full border border-white/80 bg-gradient-to-b from-white via-white to-slate-100 shadow-[0_8px_18px_-8px_rgba(15,23,42,0.45)] ring-0 transition-transform duration-300 will-change-transform data-[state=checked]:-translate-x-5 data-[state=unchecked]:translate-x-0 dark:border-white/15 dark:from-slate-50 dark:via-slate-200 dark:to-slate-300"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }


