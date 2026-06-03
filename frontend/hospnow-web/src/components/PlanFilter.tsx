import type { HealthPlan } from "../types/Hospital";
import { getPlanOperatorName } from "../utils/planDisplay";

interface PlanFilterProps {
  categories: string[];
  disabled?: boolean;
  onCategoryChange: (categoryName: string) => void;
  onOperatorChange: (operatorName: string) => void;
  plans: HealthPlan[];
  selectedCategory: string;
  selectedOperator: string;
}

export function PlanFilter({
  categories,
  disabled = false,
  onCategoryChange,
  onOperatorChange,
  plans,
  selectedCategory,
  selectedOperator,
}: PlanFilterProps) {
  const planOptions = Array.from(
    plans.reduce((options, plan) => {
      const displayName = getPlanOperatorName(plan);

      if (!options.has(displayName)) {
        options.set(displayName, plan);
      }

      return options;
    }, new Map<string, HealthPlan>())
  ).sort(([first], [second]) => first.localeCompare(second, "pt-BR"));

  return (
    <>
      <label className="plan-filter">
        <span>Plano de saúde</span>
        <input
          list="health-plan-options"
          placeholder="Todos os planos"
          value={selectedOperator}
          disabled={disabled}
          onChange={(event) => onOperatorChange(event.target.value)}
        />
        <datalist id="health-plan-options">
          {planOptions.map(([displayName]) => (
            <option key={displayName} value={displayName}>
              {displayName}
            </option>
          ))}
        </datalist>
      </label>

      <label className="plan-filter">
        <span>Categoria do plano</span>
        <input
          list="plan-category-options"
          placeholder={
            selectedOperator ? "Todas as categorias" : "Digite uma categoria"
          }
          value={selectedCategory}
          disabled={disabled || categories.length === 0}
          onChange={(event) => onCategoryChange(event.target.value)}
        />
        <datalist id="plan-category-options">
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </datalist>
      </label>
    </>
  );
}
