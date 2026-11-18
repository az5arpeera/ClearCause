import { orgs } from "@/data/sample-landing"
import type { MatchableCharity } from "@/lib/matching"
import type { CauseId } from "@/data/causes"

const existingCauses: Partial<Record<string, CauseId[]>> = {
  northside: ["hunger"],
  eastgate: ["reuse"],
  riverbend: ["kids"],
}

// These organizations and budgets are fictional quiz data.
export const sampleCharities: MatchableCharity[] = [
  ...orgs.map(({ id, name, note, place, annualBudgetUsd, href }) => ({
    id, name, description: note, place, region: "Ohio", annualBudgetUsd, href, causes: existingCauses[id] ?? [],
  })),
  {
    id: "willow-keys", name: "Willow Keys Housing Fund", place: "Michigan", region: "Michigan",
    description: "Helps renters cover emergency costs and find stable housing.",
    annualBudgetUsd: 680_000, causes: ["housing"],
  },
  {
    id: "alder-watershed", name: "Alder Watershed Crew", place: "Pennsylvania", region: "Pennsylvania",
    description: "Restores creekside habitat and plants shade trees with local volunteers.",
    annualBudgetUsd: 360_000, causes: ["climate"],
  },
  {
    id: "pawbridge", name: "Pawbridge Foster Network", place: "Ohio", region: "Ohio",
    description: "Provides foster homes and veterinary care for dogs and cats awaiting adoption.",
    annualBudgetUsd: 510_000, causes: ["animals"],
  },
  {
    id: "meadowline", name: "Meadowline Mobile Health", place: "Michigan", region: "Michigan",
    description: "Runs mobile clinics and helps families connect with ongoing care.",
    annualBudgetUsd: 1_250_000, causes: ["health"],
  },
  {
    id: "linden-arts", name: "Linden Street Arts Workshop", place: "Pennsylvania", region: "Pennsylvania",
    description: "Offers free after-school arts classes and studio space for young people.",
    annualBudgetUsd: 290_000, causes: ["arts", "kids"],
  },
]

export const sampleRegions = [...new Set(sampleCharities.flatMap(({ region }) => region ? [region] : []))].sort()
