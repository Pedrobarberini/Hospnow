import { api } from "./api";
import type { Specialty } from "../types/Hospital";

export async function getSpecialties(): Promise<Specialty[]> {
  const response = await api.get<Specialty[]>("/specialties");
  return response.data;
}
