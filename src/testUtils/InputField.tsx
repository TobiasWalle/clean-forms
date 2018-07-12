import * as React from 'react';
import { FieldRenderFunction } from '../lib/components/Field/Field';
import { createField } from '../lib/hocs/index';

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
}

export const renderInput: FieldRenderFunction<string | number, InputFieldProps> = ({
  input: {
    name,
    value,
    onFocus,
    onChange,
    onBlur,
  },
  custom
}) => {
  return (
    <input
      name={name}
      value={value}
      onChange={event => {
        let newValue: string | number = event.target.value;
        if (custom.type === 'number') {
          newValue = Number(newValue);
        }
        onChange(newValue);
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      {...custom}
    />
  );
};

export const InputField = createField<string | number, InputFieldProps>(renderInput);
