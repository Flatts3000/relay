import { useState, useMemo, useEffect } from 'react';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { US_REGIONS } from '../../data/us-regions';

interface RegionAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
}

export function RegionAutocomplete({
  label,
  value,
  onChange,
  error,
  helperText,
  placeholder,
  required,
}: RegionAutocompleteProps) {
  const [query, setQuery] = useState('');

  // Sync query with external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filteredRegions = useMemo(() => {
    if (!query) {
      return US_REGIONS.slice(0, 50);
    }
    const lower = query.toLowerCase();
    const results = [];
    for (const region of US_REGIONS) {
      if (region.name.toLowerCase().includes(lower)) {
        results.push(region);
        if (results.length >= 50) break;
      }
    }
    return results;
  }, [query]);

  const inputId = 'region-autocomplete';

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && ' *'}
        </label>
      )}
      <Combobox
        value={value}
        onChange={(val: string | null) => {
          onChange(val ?? '');
          setQuery(val ?? '');
        }}
        onClose={() => setQuery(value)}
      >
        <div className="relative">
          <ComboboxInput
            id={inputId}
            className={`
              w-full px-4 py-3 min-h-[44px] rounded-lg border transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-0
              ${
                error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }
            `}
            placeholder={placeholder}
            displayValue={(val: string) => val}
            onChange={(e) => {
              setQuery(e.target.value);
              // Clear the selected value when user types (forces re-selection)
              if (value && e.target.value !== value) {
                onChange('');
              }
            }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            aria-required={required}
          />
          <ComboboxOptions className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg bg-white shadow-lg border border-gray-200 focus:outline-none">
            {filteredRegions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">No cities or counties found</div>
            ) : (
              filteredRegions.map((region) => (
                <ComboboxOption
                  key={region.name}
                  value={region.name}
                  className="cursor-pointer select-none px-4 min-h-[44px] flex items-center text-sm data-[focus]:bg-primary-100 data-[focus]:text-primary-900 text-gray-900"
                >
                  <span className="data-[selected]:font-medium">
                    {region.name}
                    <span className="ml-2 text-xs text-gray-400">
                      {region.type === 'county' ? 'County' : 'City'}
                    </span>
                  </span>
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
