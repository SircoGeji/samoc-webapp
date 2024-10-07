import {AsyncValidatorFn, FormControl, ValidationErrors} from '@angular/forms';
import {Observable, of} from 'rxjs';
import {map} from 'rxjs/operators';
import {RokuService} from '../service/roku.service';

export const identityCheckValidator = (
  fieldName: string,
  moduleType: string,
  rokuService: RokuService,
  importedValue?,
  pageQuery?: string
): AsyncValidatorFn => {
  return (control: FormControl): Observable<ValidationErrors | null> => {
    if (control.value) {
      return rokuService
        .getAllModules(moduleType)
        .pipe(
          map((res) => {
            let flag = false;
            let modules = res?.data;

            if (!modules) {
              return null;
            }

            const currentStore = rokuService.getStore();
            const currentProduct = rokuService.getProduct();

            if (moduleType !== 'sku') {
              modules = modules.filter((el) => {
                return (
                  el.productId === currentProduct.productId &&
                  el.storeId === currentStore.storeId
                );
              });
            }

            modules.forEach((element) => {
              if (element[fieldName] === control.value.trim()) {
                flag = true;
              }
            });
            if (importedValue === control.value.trim() && pageQuery === 'view') {
              flag = false;
            }
            return flag ? {
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