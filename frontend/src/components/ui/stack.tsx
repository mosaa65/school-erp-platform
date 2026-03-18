import * as React from "react";

export type StackProps = {
  direction?: "row" | "col";
  gap?: string;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  className?: string;
  children: React.ReactNode;
};

const justifyMap: Record<NonNullable<StackProps["justify"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

const alignMap: Record<NonNullable<StackProps["align"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

export function Stack({
  direction = "col",
  gap = "gap-2",
  align = "stretch",
  justify = "start",
  className,
  children,
}: StackProps) {
  const directionClass = direction === "col" ? "flex-col" : "flex-row";
  return (
    <div className={`flex ${directionClass} ${gap} ${justifyMap[justify]} ${alignMap[align]} ${className ?? ""}`}>
      {children}
    </div>
  );
}
