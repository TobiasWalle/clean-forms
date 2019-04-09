import { useContext } from 'react';
import * as React from 'react';
import { GetKey } from '../components';
import { FormReadApi } from '../hooks/useFormReadApi';
import { assertNotNull, Path } from '../utils';

export type OnFieldMount = (id: string) => void;

export type OnFieldUnmount = (id: string) => void;

export type OnFieldBlur = (id: string) => void;

export type OnFieldChange<Model> = (id: string, path: Path, value: any) => void;

export type SetArrayGetKey = (id: Path, getKey: GetKey<any>) => void;

export interface FormContextValue<Model> extends FormReadApi<Model> {
  onFieldMount: OnFieldMount;
  onFieldUnmount: OnFieldUnmount;
  onFieldBlur: OnFieldBlur;
  onFieldChange: OnFieldChange<Model>;
  setArrayGetKey: SetArrayGetKey;
}

export const FormContext = React.createContext<FormContextValue<any> | null>(null);

export function useFormContext<T>(): FormContextValue<T> {
  return assertNotNull(
    useContext(FormContext),
    'This component needs to be used inside a FormContext'
  );
}