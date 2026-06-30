import { api } from "./api";
import type { Hospital } from "../types/Hospital";

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

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
  page?: number;
  pageSize?: number;
  planCategory?: string;
  planName?: string;
  query?: string;
  specialtyName?: string;
}): Promise<PagedResponse<Hospital>> {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (filters.planName) {
    params.set("plan", filters.planName);
  }

  if (filters.planCategory) {
    params.set("category", filters.planCategory);
  }

  if (filters.specialtyName) {
    params.set("specialty", filters.specialtyName);
  }

  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.pageSize ?? 24));

  const response = await api.get<PagedResponse<Hospital>>(
    `/hospitals/search?${params}`
  );
  return response.data;
}
