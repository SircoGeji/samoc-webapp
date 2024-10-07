import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { getApiEndpoint } from '../helpers/string-utils';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ModuleValueStatus } from '../types/androidEnum';

const ANDROID_URL = getApiEndpoint('/api/android');

@Injectable({
  providedIn: 'root',
})
export class AndroidService {
  public devEnv: any = {
    envId: 1,
    code: 'dev',
    name: 'Client Dev',
  };
  public env = new BehaviorSubject<any>(this.devEnv);
  public allEnv = new BehaviorSubject<any>([]);
  public store = new BehaviorSubject<any>({
    storeId: 1,
    code: 'google',
    name: 'GOOGLE',
  });
  public product = new BehaviorSubject<any>({
    productId: 1,
    code: 'twlght',
    name: 'twlght',
  });
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {
    this.env.next(this.getEnv());
    this.store.next(this.getStore());
    this.product.next(this.getProduct());
  }

  getAllModules(moduleType): Observable<any> {
    switch (moduleType) {
      case 'app-copy':
        return this.getAllAppCopies();
      case 'sku':
        return this.getAllSkus();
      case 'selector-config':
        return this.getAllSelectorConfigs();
      case 'store-copy':
        return this.getAllStoreCopies();
      case 'image-collection':
        return this.getAllImageCollections();
      case 'campaign':
        return this.getAllCampaigns();
    }
  }

  getModule(moduleType, moduleID: number): Observable<any> {
    switch (moduleType) {
      case 'app-copy':
        return this.getAppCopy(moduleID);
      case 'selector-config':
        return this.getSelectorConfig(moduleID);
      case 'store-copy':
        return this.getStoreCopy(moduleID);
      case 'image-collection':
        return this.getImageCollection(moduleID);
      case 'campaign':
        return this.getCampaign(moduleID);
    }
  }

  /* ---------------------------------------------------------------------------------------------------------------------------------------- */
  /* ----------------------------------------------------- NEW ANDROID SERVICES PART -------------------------------------------------------- */
  /* ---------------------------------------------------------------------------------------------------------------------------------------- */

  // ============================================== Regions ============================================== //

