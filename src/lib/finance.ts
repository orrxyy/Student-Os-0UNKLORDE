import { useSyncExternalStore } from 'react'
import bcaLogo from '../assets/finance/bca.png'
import gopayLogo from '../assets/finance/gopay.png'
import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabase'

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
  isDefault?: boolean
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
  loading: boolean
  error: string | null
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

// ── Supabase-backed store ───────────────────────────────────────────────────
type DbRow = Record<string, unknown>

const emptyState: FinanceState = {
  accounts: [],
  transactions: [],
  budget: null,
  loading: true,
  error: null,
}

let state: FinanceState = emptyState
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())
const setState = (next: FinanceState) => {
  state = next
  emit()
}

let started = false
let loadVersion = 0

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Finance data could not be saved.'
}

function accountFromRow(row: DbRow): Account {
  const name = String(row.name)
  const normalizedName = name.toLowerCase()

  return {
    id: String(row.id),
    name,
    type: row.type as AccountType,
    balance: Number(row.balance),
    note: String(row.note ?? ''),
    isDefault: Boolean(row.is_default),
    logo: normalizedName === 'bca' ? bcaLogo : normalizedName === 'gopay' ? gopayLogo : undefined,
  }
}

function transactionFromRow(row: DbRow): Transaction {
  return {
    id: String(row.id),
    kind: row.kind as TxKind,
    amount: Number(row.amount),
    date: String(row.transaction_date),
    description: String(row.description ?? ''),
    category: String(row.category),
    accountId: String(row.account_id),
    toAccountId: row.to_account_id ? String(row.to_account_id) : undefined,
    note: String(row.note ?? ''),
  }
}

async function ensureDefaultAccounts(userId: string) {
  const { error } = await supabase.from('finance_accounts').upsert(
    [
      {
        user_id: userId,
        name: 'BCA',
        type: 'Bank',
        balance: 0,
        note: '',
        is_default: true,
      },
      {
        user_id: userId,
        name: 'GoPay',
        type: 'E-Wallet',
        balance: 0,
        note: '',
        is_default: true,
      },
    ],
    { onConflict: 'user_id,name', ignoreDuplicates: true },
  )

  if (error) throw error
}

export async function refreshFinance() {
  const version = ++loadVersion
  setState({ ...state, loading: true, error: null })

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError

    const user = authData.user
    if (!user) {
      if (version === loadVersion) setState({ ...emptyState, loading: false })
      return
    }

    // BCA dan GoPay dibuat sekali untuk setiap user, selalu dengan saldo Rp0.
    await ensureDefaultAccounts(user.id)

    const [accountsResult, transactionsResult, budgetResult] = await Promise.all([
      supabase.from('finance_accounts').select('*').order('created_at'),
      supabase
        .from('finance_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('finance_budgets').select('monthly_limit').maybeSingle(),
    ])

    if (accountsResult.error) throw accountsResult.error
    if (transactionsResult.error) throw transactionsResult.error
    if (budgetResult.error) throw budgetResult.error

    if (version !== loadVersion) return

    setState({
      accounts: (accountsResult.data ?? []).map((row) => accountFromRow(row as DbRow)),
      transactions: (transactionsResult.data ?? []).map((row) => transactionFromRow(row as DbRow)),
      budget: budgetResult.data ? Number(budgetResult.data.monthly_limit) : null,
      loading: false,
      error: null,
    })
  } catch (error) {
    if (version === loadVersion) {
      setState({ ...state, loading: false, error: errorMessage(error) })
    }
  }
}

async function saveAndRefresh(
  request: () => Promise<{ error: { message: string } | null }>,
) {
  try {
    const result = await request()
    if (result.error) throw result.error
    await refreshFinance()
    if (state.error) throw new Error(state.error)
  } catch (error) {
    setState({ ...state, loading: false, error: errorMessage(error) })
    throw error
  }
}

export function useFinance() {
  const snapshot = useSyncExternalStore(
    (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    () => state,
  )

  useEffect(() => {
    if (!started) {
      started = true
      void refreshFinance()
    }
  }, [])

  return snapshot
}

export async function addAccount(
  account: Omit<Account, 'id' | 'logo' | 'isDefault'>,
) {
  await saveAndRefresh(() =>
    supabase.from('finance_accounts').insert({
      name: account.name,
      type: account.type,
      balance: account.balance,
      note: account.note,
    }),
  )
}

export async function updateAccount(
  id: string,
  patch: Partial<Omit<Account, 'id' | 'logo' | 'isDefault'>>,
) {
  const account = state.accounts.find((item) => item.id === id)
  if (!account) throw new Error('Account not found.')

  const safePatch = account.isDefault
    ? { balance: patch.balance, note: patch.note }
    : patch

  await saveAndRefresh(() =>
    supabase
      .from('finance_accounts')
      .update({ ...safePatch, updated_at: new Date().toISOString() })
      .eq('id', id),
  )
}

export async function deleteAccount(id: string) {
  const account = state.accounts.find((item) => item.id === id)
  if (account?.isDefault) throw new Error('BCA and GoPay are default accounts and cannot be removed.')

  await saveAndRefresh(() =>
    supabase.from('finance_accounts').delete().eq('id', id),
  )
}

export async function setBudget(budget: number | null) {
  if (budget === null) {
    await saveAndRefresh(() =>
      supabase.from('finance_budgets').delete().not('user_id', 'is', null),
    )
    return
  }

  await saveAndRefresh(() =>
    supabase.from('finance_budgets').upsert(
      { monthly_limit: budget },
      { onConflict: 'user_id' },
    ),
  )
}

export async function addTransaction(transaction: Omit<Transaction, 'id' | 'sample'>) {
  await saveAndRefresh(() =>
    supabase.from('finance_transactions').insert({
      kind: transaction.kind,
      amount: transaction.amount,
      transaction_date: transaction.date,
      description: transaction.description,
      category: transaction.category,
      account_id: transaction.accountId,
      to_account_id: transaction.toAccountId ?? null,
      note: transaction.note,
    }),
  )
}

export async function deleteTransaction(id: string) {
  await saveAndRefresh(() =>
    supabase.from('finance_transactions').delete().eq('id', id),
  )
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
