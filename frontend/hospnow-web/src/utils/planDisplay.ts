import type { HealthPlan } from "../types/Hospital";

const legacyProductPattern = /^(.*)\s+-\s+Produto\s+(\d+)$/i;
const legacyCategoryPattern = /\s+-\s+(Categoria\s+\d{2}-\d{2}|Intermedi[aá]rio|Categoria n[aã]o informada)$/i;

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
    return "Categoria não informada";
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
    .toUpperCase()
    .trim();
}

function normalizeCategoryName(category?: string) {
  const normalizedCategory = normalizeText(category);

  if (!normalizedCategory) {
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

  const legacyCategory = normalizedCategory.match(/CATEGORIA\s+(\d{2})-\d{2}/);
  if (legacyCategory) {
    return classifyProductCode(legacyCategory[1]);
  }

  return category?.trim() ?? "";
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
  return legacyCategory ? normalizeCategoryName(legacyCategory[1]) : "";
}

export function getPlanOperatorName(plan: HealthPlan) {
  const name = plan.nome?.trim() || "Plano sem nome";
  const legacyProduct = name.match(legacyProductPattern);

  if (legacyProduct) {
    return legacyProduct[1].trim();
  }

  const category = getPlanCategoryName(plan);
  const legacyCategory = name.match(legacyCategoryPattern);

  if (category && legacyCategory) {
    return name.replace(legacyCategoryPattern, "").trim();
  }

  for (const categoryName of networkCategoryNames) {
    const suffix = ` - ${categoryName}`;

    if (name.endsWith(suffix)) {
      return name.slice(0, -suffix.length).trim();
    }
  }

  return name;
}

export function getPlanDisplayName(plan: HealthPlan) {
  const operatorName = getPlanOperatorName(plan);
  const categoryName = getPlanCategoryName(plan);

  return categoryName ? `${operatorName} - ${categoryName}` : operatorName;
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
