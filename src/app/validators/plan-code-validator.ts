import { FormControl, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, delay, map, switchMap, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ValidatorResponse } from '../types/ValidatorReponse';
import { isOffline } from '../helpers/color-utils';
import { getApiEndpoint, removeXid } from '../helpers/string-utils';

const VALIDATOR_ENDPOINT = getApiEndpoint('/api/validator/plan');

export const planCodeValidator = (
  httpClient: HttpClient,
  storeCode: string,
  callbackFn?: any,
) => {
  const url = `${VALIDATOR_ENDPOINT}/${storeCode}/`;
  return (control: FormControl): Observable<ValidationErrors | null> => {
    isOffline();
    if (control) {
      return control.valueChanges.pipe(
        delay(500),
        take(1),
        switchMap((_) =>
          httpClient.get<ValidatorResponse>(url + control.value).pipe(
            map((r: any) => {
              if (r.success) {
                if (callbackFn) {
                  callbackFn(r.data);
                }
                return null;
              }
              return { badPlanCode: removeXid(r.message) };
            }),
            catchError((err) => {
              // console.error(err.status);
              return of(
                err.status === 409 || err.status === 404
                  ? { badPlanCode: removeXid(err.error.message) }
                  : {
                      badPlanCode: `Unable to verify: ${
                        err.error?.message
                          ? removeXid(err.error.message)
                          : 'Possible network error'
                      }`,
                    },
              );
            }),
          ),
        ),
      );
    } else {
      return null;
    }
  };
};
