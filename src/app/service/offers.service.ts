import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { BehaviorSubject, Observable, throwError } from 'rxjs';

import * as pluralize from 'pluralize';

import {
  AllowedOffersForTerm,
  Dropdown,
  DropdownInt,
  FilterState,
  OfferRequestPayload,
  OfferResponsePayload,
  InterOfferResponsePayload,
  RetentionOfferFiltersPayload,
  InterRetentionOfferFiltersPayload,
  RetentionOfferFiltersUpdateReply,
} from '../types/payload';

import { getServerDateTime } from '../helpers/date-utils';
import { getApiEndpoint } from '../helpers/string-utils';
import { CodeType, DiscountType, DurationType, OfferType } from '../types/enum';
import * as regenerate from 'regenerate';

const OFFERS_URL = getApiEndpoint('/api/offers');

@Injectable({
  providedIn: 'root',
})
export class OffersService {
  public offerTypes: DropdownInt[] = [
    { value: OfferType.ACQUISITION, viewValue: 'Acquisition' },
    { value: OfferType.WINBACK, viewValue: 'Winback ' },
    { value: OfferType.RETENTION, viewValue: 'Retention' },
    { value: OfferType.EXTENSION, viewValue: 'Extension' },
  ];

  public offerCodeTypes: Dropdown[] = [
    { value: CodeType.SINGLE_CODE, viewValue: 'Single Code' },
    { value: CodeType.BULK_UNIQUE_CODE, viewValue: 'Bulk Unique Codes' },
  ];

  public offers: Dropdown[] = [
    { value: DiscountType.FIXED, viewValue: 'Fixed Amount' },
    { value: DiscountType.TRIAL, viewValue: 'Free Trial' },
  ];

  public freeTrialDurationTypes: Dropdown[] = [
    { value: '7-day', viewValue: '7 Days' },
    { value: '14-day', viewValue: '14 Days' },
    { value: DurationType.CUSTOMIZE, viewValue: 'Customize' },
  ];

  public freeTrialDurationUnits: Dropdown[] = [
    { value: 'day', viewValue: 'Days' },
  ];

  public priceDurationTypes: Dropdown[] = [
    { value: '1-month', viewValue: '1 Month' },
    { value: '3-month', viewValue: '3 Months' },
    { value: '6-month', viewValue: '6 Months' },
    { value: DurationType.CUSTOMIZE, viewValue: 'Customize' },
  ];

  public priceDurationUnits: Dropdown[] = [
    { value: 'month', viewValue: 'Months' },
  ];

  public currentOfferTypeSubject$ = new BehaviorSubject(null);
  public currentOfferType$ = this.currentOfferTypeSubject$.asObservable();

  public currentOfferCodeLimitSubject$: BehaviorSubject<number> = new BehaviorSubject(
    50,
  );
  public currentOfferCodeLimit$: Observable<number> = this.currentOfferCodeLimitSubject$.asObservable();

  public currentOfferCodeSubject$: BehaviorSubject<
    string | null
  > = new BehaviorSubject(null);
  public currentOfferCode$: Observable<
    string | null
  > = this.currentOfferCodeSubject$.asObservable();

  public currentDiscountAmountSubject$: BehaviorSubject<
    number | null
  > = new BehaviorSubject(null);
  public currentDiscountAmount$: Observable<
    number | null
  > = this.currentDiscountAmountSubject$.asObservable();

  public currentDiscountDurationSubject$: BehaviorSubject<
    string | null
  > = new BehaviorSubject(null);
  public currentDiscountDuration$: Observable<
    string | null
  > = this.currentDiscountDurationSubject$.asObservable();

  public currentDiscountTypeSubject$: BehaviorSubject<
    string | null
  > = new BehaviorSubject(null);
  public currentDiscountType$: Observable<
    string | null
  > = this.currentDiscountTypeSubject$.asObservable();

  public currentPlanDurationSubject$: BehaviorSubject<
    number | null
  > = new BehaviorSubject(null);
  public currentPlanDuration$: Observable<
    number | null
  > = this.currentPlanDurationSubject$.asObservable();

  private _statusId: number;
  set statusId(val: number) {
    this._statusId = val;
  }
  get statusId(): number {
    return this._statusId;
  }

