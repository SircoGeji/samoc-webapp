import { HttpClient } from '@angular/common/http';
import {
  AsyncValidatorFn,
  FormControl,
  ValidationErrors,
} from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, delay, map, switchMap, take } from 'rxjs/operators';
import { ValidatorResponse } from '../types/ValidatorReponse';
import { isOffline } from '../helpers/color-utils';
import { getApiEndpoint, removeXid } from '../helpers/string-utils';

const VALIDATOR_ENDPOINT = getApiEndpoint('/api/validator/offer');

export const offerCodeValidator = (
  httpClient: HttpClient,
  storeCode: string,
  offerTypeId: number,
): AsyncValidatorFn => {
  const url = `${VALIDATOR_ENDPOINT}/${storeCode}`;
  return (control: FormControl): Observable<ValidationErrors | null> => {
    isOffline();
    if (control) {
      return control.valueChanges.pipe(
        delay(500),
        take(1),
        switchMap((_) => {
          return httpClient
            .get<ValidatorResponse>(`${url}/${control.value}?offerTypeId=${offerTypeId}`)
            .pipe(
              map((r) => {
                return r.success ? null : { badPlanCode: removeXid(r.message) };
              }),
              catchError((err) => {
                // console.error(err.status);
                return of(
                  err.status === 409
                    ? { badOfferCode: removeXid(err.error.message) }
                    : {
                        badOfferCode: `Unable to verify: ${
                          err.error?.message
                            ? removeXid(err.error.message)
                            : 'Possible network error'
                        }`,
                      },
                );
              }),
            );
        }),
      );
    } else {
      return null;
    }
  };
};
