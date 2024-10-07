import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function validatePromoPrice(planPrice: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (planPrice !== 0) {
      if (planPrice < control.value) {
        return {
          validatePromoPriceError: true,
        };
      } else {
        return null;
      }
    }
  };
}
