import { AbstractControl, ValidationErrors } from '@angular/forms';

interface ValidatorFn {
  (control: AbstractControl): ValidationErrors | null;
}

export const planLengthValidator = (offerPlanLength: number | null): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    let flag = false;

    if (!offerPlanLength) {
      return null;
    }

    if (!control || !control.value) {
      return null;
    }

    return control.value >= offerPlanLength
      ? null
      : {
          invalidPlanLength: `Please enter plan length greater or equal to offer's plan length`,
        };
  };
};
