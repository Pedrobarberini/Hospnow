export interface HealthPlan {
  id: number;
  nome: string;
}

export interface Specialty {
  id: number;
  nome: string;
}

export interface Hospital {
  id: number;
  nome: string;
  endereco: string;
  telefone: string;
  latitude: number;
  longitude: number;
  planos: HealthPlan[];
  especialidades: Specialty[];
}
