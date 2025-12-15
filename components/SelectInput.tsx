import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[];
}

export const SelectInput: React.FC<SelectInputProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          className={`block w-full rounded-lg border-gray-300 bg-white border text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 ${className}`}
          {...props}
        >
          <option value="" disabled>Selecione uma opção...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};