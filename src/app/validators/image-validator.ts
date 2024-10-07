import { Injectable } from '@angular/core';
import {
  Dimensions,
  ImageLoaderService,
} from '../service/image-loader.service';
import {
  AsyncValidatorFn,
  FormControl,
  ValidationErrors,
} from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import { SUPPORTED_DIMENSIONS } from '../constants';
import * as pluralize from 'pluralize';
import { isOffline } from '../helpers/color-utils';

const VALID_URL_REGEXP = /^(?:(?:(?:https?):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/;
const VALID_HTTP = /^https/;

@Injectable({
  providedIn: 'root',
})
export class ImageValidator {
  static dimsValidator(imgLoader: ImageLoaderService): AsyncValidatorFn {
    isOffline();
    return (control: FormControl): Observable<ValidationErrors | null> => {
      return imgLoader.getDims(control.value).pipe(
        delay(500),
        // tap(dims => console.debug(dims)),
        map((dims: Dimensions) => {
          return SUPPORTED_DIMENSIONS.includes(`${dims.width}x${dims.height}`)
            ? null
            : {
                badDims: `Unsupported image dimensions, only ${SUPPORTED_DIMENSIONS} ${pluralize(
                  'is',
                  SUPPORTED_DIMENSIONS.length,
                )} allowed.`,
              };
        }),
        catchError((err) => {
          return of({ badUrl: 'Image not found, please enter another URL' });
        }),
      );
    };
  }

  static validateUrlPattern(): AsyncValidatorFn {
    return (control: FormControl): Observable<ValidationErrors | null> => {
      if (control.value.match(VALID_HTTP)) {
        return control.value.match(VALID_URL_REGEXP)
          ? of(null)
          : of({ urlInvalid: `Please enter a valid background image URL` });
      } else {
        return of({
          httpInvalid: `Please enter a fully qualified, secure https URL`,
        });
      }
    };
  }
}
