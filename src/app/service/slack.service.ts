import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { getApiEndpoint } from '../helpers/string-utils';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  UpdateSlackConfig,
  UpdateSlackConfigData,
  GetSlackConfigResponsePayload,
  UpdateSlackConfigResponse,
} from '../types/payload';

const SLACK_URL = getApiEndpoint('/api/slack');

@Injectable({
  providedIn: 'root',
})
export class SlackService {
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  getAllSlackConfig() {
    return this.http
      .get<GetSlackConfigResponsePayload>(
        SLACK_URL + '/config',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateSlackConfig(body: any): Observable<UpdateSlackConfigResponse> {
    return this.http
      .put<UpdateSlackConfigResponse>(
        SLACK_URL + '/config/update',
        body,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }
}
