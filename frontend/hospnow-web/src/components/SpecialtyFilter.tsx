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
      <input
        list="specialty-options"
        placeholder="Todas as especialidades"
        value={selectedSpecialty}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id="specialty-options">
        {specialties.map((specialty) => (
          <option key={specialty.id} value={specialty.nome}>
            {specialty.nome}
          </option>
        ))}
      </datalist>
    </label>
  );
}
