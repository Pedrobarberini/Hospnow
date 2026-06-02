import type { HealthPlan, Hospital } from "../types/Hospital";
import { getPlanDisplayName } from "./planDisplay";

interface HospitalFilterOptions {
  planName: string;
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
    plan.categoriaProduto,
    plan.codigoAnsOperadora,
    plan.codigoAnsPlano,
    plan.modalidadeOperadora,
    plan.segmentacaoAssistencial,
    plan.abrangenciaGeografica,
  ].join(" ");
}

function hospitalMatchesPlan(hospital: Hospital, planName: string) {
  if (!planName) {
    return true;
  }

  return hospital.planos?.some(
    (plan) => plan.nome === planName || getPlanDisplayName(plan) === planName
  );
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
      ...(hospital.planos ?? []).map(getPlanSearchText),
      ...(hospital.especialidades ?? []).map((specialty) => specialty.nome),
    ].join(" ")
  );

  return terms.every((term) => searchableText.includes(term));
}

export function filterHospitals(
  hospitals: Hospital[],
  { planName, query, specialtyName }: HospitalFilterOptions
) {
  return hospitals.filter(
    (hospital) =>
      hospitalMatchesPlan(hospital, planName) &&
      hospitalMatchesSpecialty(hospital, specialtyName) &&
      hospitalMatchesQuery(hospital, query)
  );
}

export function getLinkedPlans(hospitals: Hospital[]) {
  const plansByDisplayName = new Map<string, HealthPlan>();

  hospitals.forEach((hospital) => {
    hospital.planos?.forEach((plan) => {
      const displayName = getPlanDisplayName(plan);

      if (!plansByDisplayName.has(displayName)) {
        plansByDisplayName.set(displayName, plan);
      }
    });
  });

  return Array.from(plansByDisplayName.values());
}
