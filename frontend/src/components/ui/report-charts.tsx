"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type ChartDatum = {
  name: string;
  value: number;
  fill?: string;
};

const CHART_PALETTE = [
  "var(--app-accent-color)",
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export function ReportBarChart({
  data,
  className,
}: {
  data: ChartDatum[];
  className?: string;
}) {
  return (
    <div className={cn("h-[280px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.08)" }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.2)",
              background: "rgba(255,255,255,0.96)",
            }}
          />
          <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={26}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.fill ?? CHART_PALETTE[index % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportPieChart({
  data,
  className,
}: {
  data: ChartDatum[];
  className?: string;
}) {
  return (
    <div className={cn("h-[280px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.2)",
              background: "rgba(255,255,255,0.96)",
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={72}
            outerRadius={108}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.fill ?? CHART_PALETTE[index % CHART_PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
