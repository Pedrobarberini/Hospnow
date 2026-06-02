import type { HealthPlan } from "../types/Hospital";

const legacyProductPattern = /^(.*)\s+-\s+Produto\s+(\d+)$/i;

function classifyProductCode(productCode?: string) {
  const digitsOnly = productCode?.replace(/\D/g, "") ?? "";

  if (digitsOnly.length < 2) {
    return "Categoria não informada";
  }

  const suffix = Number(digitsOnly.slice(-2));

  if (suffix >= 80 && suffix <= 88) {
    return "Intermediário";
  }

  const start = suffix >= 89 ? 89 : Math.floor(suffix / 10) * 10;
  const end = suffix >= 89 ? 99 : start + 9;

  return `Categoria ${String(start).padStart(2, "0")}-${String(end).padStart(2, "0")}`;
}

export function getPlanDisplayName(plan: HealthPlan) {
  const name = plan.nome?.trim() || "Plano sem nome";

  if (plan.categoriaProduto && !legacyProductPattern.test(name)) {
    return name;
  }

  const legacyProduct = name.match(legacyProductPattern);
  const productCode = legacyProduct?.[2] ?? plan.codigoAnsPlano;

  if (legacyProduct) {
    return `${legacyProduct[1]} - ${classifyProductCode(productCode)}`;
  }

  return name;
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
