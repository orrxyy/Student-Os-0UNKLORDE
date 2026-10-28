import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtIDR, fmtIDRCompact, type ChartPoint } from '../../lib/finance'

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded border border-border bg-card px-2.5 py-1.5 shadow-md">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{p.hint}</p>
      <p className="font-display text-sm font-semibold">{fmtIDR(p.total)}</p>
    </div>
  )
}

export function ExpenseChart({ data, compact = false, label }: { data: ChartPoint[]; compact?: boolean; label: string }) {
  const dense = data.length > 12
  return (
    <div role="img" aria-label={label} className={compact ? 'h-32' : 'h-64'}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, left: compact ? -28 : -8, bottom: 0 }} barCategoryGap={dense ? '18%' : '30%'}>
          {!compact && <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />}
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
            interval={dense ? (compact ? 6 : 'preserveStartEnd') : 0}
            minTickGap={dense ? 8 : 0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={compact ? 40 : 52}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
            tickFormatter={fmtIDRCompact}
            tickCount={compact ? 3 : 5}
          />
          <Tooltip cursor={{ fill: 'var(--color-muted)', opacity: 0.6 }} content={<ChartTooltip />} />
          <Bar dataKey="total" fill="var(--color-accent)" radius={[2, 2, 0, 0]} maxBarSize={compact ? 14 : 36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
