import { FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function specialPlanCodeValidator(): ValidatorFn {
  return (control: FormControl): ValidationErrors | null => {
    const isSpecialCode = /internal01+/.test(control.value);
    return isSpecialCode ? { specialPlanCode: true } : null;
  };
}
