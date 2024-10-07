import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class SocketidInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const socketId = sessionStorage.getItem('socketId');
    if (socketId) {
      const modifiedReq = req.clone({
        headers: req.headers.set('Socket-Id', socketId),
      });
      return next.handle(modifiedReq);
    } else {
      return next.handle(req.clone());
    }
  }
}
