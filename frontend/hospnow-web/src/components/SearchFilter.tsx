interface SearchFilterProps {
  disabled?: boolean;
  searchTerm: string;
  onChange: (searchTerm: string) => void;
  onSubmit: () => void;
}

export function SearchFilter({
  disabled = false,
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
          type="search"
          value={searchTerm}
          placeholder="Ex: Hospital Intermedica ou Unimed"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <button type="submit" disabled={disabled}>
        Buscar
      </button>
    </form>
  );
}
