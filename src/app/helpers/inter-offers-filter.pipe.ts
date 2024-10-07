import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'interOffersFilter' })
export class InterOffersFilterPipe implements PipeTransform {
  /**
   * Transform
   *
   * @param {any[]} offers
   * @param {string} searchText
   * @returns {any[]}
   */

  transform(offers: any[], searchText: string, selectedRegionsArr?: string[]): any[] {
    if (!offers.length) {
      return [];
    }

    if (!selectedRegionsArr.length) {
      return offers;
    }

    return offers.filter((offer: any) => {
      const fitsSearchText: boolean = searchText
      ? offer.offerCode
          .toLowerCase()
          .includes(searchText.toLocaleLowerCase())
      : true;
      const foundRegion = selectedRegionsArr
        ? selectedRegionsArr.find((region) => {
          return region['code'].toLowerCase() === offer.storeCode.slice(-2);
        })
        : null;
      const fitsSelectedRegions: boolean = selectedRegionsArr
        ? !!foundRegion
        : true;
      return fitsSearchText && fitsSelectedRegions;
    });
  }
}
