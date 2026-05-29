import { api } from "./api";
import type { HealthPlan } from "../types/Hospital";

export async function getHealthPlans(): Promise<HealthPlan[]> {
  const response = await api.get<HealthPlan[]>("/plans");
  return response.data;
}
