import { useSyncExternalStore } from 'react'
import bcaLogo from '../assets/finance/bca.png'
import gopayLogo from '../assets/finance/gopay.png'

// UI prototype only: in-memory store shared by the Finance page and dashboard widget. No bank connections.

export type AccountType = 'Bank' | 'E-Wallet' | 'Cash' | 'Savings' | 'Investment' | 'Other'
export const ACCOUNT_TYPES: AccountType[] = ['Bank', 'E-Wallet', 'Cash', 'Savings', 'Investment', 'Other']

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  note: string
  logo?: string
}

export type TxKind = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string
  kind: TxKind
  amount: number
  date: string // YYYY-MM-DD
  description: string
  category: string
  accountId: string // source (expense/transfer) or destination (income)
  toAccountId?: string // transfer destination
  note: string
  sample?: boolean
}

export const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Study', 'Bills', 'Entertainment', 'Health', 'Shopping', 'Other']
export const INCOME_CATEGORIES = ['Allowance', 'Scholarship', 'Freelance', 'Gift', 'Other']
export const TRANSFER_CATEGORY = 'Transfer'

interface FinanceState {
  accounts: Account[]
  transactions: Transaction[]
  budget: number | null
}

// ── Formatting ──────────────────────────────────────────────────────────────
const idr = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
export const fmtIDR = (n: number) => `${n < 0 ? '-' : ''}Rp${idr.format(Math.abs(Math.round(n)))}`
export const fmtNum = (n: number) => idr.format(Math.round(n))
export function fmtIDRCompact(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`
  return String(n)
}

const pad = (n: number) => String(n).padStart(2, '0')
export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayKey = () => toDateKey(new Date())
export const monthKeyOf = (date: string) => date.slice(0, 7)
export const currentMonthKey = () => monthKeyOf(todayKey())
export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
export function monthLabel(key: string, short = false) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: short ? 'short' : 'long', year: short ? '2-digit' : 'numeric' })
}
export function fmtTxDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Seed data ───────────────────────────────────────────────────────────────
function seed(): FinanceState {
  const now = new Date()
  const today = now.getDate()
  const at = (monthsAgo: number, day: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
    const max = monthsAgo === 0 ? today : new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, max))
    return toDateKey(d)
  }
  let i = 0
  const tx = (
    kind: TxKind, monthsAgo: number, day: number, description: string, category: string,
    amount: number, accountId: string, toAccountId?: string,
  ): Transaction => ({ id: `s${++i}`, kind, amount, date: at(monthsAgo, day), description, category, accountId, toAccountId, note: '', sample: true })

  return {
    budget: 1_500_000,
    accounts: [
      { id: 'bca', name: 'BCA', type: 'Bank', balance: 2_500_000, note: 'Main student account', logo: bcaLogo },
      { id: 'gopay', name: 'GoPay', type: 'E-Wallet', balance: 350_000, note: 'Daily spending', logo: gopayLogo },
      { id: 'emergency', name: 'Emergency Fund', type: 'Savings', balance: 1_200_000, note: 'Do not touch unless needed' },
    ],
    transactions: [
      tx('income', 0, 1, 'Monthly allowance (sample)', 'Allowance', 3_000_000, 'bca'),
      tx('expense', 0, 2, 'Kost payment (sample)', 'Bills', 800_000, 'bca'),
      tx('expense', 0, 3, 'Lunch at canteen (sample)', 'Food', 35_000, 'gopay'),
      tx('expense', 0, 5, 'Printing thesis draft (sample)', 'Study', 60_000, 'gopay'),
      tx('transfer', 0, 6, 'Top up GoPay (sample)', TRANSFER_CATEGORY, 300_000, 'bca', 'gopay'),
      tx('expense', 0, 8, 'Grab to campus (sample)', 'Transport', 28_000, 'gopay'),
      tx('expense', 0, 10, 'Internet data package (sample)', 'Bills', 95_000, 'gopay'),
      tx('income', 0, 12, 'Tutoring session (sample)', 'Freelance', 250_000, 'gopay'),
      tx('expense', 0, 14, 'Movie night (sample)', 'Entertainment', 75_000, 'gopay'),
      tx('expense', 0, 16, 'Textbook: Linear Algebra (sample)', 'Study', 185_000, 'bca'),
      tx('transfer', 0, 18, 'Save to emergency fund (sample)', TRANSFER_CATEGORY, 200_000, 'bca', 'emergency'),
      tx('expense', 0, 19, 'Dinner with friends (sample)', 'Food', 110_000, 'gopay'),
      tx('expense', 0, 21, 'Pharmacy (sample)', 'Health', 48_000, 'bca'),
      tx('income', 1, 1, 'Monthly allowance (sample)', 'Allowance', 3_000_000, 'bca'),
      tx('expense', 1, 2, 'Kost payment (sample)', 'Bills', 800_000, 'bca'),
      tx('expense', 1, 6, 'Groceries (sample)', 'Food', 220_000, 'bca'),
      tx('expense', 1, 11, 'KRL commuter pass (sample)', 'Transport', 140_000, 'gopay'),
      tx('expense', 1, 15, 'Online course fee (sample)', 'Study', 350_000, 'bca'),
      tx('expense', 1, 20, 'New backpack (sample)', 'Shopping', 275_000, 'bca'),
      tx('expense', 1, 25, 'Cafe study session (sample)', 'Food', 64_000, 'gopay'),
      tx('income', 2, 1, 'Monthly allowance (sample)', 'Allowance', 3_000_000, 'bca'),
      tx('income', 2, 14, 'Scholarship disbursement (sample)', 'Scholarship', 1_000_000, 'bca'),
      tx('expense', 2, 2, 'Kost payment (sample)', 'Bills', 800_000, 'bca'),
      tx('expense', 2, 9, 'Groceries (sample)', 'Food', 190_000, 'bca'),
      tx('expense', 2, 17, 'Concert ticket (sample)', 'Entertainment', 450_000, 'bca'),
      tx('expense', 2, 24, 'Ojek online (sample)', 'Transport', 82_000, 'gopay'),
    ],
  }
}

// ── Store ───────────────────────────────────────────────────────────────────
let state: FinanceState = seed()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const set = (next: FinanceState) => { state = next; emit() }
let counter = 0
const uid = (p: string) => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}`

export function useFinance() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => state,
  )
}

