import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { getApiEndpoint } from '../helpers/string-utils';

const UPLOAD_URL = getApiEndpoint('/api/uploadImage');

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  httpOptions = {
    headers: new HttpHeaders({}),
  };

  constructor(private http: HttpClient) {}

  uploadImage(file) {
    const formData: FormData = new FormData();
    formData.append('uploadFile', file, file.name);
    return this.http.post(UPLOAD_URL, formData, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }
}
