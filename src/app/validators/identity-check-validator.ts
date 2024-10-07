import { AbstractControl, ValidationErrors } from '@angular/forms';

interface ValidatorFn {
  (control: AbstractControl): ValidationErrors | null;
}

export const identityCheckValidator = (
  allModules: any,
  fieldName: string,
  importedValue?: string,
  pageQuery?: string,
): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    let flag = false;

    if (!allModules) {
      return null;
    }

    if (!control || !control.value) {
      return null;
    }
    allModules.forEach((element) => {
      if (element[fieldName] === control.value.trim()) {
        flag = true;
      }
    });
    if (importedValue === control.value.trim() && pageQuery === 'view') {
      flag = false;
    }
    return flag
      ? {
          fieldValueIsNotUnique: `Please enter different ${fieldName}, this ${fieldName} already exists`,
        }
      : null;
  };
};
