import type { Hospital } from "../types/Hospital";

interface HospitalCardProps {
  hospital: Hospital;
  distanceInKm?: number;
}

export function HospitalCard({ distanceInKm, hospital }: HospitalCardProps) {
  const planNames = hospital.planos.map((plan) => plan.nome);
  const specialtyNames = hospital.especialidades?.map((specialty) => specialty.nome) ?? [];
  const hospitalName = hospital.nome || "Hospital sem nome cadastrado";

  return (
    <article className="hospital-card">
      <div className="hospital-card__header">
        <div>
          <span className="hospital-card__eyebrow">Hospital parceiro</span>
          <h2>{hospitalName}</h2>
        </div>

        <span className="hospital-card__badge">
          {planNames.length} {planNames.length === 1 ? "plano" : "planos"}
        </span>
      </div>

      <div className="hospital-card__details">
        <p>
          <span>Endereço</span>
          {hospital.endereco || "Endereço não informado"}
        </p>
        <p>
          <span>Telefone</span>
          {hospital.telefone || "Não informado"}
        </p>
        {distanceInKm !== undefined && (
          <p>
            <span>Distância aproximada</span>
            {distanceInKm.toFixed(1)} km de você
          </p>
        )}
      </div>

      <div className="hospital-card__plans" aria-label="Planos aceitos">
        {planNames.length > 0 ? (
          planNames.map((planName) => <span key={planName}>{planName}</span>)
        ) : (
          <span>Nenhum plano vinculado</span>
        )}
      </div>

      <div className="hospital-card__specialties" aria-label="Especialidades">
        {specialtyNames.length > 0 ? (
          specialtyNames.map((specialtyName) => (
            <span key={specialtyName}>{specialtyName}</span>
          ))
        ) : (
          <span>Sem especialidades cadastradas</span>
        )}
      </div>
    </article>
  );
}
