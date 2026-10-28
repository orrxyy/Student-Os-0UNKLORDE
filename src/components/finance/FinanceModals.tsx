import { useEffect, useState } from 'react'
import { Button, Icon, Input, Modal, Select } from '../ui'
import {
  ACCOUNT_TYPES, EXPENSE_CATEGORIES, INCOME_CATEGORIES, TRANSFER_CATEGORY,
  addAccount, addTransaction, deleteAccount, fmtIDR, fmtNum, todayKey, updateAccount,
  type Account, type AccountType, type TxKind,
} from '../../lib/finance'

const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide'
const areaCls = 'w-full bg-card border border-border rounded px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none'

export function MoneyInput({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`money-${label}`} className={labelCls}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">Rp</span>
        <input
          id={`money-${label}`}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={value ? fmtNum(Number(value)) : ''}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 12))}
          className={`w-full bg-card border rounded pl-9 pr-3 py-2 text-sm font-mono focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors ${error ? 'border-destructive' : 'border-border'}`}
        />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Note({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="fin-note" className={labelCls}>Note (optional)</label>
      <textarea id="fin-note" rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={areaCls} />
    </div>
  )
}

// ── Account add / edit ──────────────────────────────────────────────────────
export function AccountModal({ open, onClose, account, hasTransactions }: { open: boolean; onClose: () => void; account: Account | null; hasTransactions: boolean }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('Bank')
  const [balance, setBalance] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(account?.name ?? '')
    setType(account?.type ?? 'Bank')
    setBalance(account ? String(account.balance) : '')
    setNote(account?.note ?? '')
    setErrors({})
    setConfirmDelete(false)
  }, [open, account])

  function save() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Give the asset a name.'
    if (balance === '') e.balance = account ? 'Enter the current balance.' : 'Enter a starting balance (0 is fine).'
    setErrors(e)
    if (Object.keys(e).length) return
    const data = { name: name.trim(), type, balance: Number(balance), note: note.trim() }
    if (account) updateAccount(account.id, data)
    else addAccount(data)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? `Edit ${account.name}` : 'Add another asset'}
      actions={
        <>
          {account && (
            <Button
              variant="ghost"
              className="mr-auto text-destructive"
              icon="trash-2"
              onClick={() => (hasTransactions ? setErrors({ delete: 'This account has transactions, so it can’t be removed. Edit it instead.' }) : setConfirmDelete(true))}
            >
              Remove
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{account ? 'Save changes' : 'Add asset'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {!account && <p className="text-xs text-muted-foreground">Track any account or asset: a bank, e-wallet, cash, savings, or investment.</p>}
        <Input label="Name" placeholder="e.g. Jenius, Cash, Bibit" value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value as AccountType)} options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))} />
        <MoneyInput label={account ? 'Current balance' : 'Starting balance'} value={balance} onChange={setBalance} error={errors.balance} />
        <Note value={note} onChange={setNote} />
        {errors.delete && <p role="alert" className="text-xs text-destructive">{errors.delete}</p>}
        {confirmDelete && account && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm">Remove “{account.name}” ({fmtIDR(account.balance)}) from your assets?</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => { deleteAccount(account.id); onClose() }}>Yes, remove</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Keep</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Transaction add ─────────────────────────────────────────────────────────
const COPY: Record<TxKind, { title: string; action: string }> = {
  income: { title: 'Add income', action: 'Add income' },
  expense: { title: 'Add expense', action: 'Add expense' },
  transfer: { title: 'Transfer between accounts', action: 'Transfer' },
}

export function TransactionModal({ kind, onClose, accounts }: { kind: TxKind | null; onClose: () => void; accounts: Account[] }) {
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(todayKey())
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!kind) return
    setAmount('')
    setFrom(accounts[0]?.id ?? '')
    setTo(accounts[1]?.id ?? '')
    setCategory(kind === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0])
    setDate(todayKey())
    setNote('')
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  if (!kind) return <Modal open={false} onClose={onClose} title="">{null}</Modal>

  const accOptions = [{ value: '', label: 'Select account' }, ...accounts.map((a) => ({ value: a.id, label: `${a.name} · ${fmtIDR(a.balance)}` }))]
  const acc = (id: string) => accounts.find((a) => a.id === id)

  function save() {
    if (!kind) return
    const e: Record<string, string> = {}
    const value = Number(amount)
    if (!value) e.amount = 'Enter an amount greater than Rp0.'
    if (!from) e.from = kind === 'income' ? 'Choose the account that receives the money.' : 'Choose the source account.'
    if (kind === 'transfer') {
      if (!to) e.to = 'Choose the destination account.'
      else if (to === from) e.to = 'Destination must be different from the source account.'
    }
    if (!date) e.date = 'Pick a date.'
    else if (date > todayKey()) e.date = 'Date can’t be in the future.'
    if (!e.amount && !e.from && kind !== 'income' && (acc(from)?.balance ?? 0) < value) {
      e.amount = `Not enough balance in ${acc(from)?.name} (${fmtIDR(acc(from)?.balance ?? 0)} available).`
    }
    setErrors(e)
    if (Object.keys(e).length) return
    const description =
      kind === 'transfer' ? `Transfer ${acc(from)?.name} → ${acc(to)?.name}` : note.trim() || `${category} ${kind}`
    addTransaction({
      kind, amount: value, date, accountId: from, toAccountId: kind === 'transfer' ? to : undefined,
      category: kind === 'transfer' ? TRANSFER_CATEGORY : category, description, note: note.trim(),
    })
    onClose()
  }

  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const errOf = (k: string) => errors[k] && <p role="alert" className="text-xs text-destructive">{errors[k]}</p>

  return (
    <Modal
      open
      onClose={onClose}
      title={COPY[kind].title}
      actions={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{COPY[kind].action}</Button></>}
    >
      <div className="space-y-4">
        {kind === 'transfer' && (
          <div className="flex gap-2 rounded border border-border bg-indigo-light p-3 text-xs text-secondary dark:text-foreground">
            <Icon name="info" size={14} className="mt-px shrink-0" />
            <p>Moving money between your own accounts doesn’t count as income or an expense. Total assets stay the same.</p>
          </div>
        )}
        <MoneyInput label="Amount" value={amount} onChange={setAmount} error={errors.amount} />
        <div className="flex flex-col gap-1">
          <Select label={kind === 'income' ? 'Destination account' : 'Source account'} value={from} onChange={(e) => setFrom(e.target.value)} options={accOptions} />
          {errOf('from')}
        </div>
        {kind === 'transfer' && (
          <div className="flex flex-col gap-1">
            <Select label="Destination account" value={to} onChange={(e) => setTo(e.target.value)} options={accOptions} />
            {errOf('to')}
          </div>
        )}
        {kind !== 'transfer' && (
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((c) => ({ value: c, label: c }))} />
        )}
        <Input label="Date" type="date" max={todayKey()} value={date} error={errors.date} onChange={(e) => setDate(e.target.value)} />
        <Note value={note} onChange={setNote} />
      </div>
    </Modal>
  )
}

export function BudgetModal({ open, onClose, budget, onSave }: { open: boolean; onClose: () => void; budget: number | null; onSave: (n: number | null) => void }) {
  const [v, setV] = useState('')
  useEffect(() => { if (open) setV(budget ? String(budget) : '') }, [open, budget])
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Monthly budget"
      actions={
        <>
          {budget !== null && <Button variant="ghost" className="mr-auto" onClick={() => { onSave(null); onClose() }}>Remove budget</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(Number(v) || null); onClose() }}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Set a spending limit for each month. Transfers are never counted against it.</p>
        <MoneyInput label="Budget limit" value={v} onChange={setV} />
      </div>
    </Modal>
  )
}
