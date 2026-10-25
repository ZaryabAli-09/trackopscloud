"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ChartContainer, ChartTooltip, ChartTooltipContent, XAxis } from "@/components/ui/chart";

export function MetricChart({ data, xKey, yKey, label, kind = "area" }: { data: Array<Record<string, string | number>>; xKey: string; yKey: string; label: string; kind?: "area" | "bar" }) {
  const config = { [yKey]: { label, color: "var(--chart-1)" } };
  return <ChartContainer config={config} className="h-64 w-full aspect-auto">{kind === "bar" ? <BarChart data={data} accessibilityLayer><CartesianGrid vertical={false} /><XAxis dataKey={xKey} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey={yKey} fill={`var(--color-${yKey})`} radius={4} /></BarChart> : <AreaChart data={data} accessibilityLayer><CartesianGrid vertical={false} /><XAxis dataKey={xKey} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Area dataKey={yKey} type="monotone" fill={`var(--color-${yKey})`} stroke={`var(--color-${yKey})`} fillOpacity={0.25} /></AreaChart>}</ChartContainer>;
}