  private _duplicateOfferCode: string;
  set duplicateOfferCode(val: string) {
    this._duplicateOfferCode = val;
  }
  get duplicateOfferCode(): string {
    return this._duplicateOfferCode;
  }

  private _duplicateCampaign: string;
  set duplicateCampaign(val: string) {
    this._duplicateCampaign = val;
  }
  get duplicateCampaign(): string {
    return this._duplicateCampaign;
  }

  private _allPlans: any[];
  set allPlans(val: any[]) {
    this._allPlans = val;
  }
  get allPlans(): any[] {
    return this._allPlans;
  }

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  public retentionOffersForTerms: Map<number, OfferResponsePayload[]> = new Map<
    number,
    OfferResponsePayload[]
  >(); // TODO: need to refactor
  public retentionOfferFiltersPayload: RetentionOfferFiltersPayload; // TODO: need to refactor
  public InterRetentionOfferFiltersPayload: InterRetentionOfferFiltersPayload; // TODO: need to refactor

  public allGlRetentionOffers: Map<string, OfferResponsePayload> = new Map();

  constructor(private http: HttpClient) {}

  keyPressOnlyNumbers(event: KeyboardEvent, decimal = false) {
    if (
      (+event.key >= 0 && +event.key <= 9) ||
      (decimal && (event.key == '.' || event.key == ','))
    ) {
      return true;
    }
    event.preventDefault();
    return false;
  }

