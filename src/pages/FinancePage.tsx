import { useMemo, useState } from 'react'
import { Badge, Button, Card, EmptyState, Icon, Input, Modal, Select } from '../components/ui'
import { ExpenseChart } from '../components/finance/ExpenseChart'
import { AccountModal, BudgetModal, TransactionModal } from '../components/finance/FinanceModals'
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, TRANSFER_CATEGORY,
  currentMonthKey, deleteTransaction, expenseSeries, fmtIDR, fmtTxDate, monthExpenses, monthLabel,
  setBudget, shiftMonth, sumAmount, totalAssets, useFinance,
  type Account, type Transaction, type TxKind,
} from '../lib/finance'

const PAGE_SIZE = 12
const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, TRANSFER_CATEGORY])]

const KIND_STYLE: Record<TxKind, { label: string; text: string; chip: string; sign: string; icon: 'arrow-down-left' | 'arrow-up-right' | 'swap' }> = {
  income: { label: 'Income', text: 'text-success', chip: 'bg-success/12 text-success', sign: '+', icon: 'arrow-down-left' },
  expense: { label: 'Expense', text: 'text-destructive', chip: 'bg-destructive/12 text-destructive', sign: '−', icon: 'arrow-up-right' },
  transfer: { label: 'Transfer', text: 'text-silver-wolf', chip: 'bg-silver-wolf/15 text-silver-wolf', sign: '', icon: 'swap' },
}

const eyebrow = 'font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground'
const sectionTitle = 'font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground'

function AccountLogo({ account }: { account: Account }) {
  return account.logo ? (
    <span className="w-11 h-11 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden shrink-0">
      <img src={account.logo} alt="" className="w-full h-full object-contain p-1.5" />
    </span>
  ) : (
    <span className="w-11 h-11 rounded-lg bg-sage-light text-primary flex items-center justify-center shrink-0 font-display text-lg font-semibold" aria-hidden>
      {account.name.trim().charAt(0).toUpperCase() || <Icon name="wallet" size={18} />}
    </span>
  )
}

