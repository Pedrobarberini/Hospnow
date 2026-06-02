import type { HealthPlan } from "../types/Hospital";
import { getPlanDisplayName } from "../utils/planDisplay";

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
  const planOptions = Array.from(
    plans.reduce((options, plan) => {
      const displayName = getPlanDisplayName(plan);

      if (!options.has(displayName)) {
        options.set(displayName, plan);
      }

      return options;
    }, new Map<string, HealthPlan>())
  ).sort(([first], [second]) => first.localeCompare(second, "pt-BR"));

  return (
    <label className="plan-filter">
      <span>Plano de saúde</span>
      <select
        value={selectedPlan}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Todos os planos</option>
        {planOptions.map(([displayName]) => (
          <option key={displayName} value={displayName}>
            {displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
