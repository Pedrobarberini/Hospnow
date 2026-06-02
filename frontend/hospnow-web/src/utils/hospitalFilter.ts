import type { HealthPlan, Hospital } from "../types/Hospital";
import {
  getPlanCategoryName,
  getPlanDisplayName,
  getPlanOperatorName,
  getCategoryOrderForOperator,
} from "./planDisplay";

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

  return hospital.planos?.some((plan) => {
    const matchesOperator =
      !planOperator || getPlanOperatorName(plan) === planOperator;
    const matchesCategory =
      !planCategory || getPlanCategoryName(plan) === planCategory;

    return matchesOperator && matchesCategory;
  });
}

function hospitalMatchesSpecialty(hospital: Hospital, specialtyName: string) {
  if (!specialtyName) {
    return true;
  }

  return hospital.especialidades?.some(
    (specialty) => specialty.nome === specialtyName
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

export function getPlanCategoriesForOperator(
  hospitals: Hospital[],
  planOperator: string
) {
  if (!planOperator) {
    return [];
  }

  const categories = new Set<string>();

  hospitals.forEach((hospital) => {
    hospital.planos?.forEach((plan) => {
      const category = getPlanCategoryName(plan);

      if (
        category &&
        (!planOperator || getPlanOperatorName(plan) === planOperator)
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