export function FinancePage() {
  const { accounts, transactions, budget } = useFinance()
  const [hidden, setHidden] = useState(false)
  const [txKind, setTxKind] = useState<TxKind | null>(null)
  const [accountModal, setAccountModal] = useState<{ account: Account | null } | null>(null)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  const [period, setPeriod] = useState<string>('this') // 'this' | 'all' | YYYY-MM
  const [fType, setFType] = useState('all')
  const [fAccount, setFAccount] = useState('all')
  const [fCategory, setFCategory] = useState('all')
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [shown, setShown] = useState(PAGE_SIZE)

  const money = (n: number) => (hidden ? 'Rp•••••••' : fmtIDR(n))
  const nameOf = (id?: string) => accounts.find((a) => a.id === id)?.name ?? 'Removed account'
  const total = totalAssets(accounts)
  const nowKey = currentMonthKey()

  // ── Period / chart ────────────────────────────────────────────────────────
  const viewMonth = period === 'all' || period === 'this' ? nowKey : period
  const periodOptions = useMemo(() => {
    const months = Array.from({ length: 11 }, (_, i) => shiftMonth(nowKey, -(i + 1)))
    if (period !== 'this' && period !== 'all' && !months.includes(period)) months.push(period)
    months.sort().reverse()
    return [
      { value: 'this', label: `This Month (${monthLabel(nowKey)})` },
      ...months.map((m) => ({ value: m, label: monthLabel(m) })),
      { value: 'all', label: 'All Months' },
    ]
  }, [nowKey, period])
  const setMonth = (k: string) => setPeriod(k === nowKey ? 'this' : k)
  const series = useMemo(() => expenseSeries(transactions, period === 'all' ? 'all' : viewMonth), [transactions, period, viewMonth])
  const periodExpenses = useMemo(
    () => (period === 'all' ? transactions.filter((t) => t.kind === 'expense') : monthExpenses(transactions, viewMonth)),
    [transactions, period, viewMonth],
  )
  const periodTotal = sumAmount(periodExpenses)
  const periodName = period === 'all' ? 'All months' : monthLabel(viewMonth)

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    periodExpenses.forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [periodExpenses])

  const budgetSpent = sumAmount(monthExpenses(transactions, viewMonth))
  const budgetPct = budget ? Math.min(100, (budgetSpent / budget) * 100) : 0
  const overBudget = budget !== null && budgetSpent > budget

  // ── Transaction filters ───────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      transactions
        .filter((t) => fType === 'all' || t.kind === fType)
        .filter((t) => fAccount === 'all' || t.accountId === fAccount || t.toAccountId === fAccount)
        .filter((t) => fCategory === 'all' || t.category === fCategory)
        .filter((t) => (!fFrom || t.date >= fFrom) && (!fTo || t.date <= fTo))
        .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)),
    [transactions, fType, fAccount, fCategory, fFrom, fTo],
  )
  const filtersOn = fType !== 'all' || fAccount !== 'all' || fCategory !== 'all' || !!fFrom || !!fTo
  const resetFilters = () => { setFType('all'); setFAccount('all'); setFCategory('all'); setFFrom(''); setFTo(''); setShown(PAGE_SIZE) }
  const rangeInvalid = !!fFrom && !!fTo && fFrom > fTo

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-5 min-w-0">
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent mb-1">Personal</p>
        <h1 className="font-display text-2xl font-semibold">Finance</h1>
        <p className="text-sm text-muted-foreground">Track your personal money: what you hold, earn, and spend.</p>
      </div>

      <p className="text-xs rounded border border-border bg-muted px-3 py-2 text-muted-foreground">
        Prototype with sample data. Nothing is connected to a real bank, and changes reset when you refresh.
      </p>

      {/* Total assets */}
      <section aria-label="Total assets" className="relative overflow-hidden rounded-lg bg-secondary text-secondary-foreground p-5 sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent/60 via-accent/20 to-transparent" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-secondary-foreground/50">Total Assets</p>
            <p className="font-display text-3xl sm:text-4xl font-semibold mt-1.5 tracking-tight [overflow-wrap:anywhere]">{money(total)}</p>
            <p className="text-xs text-secondary-foreground/55 mt-1.5">Across {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}, calculated from current balances</p>
          </div>
          <button
            type="button"
            onClick={() => setHidden((v) => !v)}
            aria-pressed={hidden}
            aria-label={hidden ? 'Show balances' : 'Hide balances'}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded text-secondary-foreground/60 hover:text-secondary-foreground hover:bg-white/8"
          >
            <Icon name={hidden ? 'eye-off' : 'eye'} size={16} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
          <button type="button" onClick={() => setTxKind('income')} className="inline-flex items-center justify-center gap-2 rounded px-3.5 py-2.5 text-sm font-medium bg-white/10 hover:bg-white/16 transition-colors">
            <Icon name="arrow-down-left" size={15} className="text-[#7FD3A0]" /> Add Income
          </button>
          <button type="button" onClick={() => setTxKind('expense')} className="inline-flex items-center justify-center gap-2 rounded px-3.5 py-2.5 text-sm font-medium bg-white/10 hover:bg-white/16 transition-colors">
            <Icon name="arrow-up-right" size={15} className="text-[#F29A9A]" /> Add Expense
          </button>
          <button type="button" onClick={() => setTxKind('transfer')} disabled={accounts.length < 2} className="inline-flex items-center justify-center gap-2 rounded px-3.5 py-2.5 text-sm font-medium bg-white/10 hover:bg-white/16 transition-colors disabled:opacity-40 disabled:pointer-events-none">
            <Icon name="swap" size={15} className="text-accent" /> Transfer
          </button>
        </div>
      </section>

      {/* Accounts */}
      <section aria-labelledby="accounts-h" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="accounts-h" className={sectionTitle}>Accounts &amp; Assets</h2>
          <Button size="sm" variant="outline" icon="plus" onClick={() => setAccountModal({ account: null })}>Add Another Asset</Button>
        </div>
        {accounts.length === 0 ? (
          <Card>
            <EmptyState icon="wallet" title="No assets yet" description="Add a bank account, e-wallet, or cash to start tracking your money." action={<Button icon="plus" onClick={() => setAccountModal({ account: null })}>Add Another Asset</Button>} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((a) => (
              <Card key={a.id} className="p-4 card-hover min-w-0 flex flex-col">
                <div className="flex items-start gap-3">
                  <AccountLogo account={a} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold truncate">{a.name}</p>
                    <Badge className="mt-0.5">{a.type}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" icon="edit-2" aria-label={`Edit ${a.name}`} onClick={() => setAccountModal({ account: a })} className="-mr-1.5 -mt-1" />
                </div>
                <p className={`${eyebrow} mt-4`}>Balance</p>
                <p className="font-display text-2xl font-semibold mt-0.5 [overflow-wrap:anywhere]">{money(a.balance)}</p>
                {a.note && <p className="text-xs text-muted-foreground mt-1.5 [overflow-wrap:anywhere]">{a.note}</p>}
              </Card>
            ))}
            <button
              type="button"
              onClick={() => setAccountModal({ account: null })}
              className="rounded-lg border border-dashed border-border min-h-[8.5rem] flex flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Icon name="plus-circle" size={20} />
              Add Another Asset
            </button>
          </div>
        )}
      </section>

      {/* Chart + summary */}
      <section aria-labelledby="spend-h" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2 min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-1">
            <div>
              <h2 id="spend-h" className={sectionTitle}>Expenses</h2>
              <p className="font-display text-2xl font-semibold mt-1">{fmtIDR(periodTotal)}</p>
              <p className="text-xs text-muted-foreground">Total spent · {periodName}{period === 'all' ? '' : ' · by day'}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {period !== 'all' && (
                <Button variant="outline" size="sm" icon="chevron-left" aria-label="Previous month" onClick={() => setMonth(shiftMonth(viewMonth, -1))} />
              )}
              <select
                aria-label="Expense period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-card border border-border rounded px-2.5 py-1.5 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none min-w-0 max-w-[10.5rem] sm:max-w-none"
              >
                {periodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {period !== 'all' && (
                <Button variant="outline" size="sm" icon="chevron-right" aria-label="Next month" disabled={viewMonth >= nowKey} onClick={() => setMonth(shiftMonth(viewMonth, 1))} />
              )}
            </div>
          </div>
          {periodTotal === 0 ? (
            <EmptyState icon="bar-chart-2" title={`No expenses in ${periodName}`} description="Expenses you add will appear here as columns." className="py-12" action={<Button size="sm" icon="plus" onClick={() => setTxKind('expense')}>Add Expense</Button>} />
          ) : (
            <>
              <ExpenseChart data={series} label={`Expense chart in Indonesian Rupiah, ${periodName}`} />
              <p className="font-mono text-[10px] text-muted-foreground mt-1">Amounts in IDR · rb = thousand, jt = million · transfers excluded</p>
            </>
          )}
        </Card>

        <div className="space-y-4 min-w-0">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className={sectionTitle}>Monthly Budget</h3>
              <Button variant="ghost" size="sm" icon={budget ? 'edit-2' : 'plus'} onClick={() => setBudgetOpen(true)}>{budget ? 'Edit' : 'Set'}</Button>
            </div>
            {budget === null ? (
              <p className="text-sm text-muted-foreground">Optional. Set a limit to see how much is left each month.</p>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground mb-2">{monthLabel(viewMonth)}</p>
                <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(budgetPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
                  <div className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-destructive' : budgetPct > 80 ? 'bg-accent' : 'bg-primary'}`} style={{ width: `${budgetPct}%` }} />
                </div>
                <dl className="grid grid-cols-3 gap-2 mt-3 text-sm">
                  <div className="min-w-0"><dt className={eyebrow}>Spent</dt><dd className="font-display font-semibold mt-0.5 text-[13px] [overflow-wrap:anywhere]">{fmtIDR(budgetSpent)}</dd></div>
                  <div className="min-w-0"><dt className={eyebrow}>Limit</dt><dd className="font-display font-semibold mt-0.5 text-[13px] [overflow-wrap:anywhere]">{fmtIDR(budget)}</dd></div>
                  <div className="min-w-0"><dt className={eyebrow}>{overBudget ? 'Over' : 'Left'}</dt><dd className={`font-display font-semibold mt-0.5 text-[13px] [overflow-wrap:anywhere] ${overBudget ? 'text-destructive' : 'text-success'}`}>{fmtIDR(Math.abs(budget - budgetSpent))}</dd></div>
                </dl>
              </>
            )}
          </Card>

          <Card className="p-4">
            <h3 className={`${sectionTitle} mb-3`}>Spending by Category</h3>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No spending in {periodName} yet.</p>
            ) : (
              <ul className="space-y-3">
                {byCategory.map(([cat, amt]) => (
                  <li key={cat}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{cat}</span>
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{fmtIDR(amt)} · {Math.round((amt / periodTotal) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(amt / byCategory[0][1]) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      {/* Transactions */}
      <section aria-labelledby="tx-h" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="tx-h" className={sectionTitle}>Transaction History</h2>
          <span className="text-xs text-muted-foreground">{filtered.length} of {transactions.length} · sample entries are labeled</span>
        </div>

        <Card className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            <Select label="Type" value={fType} onChange={(e) => { setFType(e.target.value); setShown(PAGE_SIZE) }} options={[{ value: 'all', label: 'All types' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }, { value: 'transfer', label: 'Transfer' }]} />
            <Select label="Account" value={fAccount} onChange={(e) => { setFAccount(e.target.value); setShown(PAGE_SIZE) }} options={[{ value: 'all', label: 'All accounts' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]} />
            <Select label="Category" value={fCategory} onChange={(e) => { setFCategory(e.target.value); setShown(PAGE_SIZE) }} options={[{ value: 'all', label: 'All categories' }, ...ALL_CATEGORIES.map((c) => ({ value: c, label: c }))]} />
            <Input label="From" type="date" value={fFrom} onChange={(e) => { setFFrom(e.target.value); setShown(PAGE_SIZE) }} />
            <Input label="To" type="date" value={fTo} onChange={(e) => { setFTo(e.target.value); setShown(PAGE_SIZE) }} />
          </div>
          {rangeInvalid && <p role="alert" className="text-xs text-destructive mt-2">“From” date is after “To” date.</p>}
          {filtersOn && <button type="button" onClick={resetFilters} className="text-xs text-accent hover:underline mt-2 min-h-8">Reset filters</button>}
        </Card>

        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            transactions.length === 0 ? (
              <EmptyState icon="inbox" title="No transactions yet" description="Record income, expenses, or transfers to build your history." action={<Button icon="plus" onClick={() => setTxKind('expense')}>Add Expense</Button>} />
            ) : (
              <EmptyState icon="search" title="No matching transactions" description="Try widening the filters or date range." action={<Button variant="outline" onClick={resetFilters}>Reset filters</Button>} />
            )
          ) : (
            <>
              <div className="hidden md:grid grid-cols-[6.5rem_1fr_7rem_10rem_9rem_2.5rem] gap-3 px-4 py-2 border-b border-border bg-muted/50">
                {['Date', 'Description', 'Category', 'Account', 'Amount', ''].map((h, i) => (
                  <span key={i} className={`${eyebrow} ${h === 'Amount' ? 'text-right' : ''}`}>{h}</span>
                ))}
              </div>
              <ul className="divide-y divide-border">
                {filtered.slice(0, shown).map((t) => {
                  const k = KIND_STYLE[t.kind]
                  const accountText = t.kind === 'transfer' ? `${nameOf(t.accountId)} → ${nameOf(t.toAccountId)}` : nameOf(t.accountId)
                  return (
                    <li key={t.id} className="px-4 py-3 md:grid md:grid-cols-[6.5rem_1fr_7rem_10rem_9rem_2.5rem] md:gap-3 md:items-center flex items-start gap-3 min-w-0">
                      <span className={`md:hidden w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${k.chip}`}><Icon name={k.icon} size={14} /></span>
                      <span className="hidden md:block font-mono text-xs text-muted-foreground">{fmtTxDate(t.date)}</span>
                      <div className="min-w-0 flex-1 md:flex-none">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`hidden md:flex w-6 h-6 rounded-full items-center justify-center shrink-0 ${k.chip}`}><Icon name={k.icon} size={12} /></span>
                          <p className="text-sm font-medium truncate">{t.description}</p>
                        </div>
                        <p className="md:hidden text-[11px] text-muted-foreground mt-0.5 [overflow-wrap:anywhere]">
                          {fmtTxDate(t.date)} · {t.category} · {accountText}
                        </p>
                        {t.kind === 'transfer' && <p className="text-[10px] text-silver-wolf mt-0.5 md:ml-8">Own-account transfer · not income or expense</p>}
                      </div>
                      <span className="hidden md:block text-xs text-muted-foreground truncate">{t.category}</span>
                      <span className="hidden md:block text-xs text-muted-foreground truncate">{accountText}</span>
                      <span className={`font-mono text-sm font-medium text-right shrink-0 ${k.text}`}>{k.sign}{fmtIDR(t.amount)}</span>
                      <button type="button" aria-label={`Delete ${t.description}`} onClick={() => setDeleting(t)} className="flex w-8 h-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-muted justify-self-end">
                        <Icon name="trash-2" size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
              {filtered.length > shown && (
                <div className="p-3 border-t border-border text-center">
                  <Button variant="ghost" size="sm" onClick={() => setShown(shown + PAGE_SIZE)}>Show more ({filtered.length - shown})</Button>
                </div>
              )}
            </>
          )}
        </Card>
      </section>

      <TransactionModal kind={txKind} onClose={() => setTxKind(null)} accounts={accounts} />
      <AccountModal
        open={!!accountModal}
        onClose={() => setAccountModal(null)}
        account={accountModal?.account ?? null}
        hasTransactions={!!accountModal?.account && transactions.some((t) => t.accountId === accountModal.account!.id || t.toAccountId === accountModal.account!.id)}
      />
      <BudgetModal open={budgetOpen} onClose={() => setBudgetOpen(false)} budget={budget} onSave={setBudget} />
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete transaction?"
        actions={<><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={() => { if (deleting) deleteTransaction(deleting.id); setDeleting(null) }}>Delete</Button></>}
      >
        <p className="text-sm">“{deleting?.description}” ({deleting && fmtIDR(deleting.amount)}) will be removed and the account balance reversed.</p>
      </Modal>
    </div>
  )
}
