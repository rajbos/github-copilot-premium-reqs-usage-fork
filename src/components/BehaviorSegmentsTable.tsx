import React, { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CopilotUsageData,
  UserBehaviorDataPoint,
  getUserWeeklyModelCounts,
  getUserTokenTotals,
  getUserActivityStats,
  formatTokens,
} from "@/lib/utils";
import { useSortableTable } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/SortableTableHead";

const BEHAVIOR_COLORS: Record<string, string> = {
  'Steady Users': '#16A34A',
  'Low Engagement Users': '#64748B',
  'Burst Users': '#DC2626',
  'Model Explorers': '#0EA5E9',
  'Model Loyalists': '#D97706',
  'Mixed Behavior': '#7C3AED',
};

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

type BehaviorSegmentsTableProps = {
  data: CopilotUsageData[];
  behaviorData: UserBehaviorDataPoint[];
  displayUser: (name: string) => string;
};

type BehaviorRow = {
  user: string;
  segment: string;
  weeklyCounts: Map<string, number>;
  activeDays: number;
  firstWeek: string;
  firstWeekLabel: string;
  totalTokens: number;
  utilizationPct: number;
};

export const BehaviorSegmentsTable = React.memo(function BehaviorSegmentsTable({
  data,
  behaviorData,
  displayUser,
}: BehaviorSegmentsTableProps) {
  const [selectedSegment, setSelectedSegment] = useState<string>('All');

  const { weeks, weekLabels, counts } = useMemo(() => getUserWeeklyModelCounts(data), [data]);
  const tokenTotals = useMemo(() => getUserTokenTotals(data), [data]);
  const activityStats = useMemo(() => getUserActivityStats(data), [data]);
  const hasTokenData = tokenTotals.size > 0;

  const segments = useMemo(() => {
    const order = Object.keys(BEHAVIOR_COLORS);
    const present = new Set(behaviorData.map(p => p.behaviorSegment));
    return order.filter(s => present.has(s as UserBehaviorDataPoint['behaviorSegment']));
  }, [behaviorData]);

  const rows = useMemo<BehaviorRow[]>(() => {
    let grandTotal = 0;
    for (const t of tokenTotals.values()) {
      grandTotal += t.input + t.output + t.cacheRead + t.cacheWrite;
    }
    return behaviorData
      .filter(p => selectedSegment === 'All' || p.behaviorSegment === selectedSegment)
      .map(p => {
        const t = tokenTotals.get(p.user);
        const totalTokens = t ? t.input + t.output + t.cacheRead + t.cacheWrite : 0;
        const activity = activityStats.get(p.user);
        return {
          user: p.user,
          segment: p.behaviorSegment,
          weeklyCounts: counts.get(p.user) ?? new Map<string, number>(),
          activeDays: activity?.activeDays ?? 0,
          firstWeek: activity?.firstWeek ?? '',
          firstWeekLabel: activity?.firstWeekLabel ?? '',
          totalTokens,
          utilizationPct: grandTotal > 0 ? (totalTokens / grandTotal) * 100 : 0,
        };
      });
  }, [behaviorData, counts, selectedSegment, tokenTotals, activityStats]);

  const { sortColumn, sortDirection, handleSort, sortedItems: sortedRows } =
    useSortableTable<BehaviorRow, keyof BehaviorRow>(rows, null, 'desc');


  const exportCSV = () => {
    const tokenHeaders = hasTokenData ? ['Total Tokens', 'Token Utilization %'] : [];
    const header = ['Username', 'Category', 'Active Days', 'First Week', ...tokenHeaders, ...weeks.map(w => `Models ${w} (${weekLabels[w]})`)];
    const lines = sortedRows.map(row => {
      const tokenCells = hasTokenData
        ? [String(row.totalTokens), row.utilizationPct.toFixed(1)]
        : [];
      return [
        csvEscape(displayUser(row.user)),
        csvEscape(row.segment),
        String(row.activeDays),
        csvEscape(row.firstWeekLabel),
        ...tokenCells,
        ...weeks.map(w => String(row.weeklyCounts.get(w) ?? 0)),
      ].join(',');
    });
    const csv = [header.map(csvEscape).join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-behavior-segments-${selectedSegment === 'All' ? 'all' : selectedSegment.toLowerCase().replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card p-4 rounded-lg border mb-8">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {['All', ...segments].map(segment => {
          const isActive = selectedSegment === segment;
          return (
            <button
              key={segment}
              onClick={() => setSelectedSegment(segment)}
              className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 cursor-pointer select-none transition-opacity ${
                isActive ? 'ring-2 ring-offset-1 ring-primary' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: segment === 'All' ? '#0F172A' : (BEHAVIOR_COLORS[segment] || '#7C3AED') }}
              />
              <span className="font-medium">{segment}</span>
            </button>
          );
        })}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV ({rows.length.toLocaleString()} users)
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <p className="text-xs text-muted-foreground mb-2">
          Weekly columns show the number of distinct models used per ISO week (week start date). Active days = distinct days with usage; First week = first ISO week with usage. Utilization % is each user's share of all tokens (input + output + cache read + cache write).
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead column="user" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort}>User</SortableTableHead>
              <SortableTableHead column="segment" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort}>Category</SortableTableHead>
              <SortableTableHead column="activeDays" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Active days</SortableTableHead>
              <SortableTableHead column="firstWeek" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort}>First week</SortableTableHead>
              {hasTokenData && (
                <>
                  <SortableTableHead column="totalTokens" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Total tokens</SortableTableHead>
                  <SortableTableHead column="utilizationPct" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Utilization %</SortableTableHead>
                </>
              )}
              {weeks.map(w => (
                <TableHead key={w} className="text-right" title={`Distinct models used in week ${w}`}>
                  <span title={`Distinct models used in week ${w}`}>{weekLabels[w]}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map(row => (
              <TableRow key={row.user}>
                <TableCell className="font-medium">{displayUser(row.user)}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: BEHAVIOR_COLORS[row.segment] || '#7C3AED' }}
                    />
                    {row.segment}
                  </span>
                </TableCell>
                <TableCell className="text-right">{row.activeDays.toLocaleString()}</TableCell>
                <TableCell title={row.firstWeek}>{row.firstWeekLabel}</TableCell>
                {hasTokenData && (
                  <>
                    <TableCell className="text-right" title={row.totalTokens.toLocaleString()}>{formatTokens(row.totalTokens)}</TableCell>
                    <TableCell className="text-right">{row.utilizationPct.toLocaleString('en-US', { maximumFractionDigits: 1 })}%</TableCell>
                  </>
                )}
                {weeks.map(w => (
                  <TableCell key={w} className="text-right">
                    {(row.weeklyCounts.get(w) ?? 0).toLocaleString()}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={4 + (hasTokenData ? 2 : 0) + weeks.length} className="text-center text-muted-foreground">
                  No users in this category.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});
