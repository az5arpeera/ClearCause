// SAMPLE DATA. Northside Community Pantry, Harlow (Ohio), its suppliers and
// every figure below are fictional and illustrative. Replace with real partner
// data before anything ships.

export type ProgramId = "grocery" | "mobile" | "packs"

export interface Program {
  id: ProgramId
  name: string
  description: string
  spending: number
  output: { value: number; unit: string }
  unitCost: { value: number; unit: string }
  reach: string
}

export interface Disbursement {
  date: string
  payee: string
  purpose: string
  program: ProgramId
  amount: number
}

export interface Check {
  label: string
  detail: string
}

export interface MatchReason {
  preference: string
  yours: string
  theirs: string
}

export const charity = {
  name: "Northside Community Pantry",
  kind: "Food bank",
  place: "Harlow, Ohio",
  founded: 2009,
  people: "3 staff, 140 volunteers",
  fiscalYear: "Fiscal 2025",
  period: "1 July 2024 to 30 June 2025",
  partner: {
    status: "Vetted partner",
    auditedOn: "14 March 2026",
    auditor: "independent audit by a CPA firm",
  },
  mission:
    "Northside runs a weekly grocery distribution out of a former hardware store on Linden Avenue, a mobile pantry for seniors who can't make the trip, and weekend food packs for children at four elementary schools.",
}

export const revenue = [
  { label: "Individual gifts", amount: 238_900 },
  { label: "Foundation grants", amount: 96_000 },
  { label: "Local businesses and congregations", amount: 52_400 },
  { label: "Events", amount: 25_300 },
]

export const expenses = {
  programs: 334_500,
  admin: 39_800,
  fundraising: 23_900,
}

export const programs: Program[] = [
  {
    id: "grocery",
    name: "Weekly grocery distribution",
    description:
      "Households choose their own groceries, shopping-style, every Thursday and Saturday. Fresh produce is bought from a regional co-op rather than relying only on donated shelf-stable food.",
    spending: 201_300,
    output: { value: 486_000, unit: "lb of food" },
    unitCost: { value: 0.41, unit: "per lb" },
    reach: "1,940 households",
  },
  {
    id: "mobile",
    name: "Mobile pantry",
    description:
      "A refrigerated van makes twelve stops a week at senior housing and three rural crossroads where the nearest grocery store is more than ten miles away.",
    spending: 78_400,
    output: { value: 624, unit: "stops" },
    unitCost: { value: 125.64, unit: "per stop" },
    reach: "410 seniors",
  },
  {
    id: "packs",
    name: "School weekend packs",
    description:
      "Teachers flag students who arrive hungry on Mondays. Each Friday those students go home with a pack of breakfast and lunch for two days, handed out discreetly by school staff.",
    spending: 54_800,
    output: { value: 21_700, unit: "packs" },
    unitCost: { value: 2.53, unit: "per pack" },
    reach: "620 students a week",
  },
]

export const disbursements: Disbursement[] = [
  { date: "27 Jun", payee: "Harlow Valley Produce Co‑op", purpose: "Fresh produce, 14,200 lb", program: "grocery", amount: 8_640 },
  { date: "24 Jun", payee: "Ridgeline Fleet Services", purpose: "Refrigerated van service", program: "mobile", amount: 1_215.4 },
  { date: "18 Jun", payee: "Brightwater Dairy", purpose: "Milk and eggs, 3,100 units", program: "grocery", amount: 4_402 },
  { date: "12 Jun", payee: "Cedar Street Wholesale", purpose: "Weekend pack staples, 2,400 packs", program: "packs", amount: 5_880 },
  { date: "06 Jun", payee: "Harlow Valley Produce Co‑op", purpose: "Fresh produce, 11,900 lb", program: "grocery", amount: 7_259 },
  { date: "30 May", payee: "Harlow Township Senior Housing", purpose: "Site rental, 4 stops", program: "mobile", amount: 600 },
]

export const audited: Check[] = [
  { label: "Financial statements", detail: "Fiscal 2025 statements reconciled to bank records" },
  { label: "Program spending", detail: "84.0% of expenses went to programs, confirmed" },
  { label: "Restricted gifts", detail: "Spent on the purpose each donor named" },
  { label: "Governance", detail: "Board of 7, of whom 6 are independent" },
  { label: "Related parties", detail: "No payments to board members or their businesses" },
]

export const selfReported: Check[] = [
  { label: "Households served", detail: "1,940" },
  { label: "Food distributed", detail: "486,000 lb" },
  { label: "Weekend packs", detail: "21,700" },
  { label: "Volunteer hours", detail: "9,300" },
]

export const match = {
  donor: "Sam",
  reasons: [
    { preference: "Cause", yours: "Hunger and food security", theirs: "Food bank" },
    { preference: "Where", yours: "Within 25 miles of Harlow", theirs: "4 miles away" },
    { preference: "Size", yours: "Small organizations", theirs: "$398K a year" },
    { preference: "Proof", yours: "Audited finances only", theirs: "Audited March 2026" },
  ] satisfies MatchReason[],
}

export const presetGifts = [25, 50, 100, 250]
