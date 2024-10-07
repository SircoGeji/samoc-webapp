import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'criteriaFilter' })
export class CriteriaFilterPipe implements PipeTransform {
  /**
   * Transform
   *
   * @param {any[]} criteria
   * @param {string} searchText
   * @returns {any[]}
   */

   transform(criterias: any[], searchText: string): any[] {
    if (!criterias.length) {
      return [];
    }

    return criterias.filter((criteria: any) => {
      const fitsSearchText: boolean = searchText
      ? criteria.name
          .toLowerCase()
          .includes(searchText.toLocaleLowerCase())
      : true;
      return fitsSearchText;
    });
  }
}
