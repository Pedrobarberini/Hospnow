import type { Specialty } from "../types/Hospital";

interface SpecialtyFilterProps {
  disabled?: boolean;
  onChange: (specialtyName: string) => void;
  selectedSpecialty: string;
  specialties: Specialty[];
}

export function SpecialtyFilter({
  disabled = false,
  onChange,
  selectedSpecialty,
  specialties,
}: SpecialtyFilterProps) {
  return (
    <label className="plan-filter">
      <span>Especialidade</span>
      <select
        value={selectedSpecialty}
        disabled={disabled || specialties.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Todas as especialidades</option>
        {specialties.map((specialty) => (
          <option key={specialty.id} value={specialty.nome}>
            {specialty.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
