import type { HealthPlan } from "../types/Hospital";

const legacyProductPattern = /^(.*?)\s+-\s+Produto\s+(.+)$/i;
const legacyCategoryPattern =
  /\s+-\s+(Categoria\s+\d{2}-\d{2}|Intermedi[aá]rio|Categoria n[aã]o informada|Personal\s*\/\s*Pleno|Cl[aá]ssico|Estilo|Absoluto|Superior|Exclusivo\s*\/\s*Master)$/i;

export const networkCategoryNames = [
  "Personal / Pleno",
  "Clássico",
  "Estilo",
  "Absoluto",
  "Superior",
  "Exclusivo / Master",
];

function classifyProductCode(productCode?: string) {
  const digitsOnly = productCode?.replace(/\D/g, "") ?? "";

  if (digitsOnly.length < 2) {
    return "";
  }

  const suffix = Number(digitsOnly.slice(-2));

  if (suffix <= 19) {
    return "Personal / Pleno";
  }

  if (suffix <= 39) {
    return "Clássico";
  }

  if (suffix <= 59) {
    return "Estilo";
  }

  if (suffix <= 74) {
    return "Absoluto";
  }

  if (suffix <= 88) {
    return "Superior";
  }

  return "Exclusivo / Master";
}

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toUpperCase()
    .trim();
}

function normalizeCategoryName(category?: string) {
  const normalizedCategory = normalizeText(category);

  if (!normalizedCategory || normalizedCategory.includes("NAO INFORMADA")) {
    return "";
  }

  if (
    normalizedCategory.includes("PERSONAL") ||
    normalizedCategory.includes("PLENO")
  ) {
    return "Personal / Pleno";
  }

  if (normalizedCategory.includes("CLASSICO")) {
    return "Clássico";
  }

  if (
    normalizedCategory.includes("ESTILO") ||
    normalizedCategory.includes("INTERMEDIARIO")
  ) {
    return "Estilo";
  }

  if (normalizedCategory.includes("ABSOLUTO")) {
    return "Absoluto";
  }

  if (normalizedCategory.includes("SUPERIOR")) {
    return "Superior";
  }

  if (
    normalizedCategory.includes("EXCLUSIVO") ||
    normalizedCategory.includes("MASTER")
  ) {
    return "Exclusivo / Master";
  }

  const legacyCategory = normalizedCategory.match(/CATEGORIA\s+(\d{2})\s+\d{2}/);
  if (legacyCategory) {
    return classifyProductCode(legacyCategory[1]);
  }

  return category?.trim() ?? "";
}

function cleanCorporateSuffixes(name: string) {
  const cleanedName = name
    .replace(/\bS\.?\s*A\.?\b/gi, " ")
    .replace(/\bS\/A\b/gi, " ")
    .replace(/\bLTDA\.?\b/gi, " ")
    .replace(/\bEIRELI\b/gi, " ")
    .replace(/\bCOMPANHIA\b/gi, " ")
    .replace(/\bSEGUROS?\b/gi, " ")
    .replace(/\bSA[ÚU]DE\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedName || name;
}

function normalizeOperatorName(name?: string) {
  const sourceName = name?.trim() || "Plano sem nome";
  const normalizedName = normalizeText(sourceName);

  if (normalizedName.includes("PORTO SEGURO")) {
    return "Porto Seguro Saúde";
  }

  if (
    normalizedName.includes("NOTRE DAME") ||
    normalizedName.includes("NOTREDAME") ||
    normalizedName.includes("INTERMEDICA")
  ) {
    return "NotreDame Intermédica";
  }

  if (
    normalizedName.includes("SUL AMERICA") ||
    normalizedName.includes("SULAMERICA")
  ) {
    return "SulAmérica";
  }

  if (normalizedName.includes("UNIMED")) {
    return "Unimed";
  }

  if (normalizedName.includes("BRADESCO")) {
    return "Bradesco";
  }

  if (normalizedName.includes("AMIL")) {
    return "Amil";
  }

  if (normalizedName.includes("ALLIANZ")) {
    return "Allianz";
  }

  if (normalizedName.includes("HAPVIDA")) {
    return "Hapvida";
  }

  if (normalizedName.includes("PREVENT SENIOR")) {
    return "Prevent Senior";
  }

  if (normalizedName.includes("GOLDEN CROSS")) {
    return "Golden Cross";
  }

  if (normalizedName.includes("CARE PLUS")) {
    return "Care Plus";
  }

  if (normalizedName.includes("OMINT")) {
    return "Omint";
  }

  return cleanCorporateSuffixes(sourceName);
}

export function getPlanCategoryName(plan: HealthPlan) {
  const name = plan.nome?.trim() || "Plano sem nome";
  const legacyProduct = name.match(legacyProductPattern);

  if (legacyProduct) {
    return classifyProductCode(legacyProduct[2]);
  }

  const directCategory = normalizeCategoryName(plan.categoriaProduto);
  if (directCategory) {
    return directCategory;
  }

  const legacyCategory = name.match(legacyCategoryPattern);
  if (legacyCategory) {
    return normalizeCategoryName(legacyCategory[1]);
  }

  return classifyProductCode(plan.codigoAnsPlano);
}

export function getPlanOperatorName(plan: HealthPlan) {
  const name = plan.nome?.trim() || "Plano sem nome";
  const legacyProduct = name.match(legacyProductPattern);

  if (legacyProduct) {
    return normalizeOperatorName(legacyProduct[1]);
  }

  const legacyCategory = name.match(legacyCategoryPattern);

  if (legacyCategory) {
    return normalizeOperatorName(name.replace(legacyCategoryPattern, ""));
  }

  for (const categoryName of networkCategoryNames) {
    const suffix = ` - ${categoryName}`;

    if (name.endsWith(suffix)) {
      return normalizeOperatorName(name.slice(0, -suffix.length));
    }
  }

  return normalizeOperatorName(name);
}

export function getPlanDisplayName(plan: HealthPlan) {
  const operatorName = getPlanOperatorName(plan);
  const categoryName = getPlanCategoryName(plan);

  return categoryName ? `${operatorName} - ${categoryName}` : "";
}

export function getUniquePlanDisplayNames(plans: HealthPlan[] = []) {
  return Array.from(new Set(plans.map(getPlanDisplayName)))
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, "pt-BR"));
}

export function getLimitedPlanDisplay(plans: HealthPlan[] = [], limit: number) {
  const names = getUniquePlanDisplayNames(plans);

  return {
    hiddenCount: Math.max(names.length - limit, 0),
    names: names.slice(0, limit),
    totalCount: names.length,
  };
}
