interface SearchFilterProps {
  disabled?: boolean;
  suggestions?: Array<{
    label?: string;
    value: string;
  }>;
  searchTerm: string;
  onChange: (searchTerm: string) => void;
  onSubmit: () => void;
}

export function SearchFilter({
  disabled = false,
  suggestions = [],
  searchTerm,
  onChange,
  onSubmit,
}: SearchFilterProps) {
  return (
    <form
      className="search-filter"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label>
        <span>Buscar hospital ou plano</span>
        <input
          list="hospital-search-options"
          type="search"
          value={searchTerm}
          placeholder="Ex: Hospital Intermedica ou Unimed"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <datalist id="hospital-search-options">
          {suggestions.map((suggestion) => (
            <option
              key={`${suggestion.value}-${suggestion.label ?? ""}`}
              label={suggestion.label}
              value={suggestion.value}
            />
          ))}
        </datalist>
      </label>
      <button type="submit" disabled={disabled}>
        Buscar
      </button>
    </form>
  );
}
