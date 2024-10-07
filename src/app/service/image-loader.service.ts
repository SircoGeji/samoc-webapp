import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ImageLoaderService {
  constructor() {}

  getDims(url: string): Observable<unknown> {
    return new Observable((ob: Observer<Dimensions>) => {
      const img = new Image();
      img.src = url;
      if (!img.complete) {
        img.onload = () => {
          ob.next({
            width: img.width,
            height: img.height,
          } as Dimensions);
          ob.complete();
        };
        img.onerror = (err) => {
          ob.error(err);
        };
      } else {
        ob.next({
          width: img.width,
          height: img.height,
        } as Dimensions);
        ob.complete();
      }
    });
  }
}

export interface Dimensions {
  width: number;
  height: number;
}
