import React, { useMemo } from "react";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CopilotUsageData,
  getTokenUsageData,
  getModelTokenStats,
  formatTokens,
} from "@/lib/utils";

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

  if (!summary.hasTokenData) return null;

  const totalTokens = summary.totalInput + summary.totalOutput + summary.totalCacheRead + summary.totalCacheWrite;

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

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={summary.daily} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fill: "var(--foreground)", fontSize: 12 }} tickLine={{ stroke: "var(--border)" }} />
          <YAxis
            yAxisId="left"
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
                    <div className="flex justify-between gap-4"><span>Input:</span><span className="font-medium">{point.input.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span>Output:</span><span className="font-medium">{point.output.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span>Cache read:</span><span className="font-medium">{point.cacheRead.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span>Cache write:</span><span className="font-medium">{point.cacheWrite.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span>Cache hit rate:</span><span className="font-medium">{point.cacheHitRate.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</span></div>
                  </div>
                </div>
              );
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="input" name="Input" stackId="tokens" fill={TOKEN_COLORS.input} />
          <Bar yAxisId="left" dataKey="output" name="Output" stackId="tokens" fill={TOKEN_COLORS.output} />
          <Bar yAxisId="left" dataKey="cacheRead" name="Cache read" stackId="tokens" fill={TOKEN_COLORS.cacheRead} />
          <Bar yAxisId="left" dataKey="cacheWrite" name="Cache write" stackId="tokens" fill={TOKEN_COLORS.cacheWrite} radius={[3, 3, 0, 0]} />
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
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Cache read</TableHead>
                  <TableHead className="text-right">Cache write</TableHead>
                  <TableHead className="text-right" title="Output tokens divided by input tokens">Out:In ratio</TableHead>
                  <TableHead className="text-right" title="Total tokens divided by requests">Tokens / request</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelStats.map(m => (
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
