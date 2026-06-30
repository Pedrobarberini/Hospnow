import type { HealthPlan, Hospital } from "../types/Hospital";
import {
  getPlanCategoryName,
  getPlanDisplayName,
  getPlanOperatorName,
  getCategoryOrderForOperator,
} from "./planDisplay";

export const PUBLIC_NETWORK_OPERATOR = "Rede Pública";

interface HospitalFilterOptions {
  planCategory: string;
  planOperator: string;
  query: string;
  specialtyName: string;
}

function normalizeSearchText(value?: string | number | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getSearchTerms(query: string) {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

function getPlanSearchText(plan: HealthPlan) {
  return [
    plan.nome,
    getPlanDisplayName(plan),
    getPlanOperatorName(plan),
    getPlanCategoryName(plan),
    plan.categoriaProduto,
    plan.codigoAnsOperadora,
    plan.codigoAnsPlano,
    plan.modalidadeOperadora,
    plan.segmentacaoAssistencial,
    plan.abrangenciaGeografica,
  ].join(" ");
}

function hospitalMatchesPlan(
  hospital: Hospital,
  planOperator: string,
  planCategory: string
) {
  if (!planOperator && !planCategory) {
    return true;
  }

  const normalizedPlanOperator = normalizeSearchText(planOperator);
  const normalizedPlanCategory = normalizeSearchText(planCategory);
  const normalizedPublicOperator = normalizeSearchText(PUBLIC_NETWORK_OPERATOR);

  if (
    normalizedPlanOperator.length >= 3 &&
    normalizedPublicOperator.includes(normalizedPlanOperator)
  ) {
    return (
      !planCategory &&
      hospital.classificacaoAdministrativa === "Público" &&
      (!hospital.planos || hospital.planos.length === 0)
    );
  }

  return hospital.planos?.some((plan) => {
    const operatorSearchText = normalizeSearchText(
      `${getPlanOperatorName(plan)} ${getPlanSearchText(plan)}`
    );
    const categorySearchText = normalizeSearchText(
      `${getPlanCategoryName(plan)} ${getPlanSearchText(plan)}`
    );
    const matchesOperator =
      !normalizedPlanOperator ||
      operatorSearchText.includes(normalizedPlanOperator);
    const matchesCategory =
      !normalizedPlanCategory ||
      categorySearchText.includes(normalizedPlanCategory);

    return matchesOperator && matchesCategory;
  });
}

function hospitalMatchesSpecialty(hospital: Hospital, specialtyName: string) {
  if (!specialtyName) {
    return true;
  }

  const normalizedSpecialty = normalizeSearchText(specialtyName);

  return hospital.especialidades?.some((specialty) =>
    normalizeSearchText(specialty.nome).includes(normalizedSpecialty)
  );
}

function hospitalMatchesQuery(hospital: Hospital, query: string) {
  const terms = getSearchTerms(query);

  if (terms.length === 0) {
    return true;
  }

  const searchableText = normalizeSearchText(
    [
      hospital.nome,
      hospital.endereco,
      hospital.telefone,
      hospital.codigoCnes,
      hospital.bairro,
      hospital.cidade,
      hospital.uf,
      hospital.tipoUnidade,
      hospital.tipoGestao,
      hospital.esferaAdministrativa,
      hospital.naturezaJuridica,
      hospital.classificacaoAdministrativa,
      hospital.classificacaoAdministrativa === "Público" &&
      (!hospital.planos || hospital.planos.length === 0)
        ? PUBLIC_NETWORK_OPERATOR
        : undefined,
      ...(hospital.planos ?? []).map(getPlanSearchText),
      ...(hospital.especialidades ?? []).map((specialty) => specialty.nome),
    ].join(" ")
  );

  return terms.every((term) => searchableText.includes(term));
}

export function filterHospitals(
  hospitals: Hospital[],
  { planCategory, planOperator, query, specialtyName }: HospitalFilterOptions
) {
  return hospitals.filter(
    (hospital) =>
      hospitalMatchesPlan(hospital, planOperator, planCategory) &&
      hospitalMatchesSpecialty(hospital, specialtyName) &&
      hospitalMatchesQuery(hospital, query)
  );
}

export function getLinkedPlans(hospitals: Hospital[]) {
  const plansByOperatorName = new Map<string, HealthPlan>();

  if (
    hospitals.some(
      (hospital) =>
        hospital.classificacaoAdministrativa === "Público" &&
        (!hospital.planos || hospital.planos.length === 0)
    )
  ) {
    plansByOperatorName.set(PUBLIC_NETWORK_OPERATOR, {
      id: -1,
      nome: PUBLIC_NETWORK_OPERATOR,
    });
  }

  hospitals.forEach((hospital) => {
    hospital.planos?.forEach((plan) => {
      const categoryName = getPlanCategoryName(plan);
      const operatorName = getPlanOperatorName(plan);

      if (
        categoryName &&
        operatorName &&
        !plansByOperatorName.has(operatorName)
      ) {
        plansByOperatorName.set(operatorName, plan);
      }
    });
  });

  return Array.from(plansByOperatorName.values());
}

export function getLinkedPlansFromCatalog(plans: HealthPlan[]) {
  const plansByOperatorName = new Map<string, HealthPlan>();

  plansByOperatorName.set(PUBLIC_NETWORK_OPERATOR, {
    id: -1,
    nome: PUBLIC_NETWORK_OPERATOR,
  });

  plans.forEach((plan) => {
    const categoryName = getPlanCategoryName(plan);
    const operatorName = getPlanOperatorName(plan);

    if (
      categoryName &&
      operatorName &&
      !plansByOperatorName.has(operatorName)
    ) {
      plansByOperatorName.set(operatorName, plan);
    }
  });

  return Array.from(plansByOperatorName.values());
}

export function getPlanCategoriesForOperator(
  hospitals: Hospital[],
  planOperator: string
) {
  const normalizedPlanOperator = normalizeSearchText(planOperator);

  if (
    normalizedPlanOperator.length >= 3 &&
    normalizeSearchText(PUBLIC_NETWORK_OPERATOR).includes(normalizedPlanOperator)
  ) {
    return [];
  }

  const categories = new Set<string>();

  hospitals.forEach((hospital) => {
    hospital.planos?.forEach((plan) => {
      const category = getPlanCategoryName(plan);
      const operatorSearchText = normalizeSearchText(
        `${getPlanOperatorName(plan)} ${getPlanSearchText(plan)}`
      );

      if (
        category &&
        (!normalizedPlanOperator ||
          operatorSearchText.includes(normalizedPlanOperator))
      ) {
        categories.add(category);
      }
    });
  });

  const categoryOrder = getCategoryOrderForOperator(planOperator);
  const orderedCategories = categoryOrder.filter((category) =>
    categories.has(category)
  );
  const extraCategories = Array.from(categories)
    .filter((category) => !categoryOrder.includes(category))
    .sort((first, second) => first.localeCompare(second, "pt-BR"));

  return [...orderedCategories, ...extraCategories];
}

export function getPlanCategoriesForCatalog(
  plans: HealthPlan[],
  planOperator: string
) {
  const normalizedPlanOperator = normalizeSearchText(planOperator);

  if (
    normalizedPlanOperator.length >= 3 &&
    normalizeSearchText(PUBLIC_NETWORK_OPERATOR).includes(normalizedPlanOperator)
  ) {
    return [];
  }

  const categories = new Set<string>();

  plans.forEach((plan) => {
    const category = getPlanCategoryName(plan);
    const operatorSearchText = normalizeSearchText(
      `${getPlanOperatorName(plan)} ${getPlanSearchText(plan)}`
    );

    if (
      category &&
      (!normalizedPlanOperator ||
        operatorSearchText.includes(normalizedPlanOperator))
    ) {
      categories.add(category);
    }
  });

  const categoryOrder = getCategoryOrderForOperator(planOperator);
  const orderedCategories = categoryOrder.filter((category) =>
    categories.has(category)
  );
  const extraCategories = Array.from(categories)
    .filter((category) => !categoryOrder.includes(category))
    .sort((first, second) => first.localeCompare(second, "pt-BR"));

  return [...orderedCategories, ...extraCategories];
}
