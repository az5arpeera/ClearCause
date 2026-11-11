// SAMPLE DATA for the landing page. Every organization, donor and figure here is
// fictional and illustrative, and the page labels it so. Northside's figures
// come from sample-charity.ts so the two pages always agree.

import { charity, expenses, programs } from "@/data/sample-charity"

export const causes = [
  { id: "hunger", label: "Hunger", photo: "pantry" },
  { id: "housing", label: "Housing", photo: "housing" },
  { id: "kids", label: "Kids and schools", photo: "reading" },
  { id: "climate", label: "Climate", photo: "climate" },
  { id: "animals", label: "Animals", photo: "animals" },
  { id: "health", label: "Health", photo: "health" },
  { id: "arts", label: "Arts", photo: "arts" },
  { id: "reuse", label: "Repair and reuse", photo: "tools" },
] as const

/** Sample platform totals. Placeholder until there is real platform data. */
export const counters = [
  { value: "$2.4M", label: "given through matches" },
  { value: "312", label: "vetted partners" },
  { value: "68%", label: "of partners spend under $1M a year" },
  { value: "82¢", label: "median to programs, per $1" },
]

/**
 * Stock photography. Each entry records its source so the provenance of every
 * shipping raster stays traceable. All are free under the Unsplash License.
 */
export const photos = {
  pantry: {
    src: "https://images.unsplash.com/photo-1599059813005-11265ba4b4ce",
    alt: "Volunteers sorting donated canned food on a long table",
    credit: "Joel Muniz",
    source: "https://unsplash.com/photos/volunteers-sorting-canned-food-donations-3k3l2brxmwQ",
  },
  tools: {
    src: "https://images.unsplash.com/photo-1426927308491-6380b6a9936f",
    alt: "Hand tools hanging in rows on a workshop rack",
    credit: "Barn Images",
    source: "https://unsplash.com/photos/assorted-handheld-tools-in-tool-rack-t5YUoHW6zRo",
  },
  reading: {
    src: "https://images.unsplash.com/photo-1583468982228-19f19164aee2",
    alt: "A woman and a child reading a book together in a library",
    credit: "Adam Winger",
    source: "https://unsplash.com/photos/woman-and-child-reading-in-library-7fF0iei80AQ",
  },
  housing: {
    src: "https://images.unsplash.com/photo-1774869174949-9fd84ba6cc0c",
    alt: "Timber frames of new houses under construction",
    credit: "Troy Mortier",
    source: "https://unsplash.com/photos/several-houses-under-construction-with-wooden-frames-AmGQi4pF_lE",
  },
  climate: {
    src: "https://images.unsplash.com/photo-1598335624134-5bceb5de202d",
    alt: "A woman and a child planting a small tree",
    credit: "Eyoel Kahssay",
    source: "https://unsplash.com/photos/woman-and-child-planting-tree-FyCjvyPG9Pg",
  },
  animals: {
    src: "https://images.unsplash.com/photo-1553688738-a278b9f063e0",
    alt: "A fawn-colored puppy resting on a red and white blanket",
    credit: "Markus Winkler",
    source: "https://unsplash.com/photos/fawn-pup-on-red-and-white-textile-PcKhVNNyEio",
  },
  health: {
    src: "https://images.unsplash.com/photo-1774979161296-bb930552543a",
    alt: "Two women sitting outside the entrance of a clinic",
    credit: "Adhitya Sibikumar",
    source: "https://unsplash.com/photos/two-women-sitting-outside-a-clinic-entrance-UoemfTGzD7g",
  },
  arts: {
    src: "https://images.unsplash.com/photo-1632267071031-1cda764f851f",
    alt: "A colorful mural painted on the side of a building",
    credit: "Tim Mossholder",
    source: "https://unsplash.com/photos/a-mural-painted-on-the-side-of-a-building-cY7FReGjSgQ",
  },
  produce: {
    src: "https://images.unsplash.com/photo-1785076315182-98f6751997ed",
    alt: "Fresh apples and herbs in wooden crates",
    credit: "malwina nogaj",
    source: "https://unsplash.com/photos/fresh-apples-and-herbs-in-wooden-crates-outdoors-8IrVwcDLsgU",
  },
  backdrop: {
    src: "https://images.unsplash.com/photo-1558625702-73e75fca01a0",
    alt: "",
    credit: "Lee Soo hyun",
    source: "https://unsplash.com/photos/a-tree-branch-with-green-leaves-against-a-blue-sky-ltBQHg8oUxY",
  },
  garden: {
    src: "https://images.unsplash.com/photo-1788538812809-f22af3a6993a",
    alt: "Two volunteers tending raised beds in a community garden",
    credit: "Zoshua Colah",
    source: "https://unsplash.com/photos/people-tending-to-community-garden-b7wzLHZJ8-A",
  },
} as const