  getRegionsLanguages(store: string, product: string) {
    return this.http
      .get<any>(
        ANDROID_URL + '/country?store=' + store + '&product=' + product,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getAllRegions() {
    return this.http.get<any>(ANDROID_URL + '/country', this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  saveRegion(store: string, product: string, data) {
    return this.http
      .post<any>(
        ANDROID_URL + '/country/save?store=' + store + '&product=' + product,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateRegion(countryId, data) {
    return this.http
      .put<any>(ANDROID_URL + '/country/' + countryId + '/update', data)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  deleteRegion(countryId) {
    return this.http
      .delete<any>(
        ANDROID_URL + '/country/' + countryId + '/delete',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  // ============================================== Languages ============================================== //

  getLanguages(store?: string, product?: string) {
    let filterPath = '';
    if (store && product) {
      filterPath = `?store=${store}&product=${product}`;
    }
    return this.http
      .get<any>(ANDROID_URL + '/language' + filterPath, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  saveLanguage(data) {
    return this.http.post<any>(ANDROID_URL + '/language/save', data).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  updateLanguage(languageId, data) {
    return this.http
      .put<any>(ANDROID_URL + '/language/' + languageId + '/update', data)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  deleteLanguage(languageId) {
    return this.http
      .delete<any>(
        ANDROID_URL + '/language/' + languageId + '/delete',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  // ============================================== Android Environments ============================================== //

  getAllEnv() {
    return this.http.get<any>(ANDROID_URL + '/env/', this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getEnv() {
    const androidEnv = JSON.parse(localStorage.getItem('androidEnv') as string);
    if (androidEnv && this.env.getValue().envId !== androidEnv.envId) {
      return androidEnv;
    } else {
      return this.env.getValue();
    }
  }

  setEnv(env) {
    this.env.next(env);
    localStorage.setItem('androidEnv', JSON.stringify(env));
  }

  // ============================================== Android Stores ============================================== //

  getAllStores() {
    return this.http.get<any>(ANDROID_URL + '/store', this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getStore() {
    const androidStore = JSON.parse(
      localStorage.getItem('androidStore') as string,
    );
    if (
      androidStore &&
      this.store.getValue().storeId !== androidStore.storeId
    ) {
      return androidStore;
    } else {
      return this.store.getValue();
    }
  }

  setStore(store) {
    this.store.next(store);
    localStorage.setItem('androidStore', JSON.stringify(store));
  }

  // ============================================== Android Products ============================================== //

  getAllProducts() {
    return this.http.get<any>(ANDROID_URL + '/product', this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getProduct() {
    const androidProduct = JSON.parse(
      localStorage.getItem('androidProduct') as string,
    );
    if (
      androidProduct &&
      this.product.getValue().productId !== androidProduct.productId
    ) {
      return androidProduct;
    } else {
      return this.product.getValue();
    }
  }

  setProduct(product) {
    this.product.next(product);
    localStorage.setItem('androidProduct', JSON.stringify(product));
  }

  // ============================================== AppCopy ============================================== //

  getAppCopyFields(store: string, platform: string, product: string) {
    return this.http
      .get<any>(
        ANDROID_URL +
          '/app-copy/fields?store=' +
          store +
          '&platform=' +
          platform +
          '&product=' +
          product,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getAllAppCopies() {
    return this.http.get<any>(ANDROID_URL + '/app-copy', this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getAppCopy(appCopyId: number) {
    return this.http
      .get<any>(ANDROID_URL + '/app-copy/' + appCopyId, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  saveAppCopy(store: string, product: string, env: string, data) {
    return this.http
      .post<any>(
        `${ANDROID_URL}/app-copy/save?store=${store}&product=${product}&env=${env}`,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateAppCopy(id: number, data) {
    return this.http
      .put<any>(
        ANDROID_URL + '/app-copy/' + id + '/update',
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateRegionInAppCopy(platform: string, country: string, id: number, data) {
    return this.http
      .put<any>(
        ANDROID_URL +
          '/app-copy/' +
          id +
          '/update?platform=' +
          platform +
          '&country=' +
          country,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  setAppCopyDefault(appCopyId: number) {
    return this.http
      .put<any>(
        ANDROID_URL + '/app-copy/' + appCopyId + '/update?isDefault=true',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  unsetAppCopyDefault(appCopyId: number) {
    return this.http
      .put<any>(
        ANDROID_URL + '/app-copy/' + appCopyId + '/update?isDefault=false',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  deleteAppCopy(appCopyId: number): Observable<any> {
    return this.http
      .delete<any>(ANDROID_URL + '/app-copy/' + appCopyId + '/delete')
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  publishAppCopy(payload): Observable<any> {
    return this.http
      .post<any>(`${ANDROID_URL}/app-copy/publish`, payload, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  activateAppCopy(
    appCopyId: number,
    env: string,
    tardisData: any,
  ): Observable<any> {
    return this.http
      .put<any>(
        ANDROID_URL + '/app-copy/' + appCopyId + '/activate?env=' + env,
        tardisData,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  duplicateAppCopy(appCopyId: number) {
    return this.http
      .post<any>(
        ANDROID_URL + '/app-copy/' + appCopyId + '/duplicate',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  promoteAppCopy(appCopyId: number, env: string) {
    return this.http
      .post<any>(
        `${ANDROID_URL}/app-copy/${appCopyId}/promote?env=${env}`,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  pullPromotionAppCopy(appCopyId: number, env: string, acceptChanges: boolean) {
    return this.http
      .post<any>(
        `${ANDROID_URL}/app-copy/${appCopyId}/pull?env=${env}&acceptChanges=${acceptChanges}`,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getAppCopyDuplicateData(appCopyId: number) {
    return this.http
      .get<any>(
        ANDROID_URL + '/app-copy/' + appCopyId + '/duplicate-data',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getAppCopyUsageData(appCopyId: number) {
    return this.http
      .get<any>(
        ANDROID_URL + '/app-copy/' + appCopyId + '/usage',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  // ============================================== Password for pusblish on PROD ============================================== //

  validatePassword(password: string) {
    return this.http
      .get<any>(
        ANDROID_URL + '/prod/' + password + '/validate',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  // ============================================== Sku ============================================== //

  getSkuFields(store: string) {
    return this.http
      .get<any>(ANDROID_URL + '/sku/fields?store=' + store, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getSkuImages(product: string) {
    return this.http
      .get<any>(
        ANDROID_URL + '/sku/preview?product=' + product,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getAllSkus() {
    return this.http.get<any>(ANDROID_URL + '/sku', this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getSku(id: number) {
    return this.http
      .get<any>(ANDROID_URL + '/sku/' + id, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  saveSku(store: string, product: string, env: string, data) {
    return this.http
      .post<any>(
        `${ANDROID_URL}/sku/save?store=${store}&product=${product}&env=${env}`,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateSku(id: number, data) {
    return this.http
      .put<any>(ANDROID_URL + '/sku/' + id + '/update', data, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateRegionInSku(id: number, data, regionCode: string) {
    return this.http
      .put<any>(
        ANDROID_URL + '/sku/' + id + '/update?country=' + regionCode,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  publishSku(payload): Observable<any> {
    return this.http
      .post<any>(`${ANDROID_URL}/sku/publish`, payload, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  archiveSku(id: number) {
    return this.http
      .put<any>(ANDROID_URL + '/sku/' + id + '/archive', this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  deleteSku(id: number): Observable<any> {
    return this.http.delete<any>(ANDROID_URL + '/sku/' + id + '/delete').pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getSkuUsageData(id: number) {
    return this.http
      .get<any>(ANDROID_URL + '/sku/' + id + '/usage', this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  promoteSku(skuId: number, env: string) {
    return this.http
      .post<any>(
        `${ANDROID_URL}/sku/${skuId}/promote?env=${env}`,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  pullPromotionSku(skuId: number, env: string, acceptChanges: boolean) {
    return this.http
      .post<any>(
        `${ANDROID_URL}/sku/${skuId}/pull?env=${env}&acceptChanges=${acceptChanges}`,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  // ============================================== SelectorConfig ============================================== //

  getAllSelectorConfigs() {
    return this.http
      .get<any>(ANDROID_URL + '/selector-config', this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getSelectorConfig(id: number) {
    return this.http
      .get<any>(ANDROID_URL + '/selector-config/' + id, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  saveSelectorConfig(store: string, product: string, data) {
    return this.http
      .post<any>(
        ANDROID_URL +
          '/selector-config/save?store=' +
          store +
          '&product=' +
          product,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateSelectorConfig(id: number, data) {
    return this.http
      .put<any>(
        ANDROID_URL + '/selector-config/' + id + '/update',
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateRegionInSelectorConfig(id: number, data, regionCode: string) {
    return this.http
      .put<any>(
        ANDROID_URL +
          '/selector-config/' +
          id +
          '/update?country=' +
          regionCode,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  setSelectorConfigDefault(id: number) {
    return this.http
      .put<any>(
        ANDROID_URL + '/selector-config/' + id + '/update?isDefault=true',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  unsetSelectorConfigDefault(id: number) {
    return this.http
      .put<any>(
        ANDROID_URL + '/selector-config/' + id + '/update?isDefault=false',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  deleteSelectorConfig(id: number): Observable<any> {
    return this.http
      .delete<any>(ANDROID_URL + '/selector-config/' + id + '/delete')
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  publishSelectorConfig(
    id: number,
    env: string,
    tardisData: any,
  ): Observable<any> {
    return this.http
      .post<any>(
        ANDROID_URL + '/selector-config/' + id + '/publish?env=' + env,
        tardisData,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getSelectorConfigUsageData(id: number) {
    return this.http
      .get<any>(
        ANDROID_URL + '/selector-config/' + id + '/usage',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  // ============================================== StoreCopy ============================================== //

  getStoreCopyFields(store: string) {
    return this.http
      .get<any>(
        ANDROID_URL + '/store-copy/fields?store=' + store,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getAllStoreCopies() {
    return this.http
      .get<any>(ANDROID_URL + '/store-copy', this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getStoreCopy(storeCopyId: number) {
    return this.http
      .get<any>(ANDROID_URL + '/store-copy/' + storeCopyId, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  saveStoreCopy(store: string, product: string, data) {
    return this.http
      .post<any>(
        ANDROID_URL + '/store-copy/save?store=' + store + '&product=' + product,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateStoreCopy(id: number, data) {
    return this.http
      .put<any>(
        ANDROID_URL + '/store-copy/' + id + '/update',
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateLanguageInStoreCopy(languageCode: string, id: number, data) {
    return this.http
      .put<any>(
        ANDROID_URL + '/store-copy/' + id + '/update?language=' + languageCode,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  setStoreCopyDefault(storeCopyId: number) {
    return this.http
      .put<any>(
        ANDROID_URL + '/store-copy/' + storeCopyId + '/update?isDefault=true',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  unsetStoreCopyDefault(storeCopyId: number) {
    return this.http
      .put<any>(
        ANDROID_URL + '/store-copy/' + storeCopyId + '/update?isDefault=false',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  deleteStoreCopy(storeCopyId: number): Observable<any> {
    return this.http
      .delete<any>(ANDROID_URL + '/store-copy/' + storeCopyId + '/delete')
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  publishStoreCopy(storeCopyId: number, env: string): Observable<any> {
    return this.http
      .post<any>(
        ANDROID_URL + '/store-copy/' + storeCopyId + '/publish?env=' + env,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getStoreCopyUsageData(id: number) {
    return this.http
      .get<any>(ANDROID_URL + '/store-copy/' + id + '/usage', this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  // ============================================== Image Preview ============================================== //

  getImagePreviewUrl(
    module: string,
    platformPath: string,
    fieldPreviewImageGroup: string,
    productPath?: string,
  ): string {
    const baseUrl = 'https://imgtwlght.imgix.net/Buyflow/android/samoc/preview';
    if (module && platformPath && fieldPreviewImageGroup) {
      if (productPath) {
        // for fields preview
        return `${baseUrl}/${module}/${productPath}_${platformPath}_${fieldPreviewImageGroup}.png`;
      } else {
        // for selector preview
        return `${baseUrl}/${module}/${platformPath}_${fieldPreviewImageGroup}.png`;
      }
    } else {
      // stock placeholder image
      return 'https://media.istockphoto.com/vectors/thumbnail-image-vector-graphic-vector-id1147544807?k=20&m=1147544807&s=612x612&w=0&h=pBhz1dkwsCMq37Udtp9sfxbjaMl27JUapoyYpQm0anc=';
    }
  }

  // ============================================== Image ============================================== //

  getAllImagePlacement() {
    return this.http
      .get<any>(ANDROID_URL + '/image/placement', this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getStoreImagePlacement(store: string) {
    return this.http
      .get<any>(
        ANDROID_URL + '/image/placement?store=' + store,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getAllImageGallery(store: string, product: string) {
    return this.http
      .get<any>(
        ANDROID_URL + '/image/gallery?store=' + store + '&product=' + product,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  saveImageGallery(store: string, product: string, data) {
    return this.http
      .post<any>(
        ANDROID_URL +
          '/image/gallery/save?store=' +
          store +
          '&product=' +
          product,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getImageGalleryUsageInImageCollections(imageId: number) {
    return this.http
      .get<any>(
        ANDROID_URL + '/image/gallery/' + imageId + '/collections',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  deleteImageGallery(id: number): Observable<any> {
    return this.http
      .delete<any>(ANDROID_URL + '/image/gallery/' + id + '/delete')
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getAllImageCollections() {
    return this.http
      .get<any>(ANDROID_URL + '/image/collection', this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getFilteredImageCollection(store: string, product: string) {
    return this.http
      .get<any>(
        ANDROID_URL +
          '/image/collection?store=' +
          store +
          '&product=' +
          product,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getImageCollection(id: number) {
    return this.http
      .get<any>(ANDROID_URL + '/image/collection/' + id, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  saveImageCollection(store: string, product: string, data) {
    return this.http
      .post<any>(
        ANDROID_URL +
          '/image/collection/save?store=' +
          store +
          '&product=' +
          product,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateImageCollection(id: number, data) {
    return this.http
      .put<any>(
        ANDROID_URL + '/image/collection/' + id + '/update',
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateRegionInImageCollection(id: number, country: string, data) {
    return this.http
      .put<any>(
        ANDROID_URL + '/image/collection/' + id + '/update?country=' + country,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  deleteImageCollection(id: number): Observable<any> {
    return this.http
      .delete<any>(ANDROID_URL + '/image/collection/' + id + '/delete')
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  publishImageCollection(
    id: number,
    env: string,
    envStr: string,
  ): Observable<any> {
    return this.http
      .post<any>(
        `${ANDROID_URL}/image/collection/${id}/publish?env=${env}&envStr=${envStr}`,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getImageCollectionUsageData(id: number) {
    return this.http
      .get<any>(
        ANDROID_URL + '/image/collection/' + id + '/usage',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  uploadImageToS3(
    directory: string,
    images: any[],
    imageNames: string[],
    store: string,
    product: string,
    dimensions: string,
    maxSize: number,
    maxSizeStr: string,
  ): Observable<any> {
    let fileData = new FormData();
    images.forEach((image) => {
      fileData.append(
        'uploadImage',
        image,
        image.name.replace(/\.[^/.]+$/, ''),
      );
    });
    return this.http
      .post<any>(
        `${ANDROID_URL}/${directory}/uploadImage?store=${store}&product=${product}&imageNames=${JSON.stringify(
          imageNames,
        )}&dimensions=${dimensions}&maxSize=${maxSize}&maxSizeStr=${maxSizeStr}`,
        fileData,
        { headers: new HttpHeaders({}) },
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  // ============================================== Campaign ============================================== //

  getAllCampaigns() {
    return this.http.get<any>(ANDROID_URL + '/campaign', this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getCampaign(id: number) {
    return this.http
      .get<any>(ANDROID_URL + '/campaign/' + id, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  saveCampaign(store: string, product: string, data) {
    return this.http
      .post<any>(
        ANDROID_URL + '/campaign/save?store=' + store + '&product=' + product,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateCampaign(id: number, data) {
    return this.http
      .put<any>(
        ANDROID_URL + '/campaign/' + id + '/update',
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateRegionInCampaign(platform: string, country: string, id: number, data) {
    return this.http
      .put<any>(
        ANDROID_URL +
          '/campaign/' +
          id +
          '/update?platform=' +
          platform +
          '&country=' +
          country,
        data,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  setCampaignDefault(id: number) {
    return this.http
      .put<any>(
        ANDROID_URL + '/campaign/' + id + '/update?isDefault=true',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  unsetCampaignDefault(id: number) {
    return this.http
      .put<any>(
        ANDROID_URL + '/campaign/' + id + '/update?isDefault=false',
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  deleteCampaign(id: number): Observable<any> {
    return this.http
      .delete<any>(ANDROID_URL + '/campaign/' + id + '/delete')
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  publishCampaign(
    id: number,
    env: string,
    envStr: string,
    tardisData: any,
  ): Observable<any> {
    return this.http
      .post<any>(
        `${ANDROID_URL}/campaign/${id}/publish?env=${env}&envStr=${envStr}`,
        tardisData,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  // ============================================== CampaignHistory ============================================== //

  getAllCampaignHistory() {
    return this.http
      .get<any>(ANDROID_URL + '/campaign-history', this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getCampaignHistory(id: number) {
    return this.http
      .get<any>(ANDROID_URL + '/campaign-history/' + id, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  // ============================================== Multi-Module ============================================== //

  getPublishWarning(moduleName: string, id: number, env: string) {
    return this.http
      .get<any>(
        ANDROID_URL + '/publish/' + moduleName + '/' + id + '?env=' + env,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }
}
