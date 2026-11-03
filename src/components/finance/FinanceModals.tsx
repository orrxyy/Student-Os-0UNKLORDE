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
