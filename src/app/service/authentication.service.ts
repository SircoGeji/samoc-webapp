import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import {
  LoginResponsePayload,
  SamocSuccessResponse,
  UserRequestPayload,
} from '../types/payload';
import { getApiEndpoint } from '../helpers/string-utils';

const LOGIN_URL = getApiEndpoint('/users/login');
const LOGOUT_URL = getApiEndpoint('/users/logout');

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  login(
    username: string,
    password: string,
  ): Observable<SamocSuccessResponse<LoginResponsePayload>> {
    const data = {
      username,
      password,
    };
    return this.http
      .post<SamocSuccessResponse<LoginResponsePayload>>(
        LOGIN_URL,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  parseJwt(token: string) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  }

  saveToLocalStorage(username, email, jwt) {
    localStorage.setItem('username', username);
    localStorage.setItem('email', email);
    localStorage.setItem('jwt', jwt);
  }

  checkUser(): string {
    const jwt = localStorage.getItem('jwt');
    if (jwt) {
      const parsed = this.parseJwt(jwt);
      if (parsed) {
        const now = new Date().getTime() / 1000;
        console.log(`JWT expires in ${parsed.exp - now} seconds`);
        if (parsed.exp > now + 10 * 60) {
          return parsed.email;
        }
      }
    }
    localStorage.clear();
    return '';
  }

  logout() {
    return this.http.get<UserRequestPayload>(LOGOUT_URL).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }
}
