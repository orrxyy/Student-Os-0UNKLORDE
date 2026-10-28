import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, Icon } from './ui'
import { ExpenseChart } from './finance/ExpenseChart'
import { currentMonthKey, expenseSeries, fmtIDR, monthExpenses, monthLabel, shiftMonth, sumAmount, totalAssets, useFinance } from '../lib/finance'

export function FinanceWidget() {
  const { accounts, transactions } = useFinance()
  const nowKey = currentMonthKey()
  const [month, setMonth] = useState(nowKey)
  const spent = sumAmount(monthExpenses(transactions, month))
  const series = expenseSeries(transactions, month)

  return (
    <Card className="p-4 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">Finance</h3>
        <Link to="/finance" className="text-xs text-accent hover:underline flex items-center gap-1">
          View Finance <Icon name="chevron-right" size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 sm:gap-5">
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-muted-foreground">Total Assets</p>
          <p className="font-display text-2xl font-semibold mt-0.5 [overflow-wrap:anywhere]">{fmtIDR(totalAssets(accounts))}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{accounts.length} accounts</p>
          <div className="mt-4 pt-3 border-t border-border">
            <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-muted-foreground">Spent · {monthLabel(month, true)}</p>
            <p className="font-display text-lg font-semibold mt-0.5">{fmtIDR(spent)}</p>
          </div>
          <Link to="/finance" className="sm:hidden mt-3 block">
            <Button variant="outline" size="sm" className="w-full" iconRight="chevron-right">View Finance</Button>
          </Link>
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <Button variant="ghost" size="sm" icon="chevron-left" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))} />
            <span className="text-xs font-medium">{monthLabel(month)}</span>
            <Button variant="ghost" size="sm" icon="chevron-right" aria-label="Next month" disabled={month >= nowKey} onClick={() => setMonth(shiftMonth(month, 1))} />
          </div>
          {spent === 0 ? (
            <p className="h-32 flex items-center justify-center text-xs text-muted-foreground text-center">No expenses in {monthLabel(month)}.</p>
          ) : (
            <ExpenseChart compact data={series} label={`Expenses in IDR for ${monthLabel(month)}`} />
          )}
        </div>
      </div>
    </Card>
  )
}
