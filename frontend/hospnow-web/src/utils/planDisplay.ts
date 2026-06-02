import type { HealthPlan } from "../types/Hospital";

const legacyProductPattern = /^(.*?)\s+-\s+Produto\s+(.+)$/i;
const legacyCategoryPattern = /^(.*?)\s+-\s+(.+)$/i;

const genericCategories = [
  "Personal / Pleno",
  "Clássico",
  "Estilo",
  "Absoluto",
  "Superior",
  "Exclusivo / Master",
];

const operatorCatalogs = [
  {
    aliases: ["UNIMED"],
    categories: [
      category("Personal / Pleno", "PERSONAL", "PLENO"),
      category("Clássico", "CLASSICO"),
      category("Estilo", "ESTILO"),
      category("Absoluto", "ABSOLUTO"),
      category("Superior", "SUPERIOR"),
      category("Exclusivo / Master", "EXCLUSIVO", "MASTER"),
    ],
    displayName: "Unimed",
  },
  {
    aliases: ["AMIL"],
    categories: [
      category("Amil Fácil", "AMIL FACIL", "FACIL"),
      category("Amil S380", "S380", "S 380"),
      category("Amil S450", "S450", "S 450"),
      category("Amil S580", "S580", "S 580"),
      category("Amil S750", "S750", "S 750"),
      category("Amil One", "AMIL ONE", "ONE", "S1500", "S2500", "S6500", "BLACK"),
    ],
    displayName: "Amil",
  },
  {
    aliases: ["BRADESCO"],
    categories: [
      category("Regional", "REGIONAL"),
      category("Efetivo Plus", "EFETIVO PLUS"),
      category("Efetivo", "EFETIVO"),
      category("Flex", "FLEX"),
      category("Ideal", "IDEAL"),
      category("Nacional Flex", "NACIONAL FLEX"),
      category("Nacional Plus", "NACIONAL PLUS"),
      category("Nacional", "NACIONAL"),
      category("Saúde Mais", "SAUDE MAIS"),
      category("Premium", "PREMIUM"),
    ],
    displayName: "Bradesco",
  },
  {
    aliases: ["PORTO SEGURO"],
    categories: [
      category("Prata Pro", "PRATA PRO"),
      category("Cristal", "CRISTAL"),
      category("Bronze", "BRONZE"),
      category("Prata", "PRATA"),
      category("Ouro", "OURO"),
      category("Diamante", "DIAMANTE"),
    ],
    displayName: "Porto Seguro Saúde",
  },
  {
    aliases: ["SUL AMERICA", "SULAMERICA"],
    categories: [
      category("Exato", "EXATO"),
      category("Clássico", "CLASSICO"),
      category("Especial", "ESPECIAL"),
      category("Executivo", "EXECUTIVO"),
      category("Prestige", "PRESTIGE"),
    ],
    displayName: "SulAmérica",
  },
  {
    aliases: ["NOTRE DAME", "NOTREDAME", "INTERMEDICA", "GNDI"],
    categories: [
      category("Smart", "SMART"),
      category("Advance", "ADVANCE"),
      category("Premium", "PREMIUM"),
      category("Infinity", "INFINITY"),
    ],
    displayName: "NotreDame Intermédica",
  },
  {
    aliases: ["HAPVIDA"],
    categories: [
      category("Nosso Plano", "NOSSO PLANO"),
      category("Mix", "MIX"),
      category("Pleno", "PLENO"),
      category("Premium", "PREMIUM"),
    ],
    displayName: "Hapvida",
  },
  {
    aliases: ["ALLIANZ"],
    categories: [
      category("Essencial", "ESSENCIAL"),
      category("Ampliado", "AMPLIADO"),
      category("Completo", "COMPLETO"),
      category("Exclusivo", "EXCLUSIVO"),
    ],
    displayName: "Allianz",
  },
];

function category(label: string, ...aliases: string[]) {
  return { aliases, label };
}

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .toUpperCase()
    .trim();
}

function catalogMatchesOperator(
  catalog: (typeof operatorCatalogs)[number],
  normalizedText: string
) {
  return catalog.aliases.some((alias) =>
    normalizedText.includes(normalizeText(alias))
  );
}

function findCatalog(operatorName?: string, planName?: string) {
  const normalizedText = normalizeText(`${operatorName ?? ""} ${planName ?? ""}`);

  return operatorCatalogs.find((catalog) =>
    catalogMatchesOperator(catalog, normalizedText)
  );
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

function legacyCategoryRank(value?: string) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || normalizedValue.includes("NAO INFORMADA")) {
    return undefined;
  }

  if (
    normalizedValue.includes("PERSONAL") ||
    normalizedValue.includes("PLENO")
  ) {
    return 0;
  }

  if (normalizedValue.includes("CLASSICO")) {
    return 1;
  }

  if (
    normalizedValue.includes("ESTILO") ||
    normalizedValue.includes("INTERMEDIARIO")
  ) {
    return 2;
  }

  if (normalizedValue.includes("ABSOLUTO")) {
    return 3;
  }

  if (normalizedValue.includes("SUPERIOR")) {
    return 4;
  }

  if (
    normalizedValue.includes("EXCLUSIVO") ||
    normalizedValue.includes("MASTER")
  ) {
    return 5;
  }

  return undefined;
}

