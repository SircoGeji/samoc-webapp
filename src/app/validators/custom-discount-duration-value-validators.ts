import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function validateDiscountDurationValue(pbd: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (pbd && control.value && control.value % pbd > 0) {
      return {
        durationError: `Must be multiples of selected plan's billing cycle (${pbd}).`,
      };
    }
    return null;
  };
}
