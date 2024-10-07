import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'offersFilter' })
export class OffersFilterPipe implements PipeTransform {
  /**
   * Transform
   *
   * @param {any[]} offers
   * @param {string} searchText
   * @returns {any[]}
   */

   transform(offers: any[], searchText: string): any[] {
    if (!offers.length) {
      return [];
    }

    if (!searchText) {
      return offers;
    }

    return offers.filter((offer: any) => {
      return offer.offerCode
        .toLowerCase()
        .includes(searchText.toLocaleLowerCase());
    });
  }
}