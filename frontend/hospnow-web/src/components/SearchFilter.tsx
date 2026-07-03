import { useId, useState } from "react";

export interface SearchSuggestion {
  label?: string;
  value: string;
}

interface SearchFilterProps {
  disabled?: boolean;
  suggestions?: SearchSuggestion[];
  searchTerm: string;
  onChange: (searchTerm: string) => void;
  onSuggestionSelect?: (searchTerm: string) => void;
  onSubmit: () => void;
}

export function SearchFilter({
  disabled = false,
  suggestions = [],
  searchTerm,
  onChange,
  onSuggestionSelect,
  onSubmit,
}: SearchFilterProps) {
  const listId = useId();
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const hasSuggestions = suggestions.length > 0;
  const showSuggestions = isSuggestionsOpen && !disabled && hasSuggestions;

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
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showSuggestions}
          type="search"
          value={searchTerm}
          placeholder="Ex: Hospital Intermedica ou Unimed"
          disabled={disabled}
          onBlur={() => {
            window.setTimeout(() => setIsSuggestionsOpen(false), 120);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setIsSuggestionsOpen(true);
          }}
          onFocus={() => setIsSuggestionsOpen(true)}
        />
        {showSuggestions && (
          <div className="search-filter__suggestions" id={listId} role="listbox">
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.value}-${suggestion.label ?? ""}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(suggestion.value);
                  onSuggestionSelect?.(suggestion.value);
                  setIsSuggestionsOpen(false);
                }}
              >
                <strong>{suggestion.value}</strong>
                {suggestion.label && <span>{suggestion.label}</span>}
              </button>
            ))}
          </div>
        )}
      </label>
      <button type="submit" disabled={disabled}>
        Buscar
      </button>
    </form>
  );
}
