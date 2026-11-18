import type { CharityFinancials } from "@/lib/db"

export const whole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
export const exact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
export const count = new Intl.NumberFormat("en-US")

/** "$398K", "$1.25M": compact budgets for metadata lines. */
export function compactUsd(n: number) {
  if (n >= 1_000_000) {
    const m = (n / 1_000_000).toFixed(2)
    return `$${Number(m)}M`
  }
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return whole.format(n)
}

export type SpendPart = {
  key: "programs" | "admin" | "fundraising" | "overhead"
  label: string
  amount: number
  cents: number
  swatch: string
}

/**
 * Splits one fiscal year's spending into the parts a donor reads: programs,
 * then admin and fundraising when the statement breaks them out, or a single
 * "admin and fundraising" line when it only gives the program total.
 * Cents always sum to 100.
 */
export function spendingParts(f: CharityFinancials): SpendPart[] | null {
  const total = f.totalExpenses
  const programs = f.programExpenses ?? (total != null && f.programRatio != null ? total * f.programRatio : null)
  if (!total || programs == null) return null

  const admin = f.adminExpenses
  const fundraising = f.fundraisingExpenses
  const raw: Omit<SpendPart, "cents">[] =
    admin != null && fundraising != null
      ? [
          { key: "programs", label: "Programs", amount: programs, swatch: "bg-money" },
          { key: "admin", label: "Management and admin", amount: admin, swatch: "bg-admin" },
          { key: "fundraising", label: "Fundraising", amount: fundraising, swatch: "bg-fundraising" },
        ]
      : [
          { key: "programs", label: "Programs", amount: programs, swatch: "bg-money" },
          { key: "overhead", label: "Admin and fundraising", amount: Math.max(0, total - programs), swatch: "bg-admin" },
        ]

  const sum = raw.reduce((s, p) => s + p.amount, 0) || 1
  const parts = raw.map((p) => ({ ...p, cents: Math.round((p.amount / sum) * 100) }))
  // Put any rounding difference on the last part so the dollar adds to 100 cents.
  parts[parts.length - 1].cents += 100 - parts.reduce((s, p) => s + p.cents, 0)
  return parts
}

/** Splits a gift in whole cents across the parts, so the pieces add back to the total. */
export function splitAmount(amount: number, parts: SpendPart[]) {
  const total = Math.round(amount * 100)
  const sum = parts.reduce((s, p) => s + p.amount, 0) || 1
  let allotted = 0
  return parts.map((p, i) => {
    const share = i === parts.length - 1 ? total - allotted : Math.round((total * p.amount) / sum)
    allotted += share
    return { key: p.key, label: p.label, amount: share / 100 }
  })
}
