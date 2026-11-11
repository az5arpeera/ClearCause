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

export type CauseId = (typeof causes)[number]["id"]
