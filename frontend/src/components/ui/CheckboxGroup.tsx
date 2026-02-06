import { type ChangeEvent } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CheckboxGroupProps {
  label?: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  name?: string;
}

export function CheckboxGroup({
  label,
  options,
  value,
  onChange,
  error,
  name,
}: CheckboxGroupProps) {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  return (
    <fieldset className="w-full">
      {label && <legend className="block text-sm font-medium text-gray-700 mb-2">{label}</legend>}
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center min-h-[44px] px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={value.includes(option.value)}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleChange(option.value, e.target.checked)
              }
              className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-3 text-gray-900">{option.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </fieldset>
  );
}
