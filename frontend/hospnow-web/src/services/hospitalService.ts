import { api } from "./api";
import type { Hospital } from "../types/Hospital";

export async function getHospitals(): Promise<Hospital[]> {
  const response = await api.get<Hospital[]>("/hospitals");
  return response.data;
}

export async function getHospitalsByPlan(planName: string): Promise<Hospital[]> {
  const response = await api.get<Hospital[]>(
    `/hospitals/plan/${encodeURIComponent(planName)}`
  );

  return response.data;
}

export async function searchHospitals(filters: {
  planName?: string;
  specialtyName?: string;
}): Promise<Hospital[]> {
  const params = new URLSearchParams();

  if (filters.planName) {
    params.set("plan", filters.planName);
  }

  if (filters.specialtyName) {
    params.set("specialty", filters.specialtyName);
  }

  const response = await api.get<Hospital[]>(`/hospitals/search?${params}`);
  return response.data;
}
