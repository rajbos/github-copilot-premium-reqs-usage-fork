import React, { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CopilotUsageData,
  UserBehaviorDataPoint,
  getUserTrendData,
  formatRequestCount,
} from "@/lib/utils";

const SEGMENTS = [
  'Steady Users',
  'Low Engagement Users',
  'Burst Users',
  'Model Explorers',
  'Model Loyalists',
  'Mixed Behavior',
];

type UserTrendsChartProps = {
  rawData: CopilotUsageData[];
  behaviorData: UserBehaviorDataPoint[];
  selectedUser: string | null;
  displayUser: (name: string) => string;
  unitLabel: string;
};

export const UserTrendsChart = React.memo(function UserTrendsChart({
  rawData,
  behaviorData,
  selectedUser,
  displayUser,
  unitLabel,
}: UserTrendsChartProps) {
  const [selectedCohort, setSelectedCohort] = useState<string>('none');

  const cohortUsers = useMemo(() => {
    if (selectedCohort === 'none') return [];
    return behaviorData.filter(p => p.behaviorSegment === selectedCohort).map(p => p.user);
  }, [behaviorData, selectedCohort]);

  const trendData = useMemo(() => {
    if (selectedUser) return getUserTrendData(rawData, [selectedUser]);
    if (selectedCohort !== 'none' && cohortUsers.length) return getUserTrendData(rawData, cohortUsers);
    return [];
  }, [rawData, selectedUser, selectedCohort, cohortUsers]);

  if (!selectedUser && selectedCohort === 'none') {
    return (
      <div className="bg-card p-8 rounded-lg border mb-8 text-center">
        <p className="text-muted-foreground text-sm mb-4">
          Select a user via the user search above, or pick a behavior cohort, to see how their usage
          and model diversity evolve week over week.
        </p>
        <div className="flex justify-center">
          <Select value={selectedCohort} onValueChange={setSelectedCohort}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select a cohort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No cohort</SelectItem>
              {SEGMENTS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  const title = selectedUser
    ? displayUser(selectedUser)
    : `${selectedCohort} cohort (${cohortUsers.length.toLocaleString()} users, averaged per active user)`;

  return (
    <div className="bg-card p-4 rounded-lg border mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="text-sm text-muted-foreground">
          Weekly {unitLabel.toLowerCase()} and unique models for: <span className="font-medium text-foreground">{title}</span>
        </div>
        {!selectedUser && (
          <Select value={selectedCohort} onValueChange={setSelectedCohort}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select a cohort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No cohort</SelectItem>
              {SEGMENTS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {trendData.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No data available for this selection.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={trendData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fill: "var(--foreground)", fontSize: 12 }} tickLine={{ stroke: "var(--border)" }} />
            <YAxis
              yAxisId="left"
              tick={{ fill: "var(--foreground)" }}
              tickLine={{ stroke: "var(--border)" }}
              tickFormatter={(v: number) => formatRequestCount(v)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              allowDecimals={false}
              tick={{ fill: "var(--foreground)" }}
              tickLine={{ stroke: "var(--border)" }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload;
                return (
                  <div className="border rounded-lg bg-background shadow-lg p-3 text-xs">
                    <div className="font-medium mb-2">Week of {label}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span>{selectedUser ? unitLabel : `${unitLabel} per user`}:</span>
                        <span className="font-medium">{formatRequestCount(point.requestsPerUser)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Unique models{selectedUser ? '' : ' per user'}:</span>
                        <span className="font-medium">{point.uniqueModelsPerUser.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                      </div>
                      {!selectedUser && (
                        <div className="flex justify-between gap-4">
                          <span>Active users:</span>
                          <span className="font-medium">{point.activeUsers.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="requestsPerUser"
              name={selectedUser ? unitLabel : `${unitLabel} per user`}
              fill="#8B5CF6"
              opacity={0.85}
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="uniqueModelsPerUser"
              name={selectedUser ? 'Unique models' : 'Unique models per user'}
              stroke="#0EA5E9"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            {!selectedUser && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="activeUsers"
                name="Active users"
                stroke="#16A34A"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});