  getOffers(storeCode, planTermMap?): Observable<OfferResponsePayload[]> {
    const url = OFFERS_URL + '?store=' + storeCode;
    return this.http.get<OfferResponsePayload[]>(url).pipe(
      map((data) => {
        if (planTermMap) {
          return this.processArray(data, planTermMap);
        } else {
          return this.processArray(data);
        }
      }),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getAllOffers(planTermMap?): Observable<OfferResponsePayload[]> {
    const url = OFFERS_URL;
    return this.http.get<OfferResponsePayload[]>(url).pipe(
      map((data) => {
        if (planTermMap) {
          return this.processArray(data, planTermMap);
        } else {
          return this.processArray(data);
        }
      }),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getOffer(
    offerCode,
    storeCode,
    offerTypeId,
  ): Observable<OfferResponsePayload> {
    const url = `${OFFERS_URL}/${offerCode}?store=${storeCode}&offerTypeId=${offerTypeId}`;
    return this.http.get<OfferResponsePayload>(url).pipe(
      map((data) => {
        return this.processItem(data['data']);
      }),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getInterOffer(campaign): Observable<InterOfferResponsePayload> {
    const url = OFFERS_URL + '/campaign/' + campaign;
    return this.http.get<OfferResponsePayload>(url).pipe(
      map((data) => {
        return this.processItem(data['data']);
      }),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getRetentionOffersForTerms(storeCode?): Observable<AllowedOffersForTerm[]> {
    const url = getApiEndpoint(
      '/api/offers/retention/terms' + (storeCode ? '?store=' + storeCode : ''),
    );
    return this.http.get(url).pipe(
      map((responce: any) => responce.data),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getExtensionOfferRules(storeCode?): Observable<AllowedOffersForTerm[]> {
    const url = getApiEndpoint(
      '/api/offers/extension/rules' + (storeCode ? '?store=' + storeCode : ''),
    );
    return this.http.get(url).pipe(
      map((response: any) => response.data),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  updateExtensionOfferRules(
    payload: any,
    storeCode,
    stateEnv: string,
    changedBy: string,
  ): Observable<any> {
    const url = getApiEndpoint(
      `/api/offers/extension/rules?store=${storeCode}&stateEnv=${stateEnv}&changedBy=${changedBy}`,
    );
    return this.http.put<any>(url, payload, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getRetentionOfferRules(storeCode?): Observable<RetentionOfferFiltersPayload> {
    const url = getApiEndpoint(
      '/api/offers/retention/rules' + (storeCode ? '?store=' + storeCode : ''),
    );
    return this.http.get(url).pipe(
      map((response: any) => response.data),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getInterRetentionOfferRules(
    storeCode?,
  ): Observable<InterRetentionOfferFiltersPayload> {
    const url = getApiEndpoint(
      '/api/offers/retention/rules' + (storeCode ? '?store=' + storeCode : ''),
    );
    return this.http.get(url).pipe(
      map((response: any) => response.data),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  updateRetentionOfferRules(
    payload: RetentionOfferFiltersPayload,
    storeCode,
    publish: string,
  ): Observable<RetentionOfferFiltersUpdateReply> {
    const url = getApiEndpoint(
      `/api/offers/retention/rules?store=${storeCode}&publish=${publish}`,
    );
    payload.filterState.updatedBy = localStorage.email
      ? localStorage.email
      : '';
    return this.http
      .put<RetentionOfferFiltersUpdateReply>(url, payload, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateInterRetentionOfferRules(
    payload: RetentionOfferFiltersPayload,
    publish: string,
  ): Observable<RetentionOfferFiltersUpdateReply> {
    // TODO: need to refactor
    const url = getApiEndpoint(
      `/api/offers/retention/rules?publish=${publish}`,
    );
    payload.filterState.updatedBy = localStorage.email
      ? localStorage.email
      : '';
    return this.http
      .put<RetentionOfferFiltersUpdateReply>(url, payload, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  retireRetentionOfferConditions(
    state: FilterState,
    storeCode: string,
  ): Observable<RetentionOfferFiltersUpdateReply> {
    const url = getApiEndpoint(
      `/api/offers/retention/filters/retire?store=${storeCode}&`,
    );
    state.updatedBy = localStorage.email ? localStorage.email : '';
    return this.http
      .put<RetentionOfferFiltersUpdateReply>(url, state, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  retireInterRetentionOfferConditions(
    state: FilterState,
  ): Observable<RetentionOfferFiltersUpdateReply> {
    const url = getApiEndpoint(`/api/offers/retention/filters/retire`);
    state.updatedBy = localStorage.email ? localStorage.email : '';
    return this.http
      .put<RetentionOfferFiltersUpdateReply>(url, state, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateRecordDITStatus(
    offerCode: string,
    storeCode,
    DITBody: object,
  ): Observable<any> {
    // TODO: need to refactor
    const url = getApiEndpoint(
      `/api/offers/dit/${offerCode}?store=${storeCode}`,
    );
    return this.http.put(url, DITBody, this.httpOptions).pipe(
      map((response: any) => response.data),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  validateDIT(offerCode: string, storeCode): Observable<any> {
    const url = getApiEndpoint(
      `/api/offers/dit/${offerCode}?store=${storeCode}`,
    );
    return this.http.get(url, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  addDraft(offer, skipValidation = false): Observable<OfferRequestPayload> {
    return this.http
      .post<OfferRequestPayload>(
        `${OFFERS_URL}/save?skipValidation=${skipValidation}`,
        offer,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  addInterDraft(offer): Observable<OfferRequestPayload> {
    return this.http
      .post<OfferRequestPayload>(
        OFFERS_URL + '/campaign/save',
        offer,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateOffer(
    offer,
    offerCode,
    storeCode,
    offerTypeId,
    skipValidation = false,
  ): Observable<OfferRequestPayload> {
    return this.http
      .put<OfferRequestPayload>(
        `${OFFERS_URL}/${offerCode}?store=${storeCode}&offerTypeId=${offerTypeId}&skipValidation=${skipValidation}`,
        offer,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  updateInterOffer(offer, campaignId): Observable<OfferRequestPayload> {
    const url = OFFERS_URL + '/campaign/' + campaignId;
    return this.http
      .put<OfferRequestPayload>(url, offer, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  createOffer(offer, skipValidation = false): Observable<OfferRequestPayload> {
    return this.http
      .post<OfferRequestPayload>(
        `${OFFERS_URL}/create?skipValidation=${skipValidation}`,
        offer,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  createInterOffer(offer): Observable<OfferRequestPayload> {
    return this.http
      .post<OfferRequestPayload>(
        OFFERS_URL + '/campaign/create',
        offer,
        this.httpOptions,
      )
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  validateOffer(
    offerCode,
    storeCode,
    updatedBy,
    retire = true,
  ): Observable<OfferResponsePayload> {
    let url = `${OFFERS_URL}/${offerCode}/validate?store=${storeCode}&updatedBy=${updatedBy}`;
    if (!retire) {
      url += '&retire=false';
    }
    return this.http.get<OfferResponsePayload>(url).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  validateInterOffer(campaignId, updatedBy): Observable<OfferResponsePayload> {
    const url = `${OFFERS_URL}/campaign/${campaignId}/validate?updatedBy=${updatedBy}`;
    return this.http.get<OfferResponsePayload>(url).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  publishOffer(
    offerCode,
    storeCode,
    updatedBy,
    offerTypeId: number,
  ): Observable<OfferResponsePayload> {
    const url = `${OFFERS_URL}/${offerCode}/publish?store=${storeCode}&updatedBy=${updatedBy}&offerTypeId=${offerTypeId}`;
    return this.http.get<OfferResponsePayload>(url).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  publishInterOffer(campaignId, updatedBy): Observable<OfferResponsePayload> {
    const url = `${OFFERS_URL}/campaign/${campaignId}/publish?updatedBy=${updatedBy}`;
    return this.http.get<OfferResponsePayload>(url).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  archiveOffer(
    offerCode,
    storeCode,
    updatedBy,
    offerTypeId: number,
  ): Observable<OfferResponsePayload> {
    const url = `${OFFERS_URL}/${offerCode}?store=${storeCode}&updatedBy=${updatedBy}&offerTypeId=${offerTypeId}`;
    return this.http.delete<OfferResponsePayload>(url, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  archiveInterOffer(campaignId, updatedBy): Observable<OfferResponsePayload> {
    const url = `${OFFERS_URL}/campaign/${campaignId}?updatedBy=${updatedBy}`;
    return this.http.delete<OfferResponsePayload>(url, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  generateCodes(offerCode, storeCode): Observable<any> {
    const url =
      OFFERS_URL + '/' + offerCode + '/uniqueCodes/generate?store=' + storeCode;
    return this.http.get(url, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  exportCsv(offerCode, storeCode): Observable<any> {
    const url =
      OFFERS_URL + '/' + offerCode + '/uniqueCodes/export?store=' + storeCode;
    return this.http.get(url, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  downloadCSV(offerCode, storeCode): Observable<Blob> {
    const url =
      OFFERS_URL + '/' + offerCode + '/uniqueCodes/download?store=' + storeCode;
    return this.http
      .get(url, {
        responseType: 'blob',
      })
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  determineDuration(discountDuration: string | undefined | null, value, unit) {
    if (discountDuration === DurationType.FOREVER) {
      return 'Forever';
    } else if (discountDuration === DurationType.SINGLE_USE) {
      return 'Single Use';
    }
    if (value && unit) {
      return pluralize(unit, value, true);
    } else {
      return ' ';
    }
  }

  processItem(item) {
    item.publishDate = item.publishDateTime
      ? getServerDateTime(item.publishDateTime, 'date')
      : null;
    item.publishTime = item.publishDateTime
      ? getServerDateTime(item.publishDateTime, 'time')
      : null;
    item.endDate = item.endDateTime
      ? getServerDateTime(item.endDateTime, 'date')
      : null;
    item.endTime = item.endDateTime
      ? getServerDateTime(item.endDateTime, 'time')
      : null;
    item.planCode = item.plan?.planCode || item.planCode || '';
    item.planTrial = this.determineDuration(
      item.discountDurationType,
      item.Plan?.trialDuration,
      item.Plan?.trialUnit,
    );
    item.planPrice = item.plan?.planPrice;
    if (item.offerTypeId !== OfferType.EXTENSION) {
      item.promoDurationString = this.determineDuration(
        item.discountDurationType,
        item.discountDurationValue,
        item.discountDurationUnit,
      );
    } else {
      item.promoDurationString = this.determineDuration(
        item.durationType,
        item.durationAmount,
        item.durationUnit,
      );
    }
    item.createdAtDate = item.couponCreatedAt
      ? getServerDateTime(item.couponCreatedAt, 'date')
      : null;
    item.link = item.offerUrl;
    item.discountAmount =
      item.discountAmount === 'NaN' ? null : item.discountAmount;
    item.offerTypeTitle = item.OfferType?.title ?? '';
    return item;
  }

  processArray(res, planTermMap?) {
    let response = res['data'];
    if (typeof response === 'undefined') {
      response = [];
    }
    return response.map((item) => {
      const processedItem = this.processItem(item);
      if (planTermMap) {
        processedItem.planTerm = planTermMap.get(processedItem.planCode);
      }
      this.postProcessItem(processedItem, planTermMap);
      return processedItem;
    });
  }

  postProcessItem(item, planTermMap?) {
    let result = '';
    if (item.offerTypeId === OfferType.RETENTION) {
      if (!item.eligiblePlans || item.eligiblePlans.length === 0) {
        result = 'All Plans';
      } else {
        result = item.eligiblePlans
          .map((code: string) => {
            if (planTermMap) {
              const term = planTermMap.get(code);
              return `${code} (${term})`;
            } else {
              return code;
            }
          })
          .join(', ');
      }
      item.formattedPlans = result;
    } else {
      item.formattedPlans = item.formatted = `${item.planCode} (${item.planTerm})`;
    }
  }

  getOfferCodeValidationResult(
    offerCode: string,
    storeCode: string,
    offerTypeId: number,
  ) {
    const VALIDATOR_ENDPOINT = getApiEndpoint('/api/validator/offer');
    const url = `${VALIDATOR_ENDPOINT}/${storeCode}`;
    return this.http.get(`${url}/${offerCode}?offerTypeId=${offerTypeId}`);
  }

  getValidTextFieldRegExp() {
    let result = regenerate()
      .add(
        '!',
        '"',
        '#',
        '$',
        '%',
        '&',
        "'",
        '(',
        ')',
        '*',
        '+',
        ',',
        '-',
        '.',
        '/',
        ':',
        ';',
        '<',
        '=',
        '>',
        '?',
        '@',
        '[',
        ']',
        '^',
        '_',
        '`',
        '§',
        '©',
        '‐',
        '‑',
        '–',
        '—',
        '‘',
        '’',
        '“',
        '”',
        '†',
        '‡',
        '…',
        '‰',
        '′',
        '″',
        '€',
        '−',
        '|',
        '{',
        '}',
        ' ',
        '\n',
        '£',
      ) // special symbols
      .addRange('0', '9') // numbers 0-9
      .addRange('A', 'Z') // English A-Z
      .addRange('a', 'z') // English a-z
      .add(
        'À',
        'Â',
        'Æ',
        'Ç',
        'È',
        'É',
        'Ê',
        'Ë',
        'Î',
        'Ï',
        'Ô',
        'Ù',
        'Û',
        'Ü',
        'à',
        'â',
        'æ',
        'ç',
        'è',
        'é',
        'ê',
        'ë',
        'î',
        'ï',
        'ô',
        'ù',
        'û',
        'ü',
        'ÿ',
        'Œ',
        'œ',
        'Ÿ',
        'ʳ',
        'ˢ',
        'ᵈ',
        'ᵉ',
      ) // French special characters
      .add('Ä', 'Ö', 'Ü', 'ß', 'ä', 'ö', 'ü') // German special characters
      .add('À', 'Ä', 'Å', 'É', 'Ö', 'à', 'ä', 'å', 'é', 'ö') // Swedish special characters
      .add(
        '¡',
        '¿',
        'Á',
        'É',
        'Í',
        'Ñ',
        'Ó',
        'Ú',
        'Ü',
        'á',
        'é',
        'í',
        'ñ',
        'ó',
        'ú',
        'ü',
      ) // Spanish special characters
      .add(
        'À',
        'Á',
        'Â',
        'Ã',
        'Ç',
        'É',
        'Ê',
        'Í',
        'Ò',
        'Ó',
        'Ô',
        'Õ',
        'Ú',
        'à',
        'á',
        'â',
        'ã',
        'ç',
        'é',
        'ê',
        'í',
        'ò',
        'ó',
        'ô',
        'õ',
        'ú',
      ) // Portuguese special characters
      .add('À', 'È', 'É', 'Ì', 'Ò', 'Ó', 'Ù', 'à', 'è', 'é', 'ì', 'ò', 'ó', 'ù') // Italian special characters
      .add(
        'Á',
        'Ä',
        'É',
        'Ë',
        'Í',
        'Ï',
        'Ó',
        'Ö',
        'Ú',
        'Ü',
        'á',
        'ä',
        'é',
        'ë',
        'í',
        'ï',
        'ó',
        'ö',
        'ú',
        'ü',
        'ĳ',
        'j́',
      ) // Dutch special characters
      .add('Ø', 'ø') // additional special symbols
      .toString();

    result = `^${result}*$`; // to match several words after space

    return new RegExp(result);
  }

  getRegionClaimOfferTermsPlaceholder(
    languageCode: string,
    offerCode?: string,
  ): string {
    if (offerCode) {
      switch (languageCode) {
        case 'en':
          return `By selecting "CLAIM MY DISCOUNT", you agree to authorize this charge and to the twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Terms of Service</a>, <a class="shout" target="_blank" href="privacy">Privacy Policy</a> and <a class="shout" target="_blank" href="offers/terms/${offerCode}">Offer Terms</a>.`;
        case 'pt':
          return `Ao selecionar "RESGATAR MEU DESCONTO", você concorda em autorizar essa cobrança e com os twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Termos de uso</a> e <a class="shout" target="_blank" href="privacy">política de privacidade</a> e os <a class="shout" target="_blank" href="offers/terms/${offerCode}">Termos de oferta</a>`;
        case 'es-419':
          return `Al seleccionar “ACEPTAR MI DESCUENTO”, acepta autorizar este cargo y los twlghtPLAY <a class="shout" target="_blank" href="termsofuse">términos de uso</a> y <a class="shout" target="_blank" href="privacy">política de privacidad</a> y los <a class="shout" target="_blank" href="offers/terms/${offerCode}">términos de la oferta</a>`;
        case 'nl':
          return `Door "CLAIM AANBIEDING" te selecteren, ga je akkoord met het autoriseren van deze kosten en met de twlghtPLAY <a href="termsofuse" target="_blank" class="shout">gebruiksvoorwaarden</a> en het <a href="privacy" target="_blank" class="shout">privacybeleid</a> en de <a class="shout" target="_blank" href="offers/terms/${offerCode}">voorwaarden van de aanbieding</a>`;
        case 'fr':
          return `En sélectionnant « DEMANDER MA RÉDUCTION », vous acceptez ces frais, les twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Conditions générales d’utilisation</a> et <a class="shout" target="_blank" href="privacy">Politique de confidentialité</a> et les <a class="shout" target="_blank" href="offers/terms/${offerCode}">Conditions de l’offre</a>`;
        case 'de':
          return `Indem Sie „MEINEN RABATT ERHALTEN“ wählen, stimmen Sie dieser Zahlung, den twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Nutzungsbedingungen</a>, der <a class="shout" target="_blank" href="privacy">Datenschutzrichtlinien</a> und <a class="shout" target="_blank" href="offers/terms/${offerCode}">Angebotsbedingungen</a> zu`;
        case 'it':
          return `Selezionando “USUFRUISCI DELLO SCONTO”, accetti di autorizzare il presente addebito, i <a class="shout" target="_blank" href="termsofuse">TERMINI D’USO</a> E l’<a class="shout" target="_blank" href="privacy">INFORMATIVA SULLA PRIVACY</a> e i <a class="shout" target="_blank" href="offers/terms/${offerCode}">Termini dell’offerta</a> di twlghtPLAY`;
        case 'es':
          return `Al seleccionar “SOLICITAR MI DESCUENTO”, aceptas autorizar este cargo y a los twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Términos de Uso</a> y <a class="shout" target="_blank" href="privacy">Política de Privacidad</a> y <a class="shout" target="_blank" href="offers/terms/${offerCode}">Términos de Oferta</a>`;
        default:
          return `By selecting "CLAIM MY DISCOUNT", you agree to authorize this charge and to the twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Terms of Service</a>, <a class="shout" target="_blank" href="privacy">Privacy Policy</a> and <a class="shout" target="_blank" href="offers/terms/${offerCode}">Offer Terms</a>.`;
      }
    } else {
      switch (languageCode) {
        case 'en':
          return `By selecting "CLAIM MY DISCOUNT", you agree to authorize this charge and to the twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Terms of Service</a>, <a class="shout" target="_blank" href="privacy">Privacy Policy</a> and <a class="shout" target="_blank" href="offers/terms/{{offerCode}}">Offer Terms</a>.`;
        case 'pt':
          return `Ao selecionar "RESGATAR MEU DESCONTO", você concorda em autorizar essa cobrança e com os twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Termos de uso</a> e <a class="shout" target="_blank" href="privacy">política de privacidade</a> e os <a class="shout" target="_blank" href="offers/terms/{{offerCode}}">Termos de oferta</a>`;
        case 'es-419':
          return `Al seleccionar “ACEPTAR MI DESCUENTO”, acepta autorizar este cargo y los twlghtPLAY <a class="shout" target="_blank" href="termsofuse">términos de uso</a> y <a class="shout" target="_blank" href="privacy">política de privacidad</a> y los <a class="shout" target="_blank" href="offers/terms/{{offerCode}}">términos de la oferta</a>`;
        case 'nl':
          return `Door "CLAIM AANBIEDING" te selecteren, ga je akkoord met het autoriseren van deze kosten en met de twlghtPLAY <a href="termsofuse" target="_blank" class="shout">gebruiksvoorwaarden</a> en het <a href="privacy" target="_blank" class="shout">privacybeleid</a> en de <a class="shout" target="_blank" href="offers/terms/{{offerCode}}">voorwaarden van de aanbieding</a>`;
        case 'fr':
          return `En sélectionnant « DEMANDER MA RÉDUCTION », vous acceptez ces frais, les twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Conditions générales d’utilisation</a> et <a class="shout" target="_blank" href="privacy">Politique de confidentialité</a> et les <a class="shout" target="_blank" href="offers/terms/{{offerCode}}">Conditions de l’offre</a>`;
        case 'de':
          return `Indem Sie „MEINEN RABATT ERHALTEN“ wählen, stimmen Sie dieser Zahlung, den twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Nutzungsbedingungen</a>, der <a class="shout" target="_blank" href="privacy">Datenschutzrichtlinien</a> und <a class="shout" target="_blank" href="offers/terms/{{offerCode}}">Angebotsbedingungen</a> zu`;
        case 'it':
          return `Selezionando “USUFRUISCI DELLO SCONTO”, accetti di autorizzare il presente addebito, i <a class="shout" target="_blank" href="termsofuse">TERMINI D’USO</a> E l’<a class="shout" target="_blank" href="privacy">INFORMATIVA SULLA PRIVACY</a> e i <a class="shout" target="_blank" href="offers/terms/{{offerCode}}">Termini dell’offerta</a> di twlghtPLAY`;
        case 'es':
          return `Al seleccionar “SOLICITAR MI DESCUENTO”, aceptas autorizar este cargo y a los twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Términos de Uso</a> y <a class="shout" target="_blank" href="privacy">Política de Privacidad</a> y <a class="shout" target="_blank" href="offers/terms/{{offerCode}}">Términos de Oferta</a>`;
        default:
          return `By selecting "CLAIM MY DISCOUNT", you agree to authorize this charge and to the twlghtPLAY <a class="shout" target="_blank" href="termsofuse">Terms of Service</a>, <a class="shout" target="_blank" href="privacy">Privacy Policy</a> and <a class="shout" target="_blank" href="offers/terms/{{offerCode}}">Offer Terms</a>.`;
      }
    }
  }

  synchronizeOffer(offerData): Observable<any> {
    const url = OFFERS_URL + '/synchronize-offer';
    return this.http
      .post<OfferRequestPayload>(url, offerData, this.httpOptions)
      .pipe(
        catchError((err) => {
          return throwError(err);
        }),
      );
  }

  getOfferHistory(storeCode, offerCode): Observable<any> {
    const url = `${OFFERS_URL}/history/${offerCode}?store=${storeCode}`;
    return this.http.get(url).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getAllStates(regionCode?: string): Observable<any> {
    const url = `${getApiEndpoint('/api/states')}${
      regionCode ? `?region=${regionCode}` : ''
    }`;
    return this.http.get(url).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  synchronizeRules(body): Observable<any> {
    const url = `${OFFERS_URL}/ghost-locker/rules`;
    return this.http.put(url, body).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getGLConfigVersionsData(
    env: string,
    firstVersion: string,
    secondVersion: string,
  ): Observable<any> {
    const url = `${OFFERS_URL}/ghost-locker/versions?env=${env}&firstVersion=${firstVersion}&secondVersion=${secondVersion}`;
    return this.http.get(url).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }
}