export function addAccount(a: Omit<Account, 'id'>) {
  set({ ...state, accounts: [...state.accounts, { ...a, id: uid('acc') }] })
}
export function updateAccount(id: string, patch: Partial<Omit<Account, 'id'>>) {
  set({ ...state, accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })
}
export function deleteAccount(id: string) {
  set({ ...state, accounts: state.accounts.filter((a) => a.id !== id) })
}
export function setBudget(budget: number | null) {
  set({ ...state, budget })
}

function applyDelta(accounts: Account[], tx: Transaction, sign: 1 | -1): Account[] {
  return accounts.map((a) => {
    let d = 0
    if (tx.kind === 'income' && a.id === tx.accountId) d += tx.amount
    if (tx.kind === 'expense' && a.id === tx.accountId) d -= tx.amount
    if (tx.kind === 'transfer') {
      if (a.id === tx.accountId) d -= tx.amount
      if (a.id === tx.toAccountId) d += tx.amount
    }
    return d ? { ...a, balance: a.balance + d * sign } : a
  })
}
export function addTransaction(t: Omit<Transaction, 'id'>) {
  const tx = { ...t, id: uid('tx') }
  set({ ...state, accounts: applyDelta(state.accounts, tx, 1), transactions: [tx, ...state.transactions] })
}
export function deleteTransaction(id: string) {
  const tx = state.transactions.find((t) => t.id === id)
  if (!tx) return
  set({ ...state, accounts: applyDelta(state.accounts, tx, -1), transactions: state.transactions.filter((t) => t.id !== id) })
}

// ── Selectors ───────────────────────────────────────────────────────────────
export const totalAssets = (accounts: Account[]) => accounts.reduce((s, a) => s + a.balance, 0)
export const expensesOnly = (txs: Transaction[]) => txs.filter((t) => t.kind === 'expense')
export const sumAmount = (txs: Transaction[]) => txs.reduce((s, t) => s + t.amount, 0)
export const monthExpenses = (txs: Transaction[], month: string) =>
  txs.filter((t) => t.kind === 'expense' && monthKeyOf(t.date) === month)

export type ChartPoint = { label: string; total: number; hint: string }

/** Daily columns for one month, or monthly columns for all months. */
export function expenseSeries(txs: Transaction[], month: string | 'all'): ChartPoint[] {
  const exp = expensesOnly(txs)
  if (month === 'all') {
    if (!exp.length) return []
    const first = exp.reduce((m, t) => (monthKeyOf(t.date) < m ? monthKeyOf(t.date) : m), currentMonthKey())
    const out: ChartPoint[] = []
    for (let k = first; k <= currentMonthKey(); k = shiftMonth(k, 1)) {
      out.push({ label: monthLabel(k, true), hint: monthLabel(k), total: sumAmount(exp.filter((t) => monthKeyOf(t.date) === k)) })
    }
    return out
  }
  const [y, m] = month.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  const totals = Array.from({ length: days }, () => 0)
  exp.filter((t) => monthKeyOf(t.date) === month).forEach((t) => { totals[Number(t.date.slice(8)) - 1] += t.amount })
  return totals.map((total, i) => ({
    label: String(i + 1),
    total,
    hint: new Date(y, m - 1, i + 1).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
  }))
}
