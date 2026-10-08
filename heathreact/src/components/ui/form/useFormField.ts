import { useContext } from 'react';
import { FormFieldContext } from './FormControl';

export function useFormField() {
  return useContext(FormFieldContext);
}
