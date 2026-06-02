import type { KeyboardEvent } from "react";
import type { Hospital } from "../types/Hospital";
import { getLimitedPlanDisplay } from "../utils/planDisplay";

interface HospitalCardProps {
  hospital: Hospital;
  distanceInKm?: number;
  isSelected?: boolean;
  onSelect?: (hospital: Hospital) => void;
}

export function HospitalCard({
  distanceInKm,
  hospital,
  isSelected = false,
  onSelect,
}: HospitalCardProps) {
  const planDisplay = getLimitedPlanDisplay(hospital.planos, 6);
  const specialtyNames =
    hospital.especialidades?.map((specialty) => specialty.nome) ?? [];
  const hospitalName = hospital.nome || "Hospital sem nome cadastrado";
  const cityLabel = [hospital.cidade, hospital.uf].filter(Boolean).join(" - ");
  const ownershipLabel =
    hospital.classificacaoAdministrativa &&
    hospital.classificacaoAdministrativa !== "Indefinido"
      ? hospital.classificacaoAdministrativa
      : undefined;
  const emptyPlanLabel =
    hospital.classificacaoAdministrativa === "Público"
      ? "Publico"
      : "Sem planos vinculados na base ANS";
  const officialBadges = [
    hospital.codigoCnes ? `CNES ${hospital.codigoCnes}` : undefined,
    ownershipLabel,
    hospital.tipoUnidade,
    cityLabel || undefined,
    hospital.fonteDados ? `Fonte ${hospital.fonteDados}` : undefined,
  ].filter(Boolean) as string[];

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onSelect) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(hospital);
    }
  }

  return (
    <article
      aria-label={`Selecionar ${hospitalName} no mapa`}
      aria-pressed={isSelected}
      className={`hospital-card${isSelected ? " hospital-card--selected" : ""}`}
      onClick={() => onSelect?.(hospital)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="hospital-card__header">
        <div>
          <span className="hospital-card__eyebrow">Hospital parceiro</span>
          <h2>{hospitalName}</h2>
        </div>

        <span className="hospital-card__badge">
          {planDisplay.totalCount}{" "}
          {planDisplay.totalCount === 1 ? "plano" : "planos"}
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

      {officialBadges.length > 0 && (
        <div className="hospital-card__official" aria-label="Dados oficiais">
          {officialBadges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      )}

      <div className="hospital-card__plans" aria-label="Planos aceitos">
        {planDisplay.totalCount > 0 ? (
          <>
            {planDisplay.names.map((planName) => (
              <span key={planName}>{planName}</span>
            ))}
            {planDisplay.hiddenCount > 0 && (
              <span>+ {planDisplay.hiddenCount} planos</span>
            )}
          </>
        ) : (
          <span>{emptyPlanLabel}</span>
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
