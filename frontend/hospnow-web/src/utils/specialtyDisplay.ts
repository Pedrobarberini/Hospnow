import type { Specialty } from "../types/Hospital";

const genericSpecialties = new Set(["atendimento hospitalar"]);

function normalizeSpecialtyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getLimitedSpecialtyDisplay(
  specialties: Specialty[] = [],
  limit = 5
) {
  const names = Array.from(
    new Set(
      specialties
        .map((specialty) => specialty.nome)
        .filter(Boolean)
        .filter(
          (specialtyName) =>
            !genericSpecialties.has(normalizeSpecialtyName(specialtyName))
        )
    )
  );

  return {
    hiddenCount: Math.max(names.length - limit, 0),
    names: names.slice(0, limit),
    totalCount: names.length,
  };
}
