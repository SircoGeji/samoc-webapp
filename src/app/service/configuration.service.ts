import { Injectable } from '@angular/core';
import { BehaviorSubject, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Brand, SamocSuccessResponse, Region, Store, StorePayload } from '../types/payload';
import { StatusDetail } from '../types/StatusDetail';
import { getApiEndpoint } from '../helpers/string-utils';

const STORES_URL = getApiEndpoint('/api/stores');
const HEALTH_URL = getApiEndpoint('/health');
const STATUS_URL = getApiEndpoint('/api/status');

const STATUS_MAP_KEY = 'statusMap';
const STATUS_MAP_TS_KEY = 'statusMapTimestamp';

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService {
  brand = new BehaviorSubject<Brand>({ id: 'twlght', title: 'twlght' });
  region: any;
  store: any;
  configData = new BehaviorSubject<StorePayload>(null);
  regions: Region[];

  constructor(private http: HttpClient) {
    this.setStoreAndRegionFromLocalStorage();
  }

  setStoreAndRegionFromLocalStorage() {
    const localStorageStoreStr = localStorage.getItem('store') as string;
    if (!localStorageStoreStr) {
      this.store = new BehaviorSubject<Store>({
        id: 'web',
        title: 'WEB',
        storeCode: 'twlght-web-us',
      });
    } else {
      this.store = new BehaviorSubject<Store>(JSON.parse(localStorageStoreStr));
    }
    const localStorageRegionStr = localStorage.getItem('region') as string;
    if (!localStorageRegionStr) {
      this.region = new BehaviorSubject<Region>({ id: 'us', title: 'US' });
    } else {
      this.region = new BehaviorSubject<Region>(JSON.parse(localStorageRegionStr));
    }
  }

  setBrand(brand) {
    this.brand.next(brand);
  }

  setRegion(region) {
    this.region.next(region);
    localStorage.setItem('region', JSON.stringify(region));

    const store: Store = ({
      id: 'web',
      title: 'WEB',
      storeCode: `twlght-web-${region.id}`,
    });
    this.store.next(store);
    localStorage.setItem('store', JSON.stringify(store));
  }

  setStore(store) {
    this.store.next(store);
    localStorage.setItem('store', JSON.stringify(store));
  }

  getBrand() {
    return this.brand.getValue();
  }

  getLocalStorageItem(itemName: string) {
    return JSON.parse(localStorage.getItem(itemName) as string);
  }

  getRegion() {
    const region = this.getLocalStorageItem('region');
    if (
      region &&
      this.region.getValue().id !== region.id
    ) {
      this.region.next(region);
    }
    return this.region.getValue();
  }

  getStore() {
    const store = this.getLocalStorageItem('store');
    if (
      store &&
      this.store.getValue().storeCode !== store.storeCode
    ) {
      this.store.next(store);
    }
    return this.store.getValue();
  }

  getConfigResponse() {
    return this.configData.getValue();
  }

  getRegions() {
    return this.regions;
  }

  fetchConfig() {
    return this.http.get<SamocSuccessResponse<StorePayload>>(STORES_URL).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  setConfigResponse(data) {
    this.configData.next(data);
    this.regions = this.buildRegions(data);
  }

  fetchHealthStatus() {
    return this.http.get<string[]>(HEALTH_URL).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  buildRegions(response) {
    const array = [];
    for (const region in response) {
      if (response[region]) {
        const obj: { id?: string; title?: string, storefronts?: String[] } = {};
        obj.id = region;
        obj.title = response[region].displayName;
        const stores: String[] = [];
        for (const storefront in response[region].brands.twlght.platforms){
          stores.push(storefront);
        }
        obj.storefronts = stores;
        array.push(obj);
      }
    }
    return array;
  }

  async fetchStatus() {
    const result: any = await this.http.get<string[]>(STATUS_URL).toPromise();
    const data = result['data'] as [StatusDetail];
    const statusMap: Map<number, StatusDetail> = new Map();
    data.forEach((status) => {
      statusMap.set(status.statusId, status);
    });
    localStorage.setItem(STATUS_MAP_KEY, JSON.stringify([...statusMap]));
    localStorage.setItem(STATUS_MAP_TS_KEY, new Date().getTime().toString());
  }

  checkLastUpdate() {
    const currentDateTime = new Date();
    const statusMapTimestamp = new Date(
      parseInt((localStorage.getItem(STATUS_MAP_TS_KEY) as string), 10),
    );
    return (
      (currentDateTime.getTime() - statusMapTimestamp.getTime()) /
        (1000 * 3600 * 24) >
      1
    );
  }

  getStatuses(): Map<number, StatusDetail> {
    return new Map(JSON.parse(localStorage.getItem(STATUS_MAP_KEY) as string));
  }
}
