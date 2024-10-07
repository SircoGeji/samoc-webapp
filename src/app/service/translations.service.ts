import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { getApiEndpoint } from '../helpers/string-utils';
import { StoreTranslatedPayload, StoreTranslatedState, StoreTranslatedUpdateReply } from '../types/payload';

@Injectable({
  providedIn: 'root',
})
export class TranslationsService {
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  getStoreTranslations(): Observable<StoreTranslatedPayload> {
    const url = getApiEndpoint('/api/translations');
    return this.http.get(url).pipe(
      map((response: any) => {
        return response.data as StoreTranslatedPayload;
      }),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  updateStoreTranslations(payload: StoreTranslatedPayload, publish: boolean): Observable<StoreTranslatedUpdateReply> {
    const url = getApiEndpoint(
      `/api/translations?publish=${publish}`,
    );
    payload.translatedState.updatedBy = localStorage.email ? localStorage.email : '';
    return this.http
      .put<StoreTranslatedPayload>(url, payload, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  rollbackStoreTranslations(state: StoreTranslatedState): Observable<StoreTranslatedUpdateReply> {
    const url = getApiEndpoint(
      `/api/translations/rollback`,
    );
    state.updatedBy = localStorage.email ? localStorage.email : '';
    return this.http
      .put<StoreTranslatedUpdateReply>(url, state, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

}