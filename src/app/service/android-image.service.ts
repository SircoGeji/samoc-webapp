import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AndroidImageService {
  image = new BehaviorSubject<any>({ imageId: null });

  constructor(private http: HttpClient) {}

  setImage(image) {
    this.image.next(image);
  }

  getImage() {
    return this.image.getValue();
  }
}
