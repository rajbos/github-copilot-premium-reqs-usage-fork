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
  formatTokens,
} from "@/lib/utils";

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

export const BehaviorSegmentsTable = React.memo(function BehaviorSegmentsTable({
  data,
  behaviorData,
  displayUser,
}: BehaviorSegmentsTableProps) {
  const [selectedSegment, setSelectedSegment] = useState<string>('All');

  const { weeks, weekLabels, counts } = useMemo(() => getUserWeeklyModelCounts(data), [data]);
  const tokenTotals = useMemo(() => getUserTokenTotals(data), [data]);
  const hasTokenData = tokenTotals.size > 0;

  const segments = useMemo(() => {
    const order = Object.keys(BEHAVIOR_COLORS);
    const present = new Set(behaviorData.map(p => p.behaviorSegment));
    return order.filter(s => present.has(s as UserBehaviorDataPoint['behaviorSegment']));
  }, [behaviorData]);

  const rows = useMemo(() => {
    return behaviorData
      .filter(p => selectedSegment === 'All' || p.behaviorSegment === selectedSegment)
      .map(p => ({
        user: p.user,
        segment: p.behaviorSegment,
        weeklyCounts: counts.get(p.user) ?? new Map<string, number>(),
      }));
  }, [behaviorData, counts, selectedSegment]);

  const exportCSV = () => {
    const tokenHeaders = hasTokenData ? ['Input Tokens', 'Output Tokens', 'Cache Read Tokens', 'Cache Write Tokens'] : [];
    const header = ['Username', 'Category', ...tokenHeaders, ...weeks.map(w => `Models ${w} (${weekLabels[w]})`)];
    const lines = rows.map(row => {
      const t = tokenTotals.get(row.user);
      const tokenCells = hasTokenData
        ? [t?.input ?? 0, t?.output ?? 0, t?.cacheRead ?? 0, t?.cacheWrite ?? 0].map(String)
        : [];
      return [
        csvEscape(displayUser(row.user)),
        csvEscape(row.segment),
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Category</TableHead>
              {hasTokenData && (
                <>
                  <TableHead className="text-right">Input tokens</TableHead>
                  <TableHead className="text-right">Output tokens</TableHead>
                  <TableHead className="text-right">Cache read</TableHead>
                  <TableHead className="text-right">Cache write</TableHead>
                </>
              )}
              {weeks.map(w => (
                <TableHead key={w} className="text-right" title={w}>
                  {weekLabels[w]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
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
                {hasTokenData && (() => {
                  const t = tokenTotals.get(row.user);
                  return (
                    <>
                      <TableCell className="text-right" title={(t?.input ?? 0).toLocaleString()}>{formatTokens(t?.input ?? 0)}</TableCell>
                      <TableCell className="text-right" title={(t?.output ?? 0).toLocaleString()}>{formatTokens(t?.output ?? 0)}</TableCell>
                      <TableCell className="text-right" title={(t?.cacheRead ?? 0).toLocaleString()}>{formatTokens(t?.cacheRead ?? 0)}</TableCell>
                      <TableCell className="text-right" title={(t?.cacheWrite ?? 0).toLocaleString()}>{formatTokens(t?.cacheWrite ?? 0)}</TableCell>
                    </>
                  );
                })()}
                {weeks.map(w => (
                  <TableCell key={w} className="text-right">
                    {(row.weeklyCounts.get(w) ?? 0).toLocaleString()}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={2 + (hasTokenData ? 4 : 0) + weeks.length} className="text-center text-muted-foreground">
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
