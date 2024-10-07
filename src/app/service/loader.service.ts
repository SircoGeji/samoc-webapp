import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DEFAULT_SPINNER_TEXT } from '../constants';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  isLoading = new BehaviorSubject<any>({
    value: false,
    msg: DEFAULT_SPINNER_TEXT,
  });

  constructor() {}

  show(msg?: string) {
    const opt = {
      value: true,
      msg: msg ? msg : DEFAULT_SPINNER_TEXT,
    };
    this.isLoading.next(opt);
  }

  hide(msg?: string) {
    const opt = {
      value: false,
    };
    this.isLoading.next(opt);
  }
}
