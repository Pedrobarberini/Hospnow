import type { HealthPlan } from "../types/Hospital";

interface PlanFilterProps {
  plans: HealthPlan[];
  selectedPlan: string;
  disabled?: boolean;
  onChange: (planName: string) => void;
}

export function PlanFilter({
  plans,
  selectedPlan,
  disabled = false,
  onChange,
}: PlanFilterProps) {
  return (
    <label className="plan-filter">
      <span>Plano de saúde</span>
      <select
        value={selectedPlan}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Todos os planos</option>
        {plans.map((plan) => (
          <option key={plan.id} value={plan.nome}>
            {plan.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
