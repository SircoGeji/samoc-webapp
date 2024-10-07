import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { BehaviorSubject, Observable, throwError } from 'rxjs';

import * as pluralize from 'pluralize';

import {
  AllowedOffersForTerm,
  Dropdown,
  DropdownInt,
  FilterState,
  OfferRequestPayload,
  OfferResponsePayload,
  InterOfferResponsePayload,
  RetentionOfferFiltersPayload,
  InterRetentionOfferFiltersPayload,
  RetentionOfferFiltersUpdateReply,
} from '../types/payload';

import { getServerDateTime } from '../helpers/date-utils';
import { getApiEndpoint } from '../helpers/string-utils';
import { CodeType, DiscountType, DurationType, OfferType } from '../types/enum';
import * as regenerate from 'regenerate';

const DPE_URL = getApiEndpoint('/api/dpe');
const DEZMUND_URL = getApiEndpoint('/api/dezmund');
const TARDIS_URL = getApiEndpoint('/api/tardis');
const FILTERS_URL = getApiEndpoint('/api/filters');

@Injectable({
  providedIn: 'root',
})
export class CancelFlowService {
  public currentDraggedContainerIdSubject$: BehaviorSubject<any> = new BehaviorSubject(
    null,
  );
  public currentDraggedContainerId$: Observable<
    string | null
  > = this.currentDraggedContainerIdSubject$.asObservable();
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  getDPEConfig(regionCode: string): Observable<any[]> {
    return this.http
      .get<any>(`${DPE_URL}/config?regionCode=${regionCode}`, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  postDPEConfig(body, env: string, regionCode: string): Observable<any[]> {
    return this.http
      .post<any>(
        `${DPE_URL}/config?env=${env}&regionCode=${regionCode}`,
        body,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  rollbackDPEConfigToProd(regionCode: string): Observable<any[]> {
    return this.http
      .get<any>(
        `${DPE_URL}/config/sync?regionCode=${regionCode}`,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getDezmundOriginalsContent(): Observable<any[]> {
    return this.http.get<any>(`${DEZMUND_URL}/content`, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getTardisRecord(
    env: string,
    store: string,
    product: string,
    module: string,
    region: string,
  ): Observable<any[]> {
    return this.http
      .get<any>(
        `${TARDIS_URL}/record?env=${env}&store=${store}&product=${product}&module=${module}&region=${region}`,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getDefaultStorefrontsConfigs(regionCode: string): Observable<any[]> {
    return this.http
      .get<any>(`${FILTERS_URL}?regionCode=${regionCode}`, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  postDefaultStorefrontsConfigs(
    payload: any,
    regionCode: string,
    env: string,
  ): Observable<any[]> {
    return this.http
      .put<any>(
        `${FILTERS_URL}?regionCode=${regionCode}&env=${env}`,
        payload,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  rollbackDefaultStorefrontsToProd(regionCode: string): Observable<any[]> {
    return this.http
      .get<any>(
        `${FILTERS_URL}/sync?regionCode=${regionCode}`,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }
}
