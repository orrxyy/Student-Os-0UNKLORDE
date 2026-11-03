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
export function AccountModal({
  open,
  onClose,
  account,
  hasTransactions,
}: {
  open: boolean
  onClose: () => void
  account: Account | null
  hasTransactions: boolean
}) {
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

  async function save() {
    const nextErrors: Record<string, string> = {}

    if (!name.trim()) nextErrors.name = 'Give the asset a name.'
    if (balance === '') {
      nextErrors.balance = account
        ? 'Enter the current balance.'
        : 'Enter a starting balance (0 is fine).'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const data = {
      name: name.trim(),
      type,
      balance: Number(balance),
      note: note.trim(),
    }

    try {
      if (account) {
        await updateAccount(account.id, data)
      } else {
        await addAccount(data)
      }
      onClose()
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Could not save account.',
      })
    }
  }

  async function remove() {
    if (!account) return

    try {
      await deleteAccount(account.id)
      onClose()
    } catch (error) {
      setErrors({
        delete: error instanceof Error ? error.message : 'Could not remove account.',
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? `Edit ${account.name}` : 'Add another asset'}
      actions={
        <>
          {account && !account.isDefault && (
            <Button
              variant="ghost"
              className="mr-auto text-destructive"
              icon="trash-2"
              onClick={() => {
                if (hasTransactions) {
                  setErrors({
                    delete:
                      'This account has transactions, so it can’t be removed. Edit it instead.',
                  })
                } else {
                  setConfirmDelete(true)
                }
              }}
            >
              Remove
            </Button>
          )}

          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>
            {account ? 'Save changes' : 'Add asset'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {account?.isDefault && (
          <p className="text-xs text-muted-foreground">
            BCA dan GoPay adalah aset bawaan. Nama dan tipenya tetap; saldo dan
            catatan bisa diedit.
          </p>
        )}

        {!account && (
          <p className="text-xs text-muted-foreground">
            Track any account or asset: a bank, e-wallet, cash, savings, or
            investment.
          </p>
        )}

        <Input
          label="Name"
          placeholder="e.g. Jenius, Cash, Bibit"
          value={name}
          error={errors.name}
          disabled={!!account?.isDefault}
          onChange={(event) => setName(event.target.value)}
        />

        <Select
          label="Type"
          value={type}
          disabled={!!account?.isDefault}
          onChange={(event) => setType(event.target.value as AccountType)}
          options={ACCOUNT_TYPES.map((item) => ({
            value: item,
            label: item,
          }))}
        />

        <MoneyInput
          label={account ? 'Current balance' : 'Starting balance'}
          value={balance}
          onChange={setBalance}
          error={errors.balance}
        />

        <Note value={note} onChange={setNote} />

        {errors.submit && (
          <p role="alert" className="text-xs text-destructive">
            {errors.submit}
          </p>
        )}

        {errors.delete && (
          <p role="alert" className="text-xs text-destructive">
            {errors.delete}
          </p>
        )}

        {confirmDelete && account && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm">
              Remove “{account.name}” ({fmtIDR(account.balance)}) from your
              assets?
            </p>

            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={remove}>
                Yes, remove
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
              >
                Keep
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
// ── Transaction add ─────────────────────────────────────────────────────────

const TRANSACTION_COPY: Record<TxKind, { title: string; action: string }> = {
  income: { title: 'Add income', action: 'Add income' },
  expense: { title: 'Add expense', action: 'Add expense' },
  transfer: { title: 'Transfer between accounts', action: 'Transfer' },
}

export function TransactionModal({
  kind,
  onClose,
  accounts,
}: {
  kind: TxKind | null
  onClose: () => void
  accounts: Account[]
}) {
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
  }, [kind, accounts])

  if (!kind) return null

  const accountOptions = [
    { value: '', label: 'Select account' },
    ...accounts.map((account) => ({
      value: account.id,
      label: `${account.name} · ${fmtIDR(account.balance)}`,
    })),
  ]

  const getAccount = (id: string) => accounts.find((account) => account.id === id)

  async function save() {
    const nextErrors: Record<string, string> = {}
    const value = Number(amount)

    if (!value || value < 0) nextErrors.amount = 'Enter an amount greater than Rp0.'
    if (!from) {
      nextErrors.from =
        kind === 'income'
          ? 'Choose the account that receives the money.'
          : 'Choose the source account.'
    }

    if (kind === 'transfer') {
      if (!to) nextErrors.to = 'Choose the destination account.'
      else if (to === from) nextErrors.to = 'Choose a different destination account.'
    }

    if (!date) nextErrors.date = 'Choose a date.'
    else if (date > todayKey()) nextErrors.date = 'Date can’t be in the future.'

    if (
      !nextErrors.amount &&
      !nextErrors.from &&
      kind !== 'income' &&
      (getAccount(from)?.balance ?? 0) < value
    ) {
      nextErrors.amount = `Not enough balance in ${getAccount(from)?.name ?? 'this account'}.`
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const description =
      kind === 'transfer'
        ? `Transfer ${getAccount(from)?.name} → ${getAccount(to)?.name}`
        : note.trim() || `${category} ${kind}`

    try {
      await addTransaction({
        kind,
        amount: value,
        date,
        accountId: from,
        toAccountId: kind === 'transfer' ? to : undefined,
        category: kind === 'transfer' ? TRANSFER_CATEGORY : category,
        description,
        note: note.trim(),
      })
      onClose()
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Could not save transaction.',
      })
    }
  }

  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  return (
    <Modal
      open
      onClose={onClose}
      title={TRANSACTION_COPY[kind].title}
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>{TRANSACTION_COPY[kind].action}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {kind === 'transfer' && (
          <div className="flex gap-2 rounded border border-border bg-indigo-light p-3 text-xs text-secondary dark:text-foreground">
            <Icon name="info" size={14} className="mt-px shrink-0" />
            <p>
              Transfers between your own accounts don’t count as income or
              expenses.
            </p>
          </div>
        )}

        <MoneyInput
          label="Amount"
          value={amount}
          onChange={setAmount}
          error={errors.amount}
        />

        <Select
          label={kind === 'income' ? 'Destination account' : 'Source account'}
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          options={accountOptions}
        />
        {errors.from && (
          <p role="alert" className="text-xs text-destructive">
            {errors.from}
          </p>
        )}

        {kind === 'transfer' && (
          <>
            <Select
              label="Destination account"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              options={accountOptions}
            />
            {errors.to && (
              <p role="alert" className="text-xs text-destructive">
                {errors.to}
              </p>
            )}
          </>
        )}

        {kind !== 'transfer' && (
          <Select
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            options={categories.map((item) => ({
              value: item,
              label: item,
            }))}
          />
        )}

        <Input
          label="Date"
          type="date"
          max={todayKey()}
          value={date}
          error={errors.date}
          onChange={(event) => setDate(event.target.value)}
        />

        <Note value={note} onChange={setNote} />

        {errors.submit && (
          <p role="alert" className="text-xs text-destructive">
            {errors.submit}
          </p>
        )}
      </div>
    </Modal>
  )
}

// ── Monthly budget ──────────────────────────────────────────────────────────

export function BudgetModal({
  open,
  onClose,
  budget,
  onSave,
}: {
  open: boolean
  onClose: () => void
  budget: number | null
  onSave: (value: number | null) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(budget === null ? '' : String(budget))
      setError('')
    }
  }, [open, budget])

  async function save(nextValue: number | null) {
    setSaving(true)
    setError('')

    try {
      await onSave(nextValue)
      onClose()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save the budget.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Monthly budget"
      actions={
        <>
          {budget !== null && (
            <Button
              variant="ghost"
              className="mr-auto"
              disabled={saving}
              onClick={() => void save(null)}
            >
              Remove budget
            </Button>
          )}

          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>

          <Button
            disabled={saving}
            onClick={() => {
              const parsed = Number(value)
              if (!value || !Number.isFinite(parsed) || parsed <= 0) {
                setError('Enter a budget greater than Rp0.')
                return
              }
              void save(parsed)
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Set a spending limit for each month. Transfers aren’t counted toward
          the budget.
        </p>

        <MoneyInput
          label="Budget limit"
          value={value}
          onChange={setValue}
          error={error}
        />
      </div>
    </Modal>
  )
}
