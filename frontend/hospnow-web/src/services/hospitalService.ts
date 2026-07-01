import { api } from "./api";
import type { Hospital } from "../types/Hospital";
import { filterHospitals } from "../utils/hospitalFilter";

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

  try {
    const response = await api.get<PagedResponse<Hospital> | Hospital[]>(
      `/hospitals/search?${params}`
    );

    if (Array.isArray(response.data)) {
      return paginateHospitals(response.data, filters);
    }

    return response.data;
  } catch {
    const hospitals = await getHospitals();
    return paginateHospitals(hospitals, filters);
  }
}

function paginateHospitals(
  hospitals: Hospital[],
  filters: {
    page?: number;
    pageSize?: number;
    planCategory?: string;
    planName?: string;
    query?: string;
    specialtyName?: string;
  }
): PagedResponse<Hospital> {
  const page = Math.max(0, filters.page ?? 0);
  const size = Math.max(1, filters.pageSize ?? 24);
  const filteredHospitals = filterHospitals(hospitals, {
    planCategory: filters.planCategory ?? "",
    planOperator: filters.planName ?? "",
    query: filters.query ?? "",
    specialtyName: filters.specialtyName ?? "",
  });
  const start = page * size;
  const content = filteredHospitals.slice(start, start + size);
  const totalPages = Math.ceil(filteredHospitals.length / size);

  return {
    content,
    first: page === 0,
    last: page + 1 >= totalPages,
    page,
    size,
    totalElements: filteredHospitals.length,
    totalPages,
  };
}
