export interface HealthPlan {
  id: number;
  nome: string;
  codigoAnsOperadora?: string;
  codigoAnsPlano?: string;
  modalidadeOperadora?: string;
  segmentacaoAssistencial?: string;
  abrangenciaGeografica?: string;
  situacao?: string;
  fonteDados?: string;
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
  codigoCnes?: string;
  cnpj?: string;
  cep?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  codigoMunicipio?: number;
  codigoTipoUnidade?: number;
  tipoUnidade?: string;
  fonteDados?: string;
  dataAtualizacaoFonte?: string;
  planos: HealthPlan[];
  especialidades: Specialty[];
}
