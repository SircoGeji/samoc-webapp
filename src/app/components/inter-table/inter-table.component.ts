import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { OffersService } from '../../service/offers.service';
import { PlansService } from '../../service/plans.service';
import { ConfigurationService } from '../../service/configuration.service';
import { LoaderService } from '../../service/loader.service';
import { BaseComponent } from '../base/base.component';
import { Observable, Subject, Subscription } from 'rxjs';
import { delay, filter, takeUntil } from 'rxjs/operators';
import {
  CodeType,
  StatusEnum,
  OfferType,
  DiscountType,
  RegionEnum,
  PlatformEnum,
} from '../../types/enum';
import { StatusDetail } from '../../types/StatusDetail';
import { WebSocketService } from '../../service/web-socket.service';
import { getStatusColor } from '../../helpers/color-utils';
import * as pluralize from 'pluralize';
import { OfferRequestPayload } from '../../types/payload';
import { removeXid } from '../../helpers/string-utils';
import { Brand, NavLink, Region, Store } from '../../types/payload';
import * as moment from 'moment-timezone';
import { DEFAULT_TIMEZONE } from '../../constants';

@Component({
  selector: 'inter-app-table',
  templateUrl: './inter-table.component.html',
  styleUrls: ['./inter-table.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class InterTableComponent extends BaseComponent implements OnInit, OnDestroy {
  @Input() tableHeaders: string[];
  @Input() dataKeys: string[];
  @Input() parent: string;
  data: MatTableDataSource<any>;
  planCode: string;
  placeholder = '';
  buttonText = '';
  storeSubscription: Subscription;
  dialogActionSubscription: Subscription;
  dialogResponseSubscription: Subscription;
  statusEnum = StatusEnum;
  statusMap: Map<number, StatusDetail>;
  showAddButton = false;
  placeHolderText: string;
  fetchedPlans: any;
  fetchedCampaigns: any;
  offerTypeFilter = 'ALL';
  searchFilter = 'ALL';
  offerTypeFilterSelected = 'ALL';
  statusFilterSelected = ['ALL'];
  regionFilterSelected = ['ALL'];
  offerTypeDropdownValues = ['ALL'];
  statusDropdownValues = ['ALL'];
  regionDropdownValues = ['ALL'];
  offerTypeFilterValues = {};
  statusFilterValues = {};
  regionFilterValues = {};
  regionsLanguagesBinding: any[];
  public campaignsFiltersHeaders: string[] = [
    'CAMPAIGN NAME',
    'STATUS',
    'CREATED AT',
    'OFFER TYPE',
    'REGIONS',
    'OFFER CODE',
    'REDEEM BY',
  ];
  public offersFiltersKeys: string[] = [
    'campaignName',
    'statusId',
    'createdAtDate',
    'offerTypeTitle',
    'regions',
    'offerCode',
    'endDate',
  ];
  public showFiltersBlock: boolean = false;
  public campaignNameFilter = '';
  public statusCheckboxesValues: string[] = [];
  public statusCheckedValues: string[] = [];
  public createdAtFilter = '';
  public offerTypeCheckboxesValues: string[] = [];
  public offerTypeCheckedValues: string[] = [];
  public regionsCheckboxesValues: string[] = [];
  public regionsCheckedValues: string[] = [];
  public offerCodeFilter = '';
  public redeemByFilter = '';
  public navHeight = null;

  private destroy$ = new Subject<void>();

  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild('listViewPaginator') paginator: MatPaginator;

  constructor(
    private webSocketService: WebSocketService,
    private offersService: OffersService,
    private plansService: PlansService,
    public router: Router,
    private route: ActivatedRoute,
    private configService: ConfigurationService,
    public loaderService: LoaderService,
    public dialog: MatDialog,
    private logger: NGXLogger,
  ) {
    super(dialog, loaderService, router);
    this.data = new MatTableDataSource();
  }

  ngOnInit(): void {
    this.webSocketService
      .listen('offer-status-updated')
      .subscribe((offer: any) => {
        this.offerEventHandler('offer-status-updated', offer);
      });
    this.webSocketService.listen('offer-deleted').subscribe((offer: any) => {
      this.offerEventHandler('offer-deleted', offer);
    });
    this.webSocketService
      .listen('offer-draft-saved')
      .subscribe((offer: any) => {
        this.offerEventHandler('offer-draft-saved', offer);
      });
    this.webSocketService.listen('offer-created').subscribe((offer: any) => {
      this.offerEventHandler('offer-created', offer);
    });
    this.storeSubscription = this.configService.store.subscribe((value) => {
      if (value.id !== PlatformEnum.ANDROID && value.id !== PlatformEnum.ROKU) {
        this.fetchData(value);
      }
    });
    if (this.parent === 'inter-offers') {
      this.placeholder = 'SEARCH OFFER CODES';
      this.buttonText = 'ADD CAMPAIGN';
      this.placeHolderText = '';
    } else if (this.parent === 'plans') {
      this.placeholder = 'SEARCH PLANS';
      this.buttonText = 'ADD PLAN';
      this.placeHolderText = 'Ex. Search by Plan Name';
    }
    this.statusMap = this.configService.getStatuses();
  }

  async setRegionsAvailableLanguages() {
    this.configService
      .fetchConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const regions: any[] = Object.values(res.data).map((region: any) => {
          const languagesCodes: any[] = Object.keys(region.languages);
          const languages: any[] = Object.values(region.languages).map((language: any, index) => {
            return { code: languagesCodes[index], name: language.name };
          });
          return {
            code: region.displayName,
            name: region.description,
            languages: languages,
            currencyPrefix: region.currency.prefix,
            currencyRatio: region.currency.ratio,
          };
        });
        this.regionsLanguagesBinding = regions;
      }, (err) => this.openErrorDialog(err));
  }

  getRegionName(regionCode: string): string {
    const region = this.regionsLanguagesBinding.find((bindedRegion) => {
      return bindedRegion.code === regionCode;
    });
    return region.name;
  }

  offerEventHandler(eventName: string, offer: any): void {
    // console.debug(`offerEventHandler :: [${eventName}] received ::`, offer);
    if (eventName === 'offer-status-updated') {
      if (this.fetchedCampaigns && this.fetchedCampaigns.length > 0) {
        const foundOffer = this.fetchedCampaigns.filter((obj) => {
          return obj.offerCode === offer.offerCode;
        });
        if (foundOffer && foundOffer.length > 0) {
          foundOffer[0].statusId = offer.statusId;
          foundOffer[0].Status = offer.Status;
        }
      }
    } else if (eventName === 'offer-deleted') {
      // if (this.fetchedCampaigns && this.fetchedCampaigns.length > 0) {
      //   const foundOffers = this.fetchedCampaigns.filter((obj) => {
      //     return obj.offerCode !== offer.offerCode;
      //   });
      //   this.fetchedCampaigns = foundOffers;
      //   this.updateUI(this.fetchedCampaigns);
      // }
    }
    // else if (
    //   eventName === 'offer-draft-saved' ||
    //   eventName === 'offer-created'
    // ) {
    // TODO: re-enable feature in the future
    // const foundOffer = this.fetchedCampaigns.filter((obj) => {
    //   return obj.offerCode === offer.offerCode;
    // });
    // if (foundOffer.length === 0) {  //should be 0
    //   this.fetchedCampaigns.push(offer);
    //   this.updateUI(this.fetchedCampaigns);
    // }
    // }
  }

  updateUI(fetchedCampaigns: any): void {
    this.data = new MatTableDataSource(fetchedCampaigns);
    this.setUpSort();
    this.setupFilter();
    this.data.paginator = this.paginator;
  }

  setupFilter(): void {
    // get the unique status from all the offers that will show
    // as an options in the status filter
    const records = this.fetchedCampaigns;
    
    this.statusCheckboxesValues = JSON.parse(localStorage.getItem('statusMap') as string).map((st) => {
      const hash = Object.create(null);
      hash[st[1].title] = st[1].description.toUpperCase();
      return hash;
    });

    // Getting offer type checkboxes array
    let offerTypeSet = new Set<string>();
    for (const record of records) {
      const offerType = OfferType[record.OfferType.id].toString();
      if (!offerTypeSet.has(offerType)) {
        offerTypeSet.add(offerType);
      }
    }
    this.offerTypeCheckboxesValues = Array.from(offerTypeSet).sort();

    // get the unique regions from all the offers that will show
    this.regionsCheckboxesValues = this.regionsLanguagesBinding.map((reg) => {
      const result = Object.create(null);
      result[reg.code] = reg.name.toUpperCase();
      return result;
    });

    // setup mat table filter
    this.data.filterPredicate = (data: Element, filter: string) => {
      const includeCampaignNameFilter: boolean = 
        this.campaignNameFilter !== ''
          ? !!this.includesSearch(['campaignName'], data, this.campaignNameFilter) 
          : true;
      const includeStatusCheckedValues: boolean =
        this.statusCheckedValues.length
          ? this.statusCheckedValues.some((value) => data['statusId'] === StatusEnum[value])
          : true;
      const includeCreatedAtFilter: boolean =
        this.createdAtFilter !== ''
          ? !!this.includesSearch(['createdAtDate'], data, this.createdAtFilter)
          : true;
      const includeOfferTypeCheckboxesValues: boolean =
        this.offerTypeCheckedValues.length
          ? this.offerTypeCheckedValues.some((value) => data['offerTypeId'] === OfferType[value])
          : true;
      const includeRegionSearch: boolean = 
        this.regionsCheckedValues.length 
          ? this.regionsCheckedValues.every((region) => data['regions'].includes(RegionEnum[region])) 
          : true;
      const includeOfferCodeFilter: boolean =
        this.offerCodeFilter !== ''
          ? !!this.includesSearch(['offerCode'], data, this.offerCodeFilter)
          : true;
      const includeRedeemByFilter: boolean =
        this.redeemByFilter !== ''
          ? !!this.includesSearch(['endDate'], data, this.redeemByFilter)
          : true;
      return (
        includeCampaignNameFilter &&
        includeStatusCheckedValues &&
        includeCreatedAtFilter &&
        includeOfferTypeCheckboxesValues &&
        includeRegionSearch &&
        includeOfferCodeFilter &&
        includeRedeemByFilter
      );
    };
  }

  changeCheckedFilters(filterName: string, element) {
    const checkedValuesSet = new Set<string>(
      this[filterName],
    );

    if (checkedValuesSet.has(element)) {
      checkedValuesSet.delete(element);
    } else {
      checkedValuesSet.add(element);
    }

    this[filterName] = Array.from(checkedValuesSet);
    this.reCheckFilters();
  }

  isElementChecked(elem: any, checkedValuesArr: any[]): boolean {
    const checkedSet = new Set<string>(checkedValuesArr);
    return checkedSet.has(elem);
  }

  getObjectKey(obj: any): string {
    return Object.keys(obj)[0] as string;
  }

  getObjectValue(obj: any): string {
    return Object.values(obj)[0] as string;
  }

  includesSearch(columns, data, filter) {
    for (const key of columns) {
      if (data[key]) {
        if (data[key].toString().toLowerCase().indexOf(filter) !== -1) {
          return true;
        }
      }
    }
  }

  navigateOnCampaign(row): void {
    this.router.navigate(['/inter-offers/inter-detail', row.campaign]);
  }

  getStatusColor(status): string {
    return getStatusColor(status);
  }

  getTableClasses(): string {
    let classes;
    if (this.parent === 'plans') {
      classes = `inter-table-component-container inter-table-component-container-plans-table`;
    } else if (this.parent === 'inter-offers') {
      classes = `inter-table-component-container inter-table-component-container-offers-table`;
    }
    return classes;
  }

  shouldBlink(status: StatusEnum): string {
    return status === StatusEnum.STG_VALDN_PEND ||
      status === StatusEnum.PROD_VALDN_PEND
      ? 'pending-blink'
      : '';
  }

  applyFilter($event, filterName: string): void {
    const filterValue = $event.currentTarget.value;
    if (filterValue === '') {
      this[filterName] = '';
    } else {
      this[filterName] = filterValue.toLowerCase();
    }
    this.reCheckFilters();
  }

  clearFilterInput(filterName: string): void {
    this[filterName] = '';
    this.reCheckFilters();
  }

  reCheckFilters(): void {
    this.data.filter = this.statusCheckedValues.length ? JSON.stringify(this.statusCheckedValues) : this.data.filter;
    this.data.filter = this.offerTypeCheckedValues.length ? JSON.stringify(this.offerTypeCheckedValues) : this.data.filter;
    this.data.filter = this.regionsCheckedValues.length ? JSON.stringify(this.regionsCheckedValues) : this.data.filter;
    this.data.filter = !this.campaignNameFilter ? this.data.filter : this.campaignNameFilter;
    this.data.filter = !this.createdAtFilter ? this.data.filter : this.createdAtFilter;
    this.data.filter = !this.offerCodeFilter ? this.data.filter : this.offerCodeFilter;
    this.data.filter = !this.redeemByFilter ? this.data.filter : this.redeemByFilter;
  }

  pluralize(word, count, include = false) {
    return pluralize(word, count, include);
  }

  getDITSortingOrder(item) {
    let resultPriority = 0;
    if (
      (item.dataIntegrityStatus === null ||
        item.dataIntegrityStatus === undefined) &&
      !item.glValidationError
    ) {
      resultPriority = 1;
    }
    if (
      (item.dataIntegrityStatus === null ||
        item.dataIntegrityStatus === undefined) &&
      item.glValidationError
    ) {
      resultPriority = 2;
    }
    if (
      item.dataIntegrityStatus === false &&
      item.glValidationError &&
      !item.dataIntegrityErrorMessage
    ) {
      resultPriority = 3;
    }
    if (
      item.dataIntegrityStatus === false &&
      item.glValidationError &&
      item.dataIntegrityErrorMessage
    ) {
      resultPriority = 4;
    }
    if (
      item.dataIntegrityStatus === true &&
      item.glValidationError &&
      item.dataIntegrityErrorMessage
    ) {
      resultPriority = 5;
    }
    if (
      item.dataIntegrityStatus === true &&
      item.glValidationError &&
      !item.dataIntegrityErrorMessage
    ) {
      resultPriority = 6;
    }
    if (
      item.dataIntegrityStatus === false &&
      !item.glValidationError &&
      item.dataIntegrityErrorMessage
    ) {
      resultPriority = 7;
    }
    if (
      item.dataIntegrityStatus === false &&
      !item.glValidationError &&
      !item.dataIntegrityErrorMessage
    ) {
      resultPriority = 8;
    }
    if (
      item.dataIntegrityStatus === true &&
      !item.glValidationError &&
      item.dataIntegrityErrorMessage
    ) {
      resultPriority = 9;
    }
    if (
      item.dataIntegrityStatus === true &&
      !item.glValidationError &&
      !item.dataIntegrityErrorMessage
    ) {
      resultPriority = 10;
    }
    return resultPriority;
  }

  setUpSort() {
    this.data.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'DIT':
          return this.getDITSortingOrder(item);
        case 'statusId':
          return (
            item.Status.sortPriority +
            new Date(item.lastModifiedAt).getTime() / 10000000000000
          );
        case 'campaignName':
          return item.offerName.toLowerCase();
        case 'link':
          return item.link && item.offerCodeType === CodeType.SINGLE_CODE
            ? item.link.toLowerCase()
            : 'z';
        case 'promoDurationString':
        case 'planTrial':
        case 'term':
          return this.convertToDays(item[property]);
        case 'createdAtDate':
          return new Date(item.couponCreatedAt).getTime() || 0;
        case 'endDate':
          return new Date(item.endDateTime).getTime() || 0;
        case 'discountAmount':
        case 'price':
          if (item[property] === null || !item[property]) {
            return 0;
          }
          if (item.discountType === 'percent') {
            const filteredPlan = this.fetchedPlans.filter(
              (plan) => plan.planCode === item.planCode,
            );
            const resultPrice: number =
              (filteredPlan[0].price / 100) * item[property];
            return Number(resultPrice.toFixed(2));
          } else {
            return Number(item[property]);
          }
        default:
          return item[property];
      }
    };
    this.data.sort = this.sort;
  }

  getFormattedDate(dateTimeString: string) {
    return dateTimeString && moment(dateTimeString).format('MM.DD.YYYY') !== 'Invalid date'
      ? moment(dateTimeString).tz(DEFAULT_TIMEZONE).format('MM.DD.YYYY')
      : '';
  }

  convertToDays(durationString) {
    const durationValue = +durationString.split(' ')[0];
    if (durationString.includes('day')) {
      return durationValue;
    } else if (durationString.includes('week')) {
      return durationValue * 7;
    } else if (durationString.includes('month')) {
      return durationValue * 31;
    } else if (durationString.includes('year')) {
      return durationValue * 365;
    }
  }

  sortAccordingDate(data: any[]): any[] {
    const sortedData = [...data];

    sortedData.sort((a, b) => {
      const first = new Date(a.lastModifiedAt);
      const second = new Date(b.lastModifiedAt);
      if (first > second) {
        return -1;
      }
      if (first < second) {
        return 1;
      }
      return 0;
    });

    return sortedData;
  }

  getSortedOffers(offers: any[]): any[] {
    const offersWithError: any = [];
    const offersWithoutError: any = [];
    const recentOffers: any[] = [];
    const retiredOffers: any[] = [];
    const retiredStatusSet = new Set([
      StatusEnum.STG_RETD,
      StatusEnum.PROD_RETD,
    ]);
    const errorStatusSet = new Set([
      StatusEnum.STG_ERR_CRT,
      StatusEnum.STG_ERR_DEL,
      StatusEnum.STG_ERR_UPD,
      StatusEnum.STG_VALDN_FAIL,
      StatusEnum.STG_RB_FAIL,
      StatusEnum.STG_FAIL,
      StatusEnum.PROD_ERR_PUB,
      StatusEnum.PROD_ERR_UPD,
      StatusEnum.PROD_ERR_DEL,
      StatusEnum.PROD_VALDN_FAIL,
      StatusEnum.PROD_RB_FAIL,
      StatusEnum.PROD_FAIL,
    ]);

    const now = new Date().getTime();
    offers.forEach((offer) => {
      const modified = new Date(offer.lastModifiedAt);
      // getTime returns milliseconds
      const days = (now - modified.getTime()) / (1000 * 60 * 60 * 24);
      if (errorStatusSet.has(offer.Status.id)) {
        offersWithError.push(offer);
      } else if (retiredStatusSet.has(offer.Status.id)) {
        retiredOffers.push(offer);
      } else if (days < 3) {
        recentOffers.push(offer);
      } else {
        offersWithoutError.push(offer);
      }
    });

    return [
      ...this.sortAccordingDate(recentOffers),
      ...this.sortAccordingDate(offersWithoutError),
      ...this.sortAccordingDate(retiredOffers),
      ...this.sortAccordingDate(offersWithError),
    ];
  }

  async fetchData(store) {
    try {
      this.loaderService.show('Retrieving campaigns...');
      if (store !== null && this.parent === 'inter-offers') {
        await this.setRegionsAvailableLanguages();
        await this.fetchCampaigns();
      }
    } catch (err) {
      this.logger.error(err);
      this.openErrorDialog(
        new Error(
          'An error has occurred, please contact system administrator.',
        ),
      );
    } finally {
      this.loaderService.hide();
    }
  }

  async fetchCampaigns() {
    try {
      const planTermMap = await this.fetchPlanTermMap();
      const allOffers = await this.offersService
        .getAllOffers(planTermMap)
        .toPromise();
      this.fetchedCampaigns = this.getSortedOffers(allOffers);
      this.combineRegionalOffers();
      console.log('fetchedCampaigns: ', this.fetchedCampaigns);

      this.updateUI(this.fetchedCampaigns);
    } catch (err) {
      this.logger.error(err);
      this.openErrorDialog(err);
    }
  }

  combineRegionalOffers(): void {
    const combinedFetchedOffers: any[] = [];
    const tempFetchedOffersSet = new Set<string>();

    this.fetchedCampaigns.forEach((offer) => {
      if (offer.campaign) {
        tempFetchedOffersSet.add(offer.campaign);
      }
    });

    tempFetchedOffersSet.forEach((offerCampaign) => {
      const defaultOffers: any = this.fetchedCampaigns.filter((secondLayerOffer) => {
        return secondLayerOffer.campaign === offerCampaign;
      });

      let newCombinedOffer: object = {};
      if (defaultOffers.length !== 1) {
        const regions = new Set<string>();

        defaultOffers.forEach((defaultOffer) => {
          const region = defaultOffer.storeCode.slice(-2).toUpperCase();
          regions.add(region);
        });

        newCombinedOffer = { ...defaultOffers[0] };
        newCombinedOffer['regions'] = Array.from(regions).sort();
        combinedFetchedOffers.push(newCombinedOffer);
      } else {
        newCombinedOffer = { ...defaultOffers[0] };
        newCombinedOffer['regions'] = [newCombinedOffer['storeCode'].slice(-2).toUpperCase()];
        combinedFetchedOffers.push(newCombinedOffer);
      }
    });

    this.fetchedCampaigns = combinedFetchedOffers;
  }

  async fetchPlanTermMap() {
    try {
      const planTermMap = new Map();
      const data = await this.plansService.getAllPlans().toPromise();
      data.map((plan) => {
        if (!planTermMap.has(plan.planCode)) {
          const planTermSplit = plan['term'].split(' ');
          const planTermValue = planTermSplit[0];
          const planTermUnit = planTermSplit.pop().charAt(0).toLowerCase();
          planTermMap.set(plan.planCode, planTermValue + planTermUnit);
        }
      });
      this.showAddButton = data.filter((obj) => {
        return obj.statusId !== StatusEnum.DFT;
      }).length > 0;
      return planTermMap;
    } catch (err) {
      this.logger.error(err);
      this.openErrorDialog(err);
    }
  }

  formatDiscountAmount(elementVal, discountType: string) {
    const price = Number(elementVal);
    if (discountType === 'percent') {
      return `${price}%`;
    } else {
      return `$${price.toFixed(2)}`;
    }
  }

  addNew() {
    this.router.navigate(['create'], { relativeTo: this.route });
  }

  addOffer(planCode) {
    this.planCode = planCode;
    this.router.navigate(['/offers/create'], {
      queryParams: { planCode: this.planCode },
    });
  }

  confirmDelete(planCode, statusId) {
    this.planCode = planCode;
    this.openActionDialog({
      message: `Do you wish to proceed with ${statusId >= StatusEnum.PROD_ERR_PUB ? 'retiring' : 'deleting'
        } the plan?`,
      action: 'prompt',
    });
  }

  async deletePlan() {
    try {
      this.loaderService.show();
      const response = await this.plansService
        .archivePlan(this.planCode)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  openResponseDialog(response) {
    const dialogResponseRef = super.openResponse(response);
    this.dialogResponseSubscription = dialogResponseRef
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          window.location.reload();
        }
      });
  }

  openActionDialog(action) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogActionSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            this.deletePlan();
          }
        });
    }
  }

  getStatusTitle(status) {
    return (this.statusMap.get(status) as any).title;
  }

  getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
  }

  isErrorStatus(status) {
    return (
      (status >= StatusEnum.STG_ERR_CRT && status <= StatusEnum.STG_ERR_DEL) ||
      (status >= StatusEnum.PROD_ERR_PUB &&
        status <= StatusEnum.PROD_ERR_DEL) ||
      status === StatusEnum.STG_VALDN_FAIL ||
      status === StatusEnum.PROD_VALDN_FAIL
    );
  }

  getStatusTooltip(offer: any, remoteStatus?: string) {
    const errMessage = !!offer.errMessage ? offer.errMessage : '';
    return `${(this.statusMap.get(offer.statusId) as any).description}${
      !!errMessage ? `: ${errMessage}` : ''
    }`;
  }

  colorRollbackRows(status, remoteStatus?) {
    if (
      status === this.statusEnum.PROD_RB_FAIL ||
      status === this.statusEnum.STG_RB_FAIL
    ) {
      return 'glrollback';
    } else {
      return '';
    }
  }

  checkOffersDITValidation() {
    this.fetchedCampaigns.forEach((offer) => {
      if (!this.isOfferStatusInvalidForDIT(offer)) {
        const offerContentfulImageUpdatedAtDate =
          offer.contentfulImageUpdatedAt;
        const offerContentfulUpdatedAtDate = offer.contentfulUpdatedAt;
        const offerCouponUpdatedAtDate = offer.couponUpdatedAt;
        const offerDataIntegrityCheckTimeDate = offer.dataIntegrityCheckTime;
        const offerDataIntegrityStatus = offer.dataIntegrityStatus;
        if (
          (offerDataIntegrityCheckTimeDate &&
            offer.OfferType.id === OfferType.RETENTION &&
            offerContentfulUpdatedAtDate &&
            offerCouponUpdatedAtDate &&
            (offerDataIntegrityCheckTimeDate < offerContentfulUpdatedAtDate ||
              offerDataIntegrityCheckTimeDate < offerCouponUpdatedAtDate)) ||
          ((offer.OfferType.id === OfferType.ACQUISITION ||
            offer.OfferType.id === OfferType.WINBACK) &&
            offerContentfulImageUpdatedAtDate &&
            offerContentfulUpdatedAtDate &&
            offerCouponUpdatedAtDate &&
            (offerDataIntegrityCheckTimeDate <
              offerContentfulImageUpdatedAtDate ||
              offerDataIntegrityCheckTimeDate < offerContentfulUpdatedAtDate ||
              offerDataIntegrityCheckTimeDate < offerCouponUpdatedAtDate))
        ) {
          this.startRecordDIT(offer);
        }
      }
    });
  }

  isOfferStatusInvalidForDIT(offer) {
    return (
      offer.Status.id === StatusEnum.DFT ||
      offer.Status.id === StatusEnum.STG_ERR_CRT ||
      offer.Status.id === StatusEnum.STG_ERR_UPD ||
      offer.Status.id === StatusEnum.STG_ERR_DEL ||
      offer.Status.id === StatusEnum.STG_VALDN_FAIL ||
      offer.Status.id === StatusEnum.STG_RETD ||
      offer.Status.id === StatusEnum.STG_RB_FAIL ||
      offer.Status.id === StatusEnum.STG_FAIL ||
      offer.Status.id === StatusEnum.APV_REJ ||
      offer.Status.id === StatusEnum.PROD_ERR_PUB ||
      offer.Status.id === StatusEnum.PROD_ERR_UPD ||
      offer.Status.id === StatusEnum.PROD_ERR_DEL ||
      offer.Status.id === StatusEnum.PROD_VALDN_FAIL ||
      offer.Status.id === StatusEnum.PROD_RETD ||
      offer.Status.id === StatusEnum.PROD_RB_FAIL ||
      offer.Status.id === StatusEnum.PROD_FAIL
    );
  }

  generateRandomOfferCode(elem) {
    const offerCode = Math.random().toString(32).substring(2);
    switch (elem.OfferType.id) {
      case OfferType.ACQUISITION:
        return `samocqa_acquisition_integrity_${offerCode}`;

      case OfferType.WINBACK:
        return `samocqa_winback_integrity_${offerCode}`;

      case OfferType.RETENTION:
        return `samocqa_retention_integrity_${offerCode}`;
    }
  }

  async startRecordDIT(elem, target?) {
    // elem.validatingDIT = true;
    // if (target) {
    //   target.style.setProperty('background-color', '#ff0');
    // }
    // const offer = this.buildOffer(elem);
    // try {
    //   const validateResponse = await this.offersService
    //     .validateDIT(elem.offerCode)
    //     .toPromise();

    //   const addResponse = await this.offersService.addDraft(offer).toPromise();

    //   const deleteResponse = await this.offersService
    //     .archiveOffer(offer.offerCode, this.store)
    //     .toPromise();
    //   if (
    //     addResponse['success'] &&
    //     deleteResponse['success'] &&
    //     validateResponse['success']
    //   ) {
    //     await this.offersService
    //       .updateRecordDITStatus(elem.offerCode, {
    //         dataIntegrityStatus: true,
    //         dataIntegrityErrorMessage: null,
    //       })
    //       .toPromise();
    //     if (target && !elem.glValidationError) {
    //       target.style.setProperty('background-color', '#0f0');
    //     } else if (elem.glValidationError) {
    //       target.style.setProperty('background-color', '#f00');
    //     }
    //     elem.validatingDIT = false;
    //     elem.dataIntegrityStatus = true;
    //     elem.dataIntegrityErrorMessage = null;
    //   }
    // } catch (err) {
    //   let errorString = 'Validation failed: ';
    //   if (err.error.errors) {
    //     err.error.errors.forEach((field) => {
    //       errorString += `${Object.values(field)}; `;
    //     });
    //   } else if (err.error.message) {
    //     errorString += removeXid(err.error.message);
    //   }
    //   await this.offersService
    //     .updateRecordDITStatus(elem.offerCode, {
    //       dataIntegrityStatus: false,
    //       dataIntegrityErrorMessage: errorString,
    //     })
    //     .toPromise();
    //   if (target) {
    //     target.style.setProperty('background-color', '#f00');
    //   }
    //   elem.validatingDIT = false;
    //   elem.dataIntegrityStatus = false;
    //   elem.dataIntegrityErrorMessage = errorString;
    // }
  }

  buildOffer(elem) {
    let offer: any;

    switch (elem.OfferType.id) {
      case OfferType.ACQUISITION:
      case OfferType.WINBACK:
        offer = this.acquisitionWinbackOffer(elem);
        break;

      case OfferType.RETENTION:
        offer = this.retentionOffer(elem);
        break;
    }

    return offer;
  }

  acquisitionWinbackOffer(elem): OfferRequestPayload {
    const offer: OfferRequestPayload = {
      offerTypeId: elem.OfferType.id,
      offerCode: this.generateRandomOfferCode(elem),

      planCode: elem.planCode,
      offerCodeType: elem.offerCodeType,
      discountType: elem.discountType,
      offerName: elem.offerName,
      offerHeader: elem.offerHeader,
      offerBodyText: elem.offerBodyText,
      offerBoldedText: elem.offerBoldedText,
      offerAppliedBannerText: elem.offerAppliedBannerText,
      offerBgImageUrl: elem.offerBgImageUrl,
      discountDurationValue: elem.discountDurationValue,
      discountDurationUnit: elem.discountDurationUnit,

      legalDisclaimer: elem.legalDisclaimer,
      welcomeEmailText: elem.welcomeEmailText,
      offerBusinessOwner: localStorage.email ? localStorage.email : '',
      noEndDate: elem.noEndDate,
    };

    if (elem.offerCodeType === CodeType.BULK_UNIQUE_CODE) {
      offer.totalUniqueCodes = elem.totalUniqueCodes;
    }

    if (elem.discountType === DiscountType.FIXED) {
      offer.discountAmount = elem.discountAmount;
    }

    if (elem.endDate) {
      offer.endDateTime = elem.endDateTime;
    }

    return offer;
  }

  retentionOffer(elem): OfferRequestPayload {
    const offer: OfferRequestPayload = {
      storeCode: this.configService.store.value.storeCode,
      offerCodeType: CodeType.SINGLE_CODE,
      offerTypeId: OfferType.RETENTION,
      offerCode: this.generateRandomOfferCode(elem),

      eligiblePlans: elem.eligiblePlans,
      createUpgradeOffer: elem.createUpgradeOffer,
      upgradePlan: elem.upgradePlan,
      usersOnPlans: ['-'],
      addToPrimaryDefault: elem.addToPrimaryDefault,
      addToSecondaryDefault: elem.addToSecondaryDefault,

      discountType: elem.discountType,
      discountDurationType: elem.discountDurationType,
      discountAmount: elem.discountAmount,
      discountDurationValue: elem.discountDurationValue,
      discountDurationUnit: elem.discountDurationUnit,

      offerName: elem.offerName,
      offerHeader: elem.offerHeader,
      offerBodyText: elem.offerBodyText,
      offerBoldedText: elem.offerBoldedText,
      offerAppliedBannerText: elem.offerAppliedBannerText,

      legalDisclaimer: elem.legalDisclaimer,
      offerBusinessOwner: localStorage.email ? localStorage.email : '',
      noEndDate: elem.noEndDate,
    };

    if (elem.endDate) {
      offer.endDateTime = elem.endDateTime;
    }

    return offer;
  }

  getDITButtonTooltipText(element) {
    if (
      (element.dataIntegrityStatus === null ||
        element.dataIntegrityStatus === undefined) &&
      !element.glValidationError
    ) {
      return 'No saved validation result found';
    } else if (
      element.dataIntegrityStatus === false ||
      element.glValidationError
    ) {
      if (element.dataIntegrityErrorMessage) {
        if (
          element.dataIntegrityErrorMessage.startsWith('Validation failed: ')
        ) {
          return element.dataIntegrityErrorMessage;
        } else if (
          element.dataIntegrityErrorMessage.includes('Errors exist!')
        ) {
          return 'Validation failed: proceed to offer detail page for further information.';
        }
      } else if (element.glValidationError) {
        if (element.glValidationError.startsWith('Validation failed: ')) {
          return element.glValidationError;
        } else {
          return 'Validation failed: ' + element.glValidationError;
        }
      }
    } else {
      return 'Validation passed';
    }
  }

  getDITButtonColor(element) {
    if (element.validatingDIT) {
      return '#ff0';
    }
    return (element.dataIntegrityStatus === null ||
      element.dataIntegrityStatus === undefined) &&
      !element.glValidationError
      ? 'grey'
      : element.glValidationError || element.dataIntegrityStatus === false
        ? '#f00'
        : '#0f0';
  }

  addInterOffer(type: number) {
    this.router.navigate(['inter-create', type], { relativeTo: this.route });
  }

  getOfferTypeTitle(id: number): string | undefined {
    switch (id) {
      case OfferType.ACQUISITION:
        return 'Acquisition';
      case OfferType.WINBACK:
        return 'Winback';
      case OfferType.RETENTION:
        return 'Retention';
    }
  }

  toggleFiltersBlock() {
    this.showFiltersBlock = !this.showFiltersBlock;
  }

  ngOnDestroy() {
    this.storeSubscription.unsubscribe();
    if (this.dialogActionSubscription !== undefined) {
      this.dialogActionSubscription.unsubscribe();
    }
    if (this.dialogResponseSubscription !== undefined) {
      this.dialogResponseSubscription.unsubscribe();
    }
  }
}
