import React, { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
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
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
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

  const rows = useMemo<BehaviorRow[]>(() => {
    return behaviorData
      .filter(p => selectedSegment === 'All' || p.behaviorSegment === selectedSegment)
      .map(p => {
        const t = tokenTotals.get(p.user);
        return {
          user: p.user,
          segment: p.behaviorSegment,
          weeklyCounts: counts.get(p.user) ?? new Map<string, number>(),
          input: t?.input ?? 0,
          output: t?.output ?? 0,
          cacheRead: t?.cacheRead ?? 0,
          cacheWrite: t?.cacheWrite ?? 0,
        };
      });
  }, [behaviorData, counts, selectedSegment, tokenTotals]);

  const { sortColumn, sortDirection, handleSort, sortedItems: sortedRows } =
    useSortableTable<BehaviorRow, keyof BehaviorRow>(rows, null, 'desc');


  const exportCSV = () => {
    const tokenHeaders = hasTokenData ? ['Input Tokens', 'Output Tokens', 'Cache Read Tokens', 'Cache Write Tokens'] : [];
    const header = ['Username', 'Category', ...tokenHeaders, ...weeks.map(w => `Models ${w} (${weekLabels[w]})`)];
    const lines = sortedRows.map(row => {
      const tokenCells = hasTokenData
        ? [row.input, row.output, row.cacheRead, row.cacheWrite].map(String)
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
              <SortableTableHead column="user" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort}>User</SortableTableHead>
              <SortableTableHead column="segment" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort}>Category</SortableTableHead>
              {hasTokenData && (
                <>
                  <SortableTableHead column="input" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Input tokens</SortableTableHead>
                  <SortableTableHead column="output" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Output tokens</SortableTableHead>
                  <SortableTableHead column="cacheRead" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Cache read</SortableTableHead>
                  <SortableTableHead column="cacheWrite" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Cache write</SortableTableHead>
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
                {hasTokenData && (
                  <>
                    <TableCell className="text-right" title={row.input.toLocaleString()}>{formatTokens(row.input)}</TableCell>
                    <TableCell className="text-right" title={row.output.toLocaleString()}>{formatTokens(row.output)}</TableCell>
                    <TableCell className="text-right" title={row.cacheRead.toLocaleString()}>{formatTokens(row.cacheRead)}</TableCell>
                    <TableCell className="text-right" title={row.cacheWrite.toLocaleString()}>{formatTokens(row.cacheWrite)}</TableCell>
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