export const photoUrl = (src: string, w: number, h: number) =>
  `${src}?w=${w}&h=${h}&q=78&auto=format&fit=crop`

export type PhotoKey = keyof typeof photos

export interface Org {
  id: string
  name: string
  kind: string
  place: string
  budget: string
  auditedOn: string
  toPrograms: number
  /** A money figure, audited. */
  spent: { amount: number; on: string }
  /** An outcome count, reported by the organization and not audited. */
  reported: string
  note: string
  photo: PhotoKey
  href?: string
}

const total = expenses.programs + expenses.admin + expenses.fundraising

export const orgs: Org[] = [
  {
    id: "northside",
    name: charity.name,
    kind: "Food bank",
    place: charity.place,
    budget: "$398K a year",
    auditedOn: "Mar 2026",
    toPrograms: Math.round((expenses.programs / total) * 100),
    spent: { amount: programs[0].spending, on: "on weekly grocery distribution" },
    reported: "486,000 lb of food handed out",
    note: "Households shop for their own groceries twice a week in a former hardware store on Linden Avenue.",
    photo: "pantry",
    href: "/charity/northside",
  },
  {
    id: "eastgate",
    name: "Eastgate Tool Library",
    kind: "Repair and reuse",
    place: "Harlow, Ohio",
    budget: "$142K a year",
    auditedOn: "Jan 2026",
    toPrograms: 81,
    spent: { amount: 38_600, on: "on tools, repairs and Saturday fix-it clinics" },
    reported: "2,300 tools lent out",
    note: "A library card for drills, ladders and pressure washers, run out of a church basement.",
    photo: "tools",
  },
  {
    id: "riverbend",
    name: "River Bend Reading Corps",
    kind: "Literacy tutoring",
    place: "Marlow County, Ohio",
    budget: "$264K a year",
    auditedOn: "Feb 2026",
    toPrograms: 86,
    spent: { amount: 151_200, on: "on trained tutors in six schools" },
    reported: "210 children tutored each week",
    note: "One adult, one child, twice a week, from first grade until they read at grade level.",
    photo: "reading",
  },
]

/** The sample donor whose dashboard previews the product. */
export const donor = {
  name: "Sam",
  preferences: ["Hunger", "Kids and schools", "Within 25 miles", "Small organizations", "Audited only"],
  matches: [
    { org: "northside", fit: "4 of 5", tags: ["hunger", "near"] },
    { org: "riverbend", fit: "4 of 5", tags: ["kids", "near"] },
    { org: "eastgate", fit: "3 of 5", tags: ["reuse", "near"] },
  ],
  /** Filter chips over the dashboard preview. */
  filters: [
    { id: "all", label: "All" },
    { id: "hunger", label: "Hunger" },
    { id: "kids", label: "Kids and schools" },
    { id: "near", label: "Within 25 miles" },
  ],
  gifts: [
    { org: "northside", amount: 250 },
    { org: "riverbend", amount: 200 },
    { org: "eastgate", amount: 150 },
  ],
  streakMonths: 10,
  badges: [
    { id: "local", label: "First local gift", detail: "Gave within 25 miles of home" },
    { id: "audited", label: "Audited only", detail: "Every gift went to an audited partner" },
    { id: "small", label: "Small-org regular", detail: "Five gifts to organizations under $1M" },
  ],
}

export const auditChecks = [
  "Financial statements reconciled to bank records",
  "Share of spending that reaches programs",
  "Restricted gifts spent as donors asked",
  "Board independence",
  "Payments to insiders or their businesses",
]

export const auditGaps = [
  "Outcome counts, such as meals or children tutored",
  "Program quality",
  "Volunteer hours",
]
