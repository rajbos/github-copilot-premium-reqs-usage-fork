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
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CopilotUsageData,
  getTokenUsageData,
  getModelTokenStats,
  ModelTokenStats,
  formatTokens,
} from "@/lib/utils";
import { useSortableTable } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/SortableTableHead";

const TOKEN_COLORS = {
  input: "#8B5CF6",       // purple
  output: "#0EA5E9",      // sky blue
  cacheRead: "#16A34A",   // green
  cacheWrite: "#F59E0B",  // amber
  cacheHitRate: "#DC2626",// red
};

type TokenUsageChartProps = {
  data: CopilotUsageData[];
};

export const TokenUsageChart = React.memo(function TokenUsageChart({ data }: TokenUsageChartProps) {
  const summary = useMemo(() => getTokenUsageData(data), [data]);
  const modelStats = useMemo(() => getModelTokenStats(data), [data]);
  const [scale, setScale] = useState<'linear' | 'log'>('linear');
  const { sortColumn, sortDirection, handleSort, sortedItems: sortedModelStats } =
    useSortableTable<ModelTokenStats, keyof ModelTokenStats>(modelStats, null, 'desc');

  if (!summary.hasTokenData) return null;

  const totalTokens = summary.totalInput + summary.totalOutput + summary.totalCacheRead + summary.totalCacheWrite;
  // Cache read/write tokens are typically orders of magnitude larger than
  // input/output, so on a linear scale the input/output bars can shrink to
  // the point of being invisible. A log scale keeps all series legible.
  const logDaily = useMemo(
    () => summary.daily.map(d => ({
      ...d,
      input: d.input > 0 ? d.input : undefined,
      output: d.output > 0 ? d.output : undefined,
      cacheRead: d.cacheRead > 0 ? d.cacheRead : undefined,
      cacheWrite: d.cacheWrite > 0 ? d.cacheWrite : undefined,
    })),
    [summary.daily]
  );

  return (
    <div className="bg-card p-4 rounded-lg border mb-8">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
        <div className="rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">Total tokens</div>
          <div className="text-2xl font-bold" title={totalTokens.toLocaleString()}>{formatTokens(totalTokens)}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">Input</div>
          <div className="text-2xl font-bold" style={{ color: TOKEN_COLORS.input }} title={summary.totalInput.toLocaleString()}>
            {formatTokens(summary.totalInput)}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">Output</div>
          <div className="text-2xl font-bold" style={{ color: TOKEN_COLORS.output }} title={summary.totalOutput.toLocaleString()}>
            {formatTokens(summary.totalOutput)}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">Cache read / write</div>
          <div className="text-2xl font-bold" title={`${summary.totalCacheRead.toLocaleString()} / ${summary.totalCacheWrite.toLocaleString()}`}>
            <span style={{ color: TOKEN_COLORS.cacheRead }}>{formatTokens(summary.totalCacheRead)}</span>
            <span className="text-muted-foreground text-lg"> / </span>
            <span style={{ color: TOKEN_COLORS.cacheWrite }}>{formatTokens(summary.totalCacheWrite)}</span>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm text-muted-foreground">Cache hit rate</div>
          <div className="text-2xl font-bold" style={{ color: TOKEN_COLORS.cacheHitRate }}>
            {summary.overallCacheHitRate.toLocaleString(undefined, { maximumFractionDigits: 1 })}%
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mb-2">
        <span className="text-xs text-muted-foreground">
          Y-axis scale:
        </span>
        <div className="inline-flex rounded-md border overflow-hidden text-xs">
          <button
            className={`px-2 py-1 ${scale === 'linear' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            onClick={() => setScale('linear')}
          >
            Linear
          </button>
          <button
            className={`px-2 py-1 ${scale === 'log' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            onClick={() => setScale('log')}
            title="Log scale keeps small series (e.g. Input/Output) visible alongside much larger Cache read/write bars"
          >
            Log
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={scale === 'log' ? logDaily : summary.daily} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fill: "var(--foreground)", fontSize: 12 }} tickLine={{ stroke: "var(--border)" }} />
          <YAxis
            yAxisId="left"
            scale={scale === 'log' ? 'log' : 'linear'}
            domain={scale === 'log' ? ['auto', 'auto'] : [0, 'auto']}
            allowDataOverflow={scale === 'log'}
            tick={{ fill: "var(--foreground)" }}
            tickLine={{ stroke: "var(--border)" }}
            tickFormatter={(v: number) => formatTokens(v)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: "var(--foreground)" }}
            tickLine={{ stroke: "var(--border)" }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload;
              return (
                <div className="border rounded-lg bg-background shadow-lg p-3 text-xs">
                  <div className="font-medium mb-2">{label}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4"><span>Input:</span><span className="font-medium">{(point.input ?? 0).toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span>Output:</span><span className="font-medium">{(point.output ?? 0).toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span>Cache read:</span><span className="font-medium">{(point.cacheRead ?? 0).toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span>Cache write:</span><span className="font-medium">{(point.cacheWrite ?? 0).toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span>Cache hit rate:</span><span className="font-medium">{point.cacheHitRate.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</span></div>
                  </div>
                </div>
              );
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="input" name="Input" stackId={scale === 'log' ? undefined : "tokens"} fill={TOKEN_COLORS.input} />
          <Bar yAxisId="left" dataKey="output" name="Output" stackId={scale === 'log' ? undefined : "tokens"} fill={TOKEN_COLORS.output} />
          <Bar yAxisId="left" dataKey="cacheRead" name="Cache read" stackId={scale === 'log' ? undefined : "tokens"} fill={TOKEN_COLORS.cacheRead} />
          <Bar yAxisId="left" dataKey="cacheWrite" name="Cache write" stackId={scale === 'log' ? undefined : "tokens"} fill={TOKEN_COLORS.cacheWrite} radius={scale === 'log' ? undefined : [3, 3, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cacheHitRate"
            name="Cache hit rate"
            stroke={TOKEN_COLORS.cacheHitRate}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {modelStats.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Tokens per Model</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="model" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort}>Model</SortableTableHead>
                  <SortableTableHead column="requests" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Requests</SortableTableHead>
                  <SortableTableHead column="input" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Input</SortableTableHead>
                  <SortableTableHead column="output" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Output</SortableTableHead>
                  <SortableTableHead column="cacheRead" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Cache read</SortableTableHead>
                  <SortableTableHead column="cacheWrite" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">Cache write</SortableTableHead>
                  <SortableTableHead column="outputInputRatio" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">
                    <span title="Output tokens divided by input tokens">Out:In ratio</span>
                  </SortableTableHead>
                  <SortableTableHead column="tokensPerRequest" activeColumn={sortColumn} direction={sortDirection} onSort={handleSort} className="text-right" align="right">
                    <span title="Total tokens divided by requests">Tokens / request</span>
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedModelStats.map(m => (
                  <TableRow key={m.model}>
                    <TableCell className="font-medium">{m.model}</TableCell>
                    <TableCell className="text-right">{m.requests.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right" title={m.input.toLocaleString()}>{formatTokens(m.input)}</TableCell>
                    <TableCell className="text-right" title={m.output.toLocaleString()}>{formatTokens(m.output)}</TableCell>
                    <TableCell className="text-right" title={m.cacheRead.toLocaleString()}>{formatTokens(m.cacheRead)}</TableCell>
                    <TableCell className="text-right" title={m.cacheWrite.toLocaleString()}>{formatTokens(m.cacheWrite)}</TableCell>
                    <TableCell className="text-right">{m.outputInputRatio.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{formatTokens(m.tokensPerRequest)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
});
