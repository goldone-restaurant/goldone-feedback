import React from 'react';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, children }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-stone-700 mb-2 text-left">
        {label}
      </label>
      {children}
    </div>
  );
};

export default FormField;