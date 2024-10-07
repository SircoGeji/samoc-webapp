import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WebOffersUtils {
  constructor() {}
  getNewOfferCode(offerCode: string): string {
    let index = 1;
    if (offerCode.match('_v\\d+$')) {
      const indexSubstring = Number(offerCode.split('_v')[1]);
      if (
        !isNaN(indexSubstring) &&
        indexSubstring !== null &&
        indexSubstring !== undefined
      ) {
        index = indexSubstring;
      }
      offerCode = offerCode.split('_v')[0];
    }
    return offerCode + `_v${index + 1}`;
  }
}
