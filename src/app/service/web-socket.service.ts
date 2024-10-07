import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { getApiEndpoint } from '../helpers/string-utils';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  socket: Socket;
  readonly SERVER_URL: string = getApiEndpoint('');

  constructor() {
    this.socket = io(this.SERVER_URL);

    this.socket.on('connect', () => {
      if (this.socket.id) {
        sessionStorage.setItem('socketId', this.socket.id);
      }
    });

    // The following was commented out to troubleshoot socket.io
    // this.socket.on('broadcast', function (data) {
    //   console.debug('broadcast', data);
    // });
  }

  listen(eventName: string) {
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data) => {
        subscriber.next(data);
      });
    });
  }

  emit(eventName: string, data: any) {
    this.socket.emit(eventName, data);
  }
}
