"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  label?: string;
};

export function ThemeToggle({ className, label }: ThemeToggleProps) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={label ? "sm" : "icon"}
          className={cn(
            "relative gap-2 border-white/45 bg-white/65 text-foreground shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
            label ? "h-11 rounded-2xl px-3.5" : "h-11 w-11 rounded-2xl",
            className,
          )}
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-background/85">
            <Sun className="h-[1.15rem] w-[1.15rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.15rem] w-[1.15rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </span>
          {label ? <span className="hidden text-sm font-medium sm:inline">{label}</span> : null}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[10rem] rounded-2xl border-white/45 bg-background/90 p-1.5 shadow-xl backdrop-blur-xl"
      >
        <DropdownMenuItem className="rounded-xl" onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-xl" onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-xl" onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
