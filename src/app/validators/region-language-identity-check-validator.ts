import {HttpClient} from '@angular/common/http';
import {AsyncValidatorFn, FormControl, ValidationErrors} from '@angular/forms';
import {Observable, of} from 'rxjs';
import {delay, map} from 'rxjs/operators';
import {AndroidService} from '../service/android.service';

export const regionLanguageIdentityCheckValidator = (
  fieldName: string,
  type: string,
  androidService: AndroidService,
  importedValue?,
  pageQuery?: string
): AsyncValidatorFn => {
  return (control: FormControl): Observable<ValidationErrors | null> => {
    if (control.value) {
      return (type === 'region' ?
        androidService.getRegionsLanguages(androidService.getStore().code, androidService.getProduct().code) :
        androidService.getLanguages()
      )
        .pipe(
          delay(1000),
          map((res) => {
            let flag = false;
            if (fieldName === 'name') {
              res.data.forEach((element) => {
                if (element[fieldName].toLowerCase() === control.value.toLowerCase().trim()) {
                  flag = true;
                }
              });
              if (importedValue?.toLowerCase() === control.value.toLowerCase().trim() && pageQuery === 'view') {
                flag = false;
              }
            } else {
              res.data.forEach((element) => {
                if (element[fieldName] === control.value.trim()) {
                  flag = true;
                }
              });
              if (importedValue === control.value.trim() && pageQuery === 'view') {
                flag = false;
              }
            }
            return flag ?  {
              fieldValueIsNotUnique: `Please enter different ${fieldName}, this ${fieldName}
                                      already exists`
            } : null;
          }),
        );
    } else {
      return of(null);
    }
  };
};