function categoryRankFromProductCode(productCode?: string) {
  const digitsOnly = productCode?.replace(/\D/g, "") ?? "";

  if (digitsOnly.length < 2) {
    return undefined;
  }

  const suffix = Number(digitsOnly.slice(-2));

  if (suffix <= 19) {
    return 0;
  }

  if (suffix <= 39) {
    return 1;
  }

  if (suffix <= 59) {
    return 2;
  }

  if (suffix <= 74) {
    return 3;
  }

  if (suffix <= 88) {
    return 4;
  }

  return 5;
}

function matchCatalogCategory(
  catalog: (typeof operatorCatalogs)[number],
  value?: string
) {
  const normalizedValue = normalizeText(value);

  return catalog.categories.find((planCategory) => {
    if (normalizedValue.includes(normalizeText(planCategory.label))) {
      return true;
    }

    return planCategory.aliases.some((alias) =>
      normalizedValue.includes(normalizeText(alias))
    );
  })?.label;
}

function categoryByRank(
  catalog: (typeof operatorCatalogs)[number],
  rank: number
) {
  const categoryIndex = Math.round(
    (rank * (catalog.categories.length - 1)) / (genericCategories.length - 1)
  );

  return catalog.categories[categoryIndex]?.label ?? "";
}

function inferCategory(
  operatorName: string,
  planName?: string,
  categoryName?: string,
  planCode?: string
) {
  const catalog = findCatalog(operatorName, planName);

  if (catalog) {
    const directCategory = matchCatalogCategory(
      catalog,
      `${planName ?? ""} ${categoryName ?? ""} ${planCode ?? ""}`
    );

    if (directCategory) {
      return directCategory;
    }
  }

  const legacyRank =
    legacyCategoryRank(categoryName) ??
    legacyCategoryRank(planName) ??
    (planCode?.includes(":") ? legacyCategoryRank(planCode) : undefined) ??
    categoryRankFromProductCode(planCode);

  if (catalog && legacyRank !== undefined) {
    return categoryByRank(catalog, legacyRank);
  }

  if (legacyRank !== undefined) {
    return genericCategories[legacyRank];
  }

  return "";
}

function parseLegacyPlan(plan: HealthPlan) {
  const name = plan.nome?.trim() || "Plano sem nome";
  const legacyProduct = name.match(legacyProductPattern);

  if (legacyProduct) {
    return {
      categoryHint: plan.categoriaProduto,
      name: legacyProduct[1].trim(),
      productCode: legacyProduct[2],
    };
  }

  const legacyCategory = name.match(legacyCategoryPattern);

  if (legacyCategory) {
    return {
      categoryHint: plan.categoriaProduto || legacyCategory[2],
      name: legacyCategory[1].trim(),
      productCode: plan.codigoAnsPlano,
    };
  }

  return {
    categoryHint: plan.categoriaProduto,
    name,
    productCode: plan.codigoAnsPlano,
  };
}

export function getCategoryOrderForOperator(operatorName: string) {
  return findCatalog(operatorName)?.categories.map((planCategory) => planCategory.label) ?? [];
}

export function getPlanOperatorName(plan: HealthPlan) {
  const parsedPlan = parseLegacyPlan(plan);
  const normalizedName = normalizeText(parsedPlan.name);
  const catalog = operatorCatalogs.find((operatorCatalog) =>
    catalogMatchesOperator(operatorCatalog, normalizedName)
  );

  return catalog?.displayName ?? cleanCorporateSuffixes(parsedPlan.name);
}

export function getPlanCategoryName(plan: HealthPlan) {
  const parsedPlan = parseLegacyPlan(plan);
  const operatorName = getPlanOperatorName(plan);

  return inferCategory(
    operatorName,
    plan.nome,
    parsedPlan.categoryHint,
    parsedPlan.productCode
  );
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

export function getUniquePlanOperatorNames(plans: HealthPlan[] = []) {
  return Array.from(
    new Set(
      plans
        .filter((plan) => getPlanCategoryName(plan))
        .map(getPlanOperatorName)
    )
  )
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, "pt-BR"));
}

export function getLimitedPlanDisplay(plans: HealthPlan[] = [], limit: number) {
  const names = getUniquePlanOperatorNames(plans);

  return {
    hiddenCount: Math.max(names.length - limit, 0),
    names: names.slice(0, limit),
    totalCount: names.length,
  };
}
