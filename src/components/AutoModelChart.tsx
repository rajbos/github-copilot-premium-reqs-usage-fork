import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CopilotUsageData, getAutoModelUsageData, formatRequestCount } from "@/lib/utils";

const AUTO_COLOR = "#0EA5E9"; // sky blue
const SPECIFIC_COLOR = "#8B5CF6"; // purple

type AutoModelChartProps = {
  data: CopilotUsageData[];
  unitLabel: string;
};

export const AutoModelChart = React.memo(function AutoModelChart({ data, unitLabel }: AutoModelChartProps) {
  const summary = useMemo(() => getAutoModelUsageData(data), [data]);

  if (!summary.hasAutoData) return null;

  return (
    <div className="bg-card p-4 rounded-lg border mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">Auto model share</div>
          <div className="text-2xl font-bold" style={{ color: AUTO_COLOR }}>
            {summary.autoPct.toLocaleString(undefined, { maximumFractionDigits: 1 })}%
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">Auto {unitLabel}</div>
          <div className="text-2xl font-bold">{formatRequestCount(summary.totalAuto)}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">Specific model {unitLabel}</div>
          <div className="text-2xl font-bold">{formatRequestCount(summary.totalSpecific)}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={summary.daily} margin={{ top: 8, right: 8, left: 8, bottom: 8 }} stackOffset="expand">
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fill: "var(--foreground)", fontSize: 12 }} tickLine={{ stroke: "var(--border)" }} />
          <YAxis
            tick={{ fill: "var(--foreground)" }}
            tickLine={{ stroke: "var(--border)" }}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload;
              return (
                <div className="border rounded-lg bg-background shadow-lg p-3 text-xs">
                  <div className="font-medium mb-2">{label}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4">
                      <span>Auto models:</span>
                      <span className="font-medium">
                        {point.autoPct.toLocaleString(undefined, { maximumFractionDigits: 1 })}% ({formatRequestCount(point.autoRequests)})
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Specific models:</span>
                      <span className="font-medium">
                        {point.specificPct.toLocaleString(undefined, { maximumFractionDigits: 1 })}% ({formatRequestCount(point.specificRequests)})
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend />
          <Bar dataKey="autoRequests" name="Auto models" stackId="usage" fill={AUTO_COLOR} />
          <Bar dataKey="specificRequests" name="Specific models" stackId="usage" fill={SPECIFIC_COLOR} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
