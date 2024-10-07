import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  AfterViewInit,
  AfterViewChecked,
  ElementRef,
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
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  CodeType,
  StatusEnum,
  OfferType,
  DiscountType,
  PlatformEnum,
  DITColorEnum,
} from '../../types/enum';
import { Store } from '../../types/payload';
import { StatusDetail } from '../../types/StatusDetail';
import { WebSocketService } from '../../service/web-socket.service';
import { getStatusColor } from '../../helpers/color-utils';
import * as pluralize from 'pluralize';
import { OfferRequestPayload } from '../../types/payload';
import { removeXid } from '../../helpers/string-utils';
import * as moment from 'moment-timezone';
import { DEFAULT_TIMEZONE } from '../../constants';
import { FormControl, Validators } from '@angular/forms';
import { AndroidManagementService } from '../../service/androidManagement.service';
import { SnackbarService } from '../../service/snackbar.service';
import { InfoModalComponent } from '../info-modal/info-modal.component';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class TableComponent
  extends BaseComponent
  implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  @Input() tableHeaders: string[];
  @Input() dataKeys: string[];
  @Input() parent: string;
  data: MatTableDataSource<any>;
  planCode: string;
  placeholder = '';
  buttonText = '';
  store: Store;
  regionCode: string;
  storeSubscription: Subscription;
  dialogActionSubscription: Subscription;
  dialogResponseSubscription: Subscription;
  statusEnum = StatusEnum;
  statusMap: Map<number, StatusDetail>;
  showAddButton = false;
  placeHolderText: string;
  fetchedPlans: any;
  fetchedOffers: any;
  showSynchronizeWindow = false;
  syncOfferCode = new FormControl('', Validators.required);
  syncOfferType = new FormControl(null, Validators.required);
  offerTypes = [
    {
      offerType: OfferType.ACQUISITION,
      typeName: 'Acquisition',
    },
    {
      offerType: OfferType.WINBACK,
      typeName: 'Winback',
    },
    {
      offerType: OfferType.RETENTION,
      typeName: 'Retention',
    },
    {
      offerType: OfferType.EXTENSION,
      typeName: 'Extension',
    },
  ];
  public offersFiltersHeaders: string[] = [
    'STATUS',
    'CREATED AT',
    'OFFER TYPE',
    'OFFER NAME',
    'OFFER CODE',
    'TOTAL UNIQUE CODES',
    'OFFER CODE TYPE',
    'PLAN',
    'PROMO PRICE',
    'PROMO DURATION',
    'REDEEM BY',
    'LINK',
  ];
  public plansFiltersHeaders: string[] = [
    'PLAN CODE',
    'PRICE',
    'TERM',
    'TRIAL OFFER',
  ];
  public offersFiltersKeys: string[] = [
    'statusId',
    'createdAtDate',
    'offerTypeTitle',
    'offerName',
    'offerCode',
    'totalUniqueCodes',
    'offerCodeType',
    'formattedPlans',
    'discountAmount',
    'promoDurationString',
    'endDate',
    'offerUrl',
  ];
  public plansFiltersKeys: string[] = [
    'planCode',
    'price',
    'term',
    'planTrial',
  ];
  public showFiltersBlock: boolean = false;
  public statusCheckboxesValues: string[] = [];
  public statusCheckedValues: string[] = [];
  public createdAtFilter = '';
  public offerTypeCheckboxesValues: string[] = [];
  public offerTypeCheckedValues: string[] = [];
  public offerNameFilter = '';
  public offerCodeFilter = '';
  public totalUniqueCodesFilter = '';
  public offerCodeTypeCheckboxesValues: string[] = [];
  public offerCodeTypeCheckedValues: string[] = [];
  public plansFilter = '';
  public discountAmountFilter = '';
  public promoDurationFilter = '';
  public redeemByFilter = '';
  public linkCheckboxesValues: string[] = [];
  public linkCheckedValues: string[] = [];
  public navHeight = null;
  public planCodeFilter = '';
  public priceFilter = '';
  public termFilter = '';
  public trialOfferFilter = '';

  private regionsLanguagesBinding: any[];
  private destroy$ = new Subject<void>();
  private windowVh;
  private headerHeight = 72;
  private tableMarginTop = 84;

  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild('listViewPaginator') paginator: MatPaginator;
  @ViewChild('contentTable', { read: ElementRef }) tableElement: ElementRef;

  constructor(
    public loaderService: LoaderService,
    public dialog: MatDialog,
    public router: Router,
    private webSocketService: WebSocketService,
    private offersService: OffersService,
    private plansService: PlansService,
    private route: ActivatedRoute,
    private configService: ConfigurationService,
    private logger: NGXLogger,
    private androidManagementService: AndroidManagementService,
    private snackbarService: SnackbarService,
  ) {
    super(dialog, loaderService, router);
    this.data = new MatTableDataSource();
    this.windowVh = Math.round(window.innerHeight);
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
    setTimeout(() => {
      this.storeSubscription = this.configService.store
        .pipe(takeUntil(this.destroy$))
        .subscribe((currentStore) => {
          if (
            currentStore.id !== PlatformEnum.ANDROID &&
            currentStore.id !== PlatformEnum.ROKU
          ) {
            this.setRegionsAvailableLanguages(currentStore);
          }
        });
    }, 500);

    if (this.parent === 'offers') {
      this.placeholder = 'SEARCH OFFERS';
      this.buttonText = 'ADD OFFER';
      this.placeHolderText = 'Ex. Search by Offer Name';
    } else if (this.parent === 'plans') {
      this.placeholder = 'SEARCH PLANS';
      this.buttonText = 'ADD PLAN';
      this.placeHolderText = 'Ex. Search by Plan Name';
    }
    this.statusMap = this.configService.getStatuses();
  }

  ngAfterViewInit() {}

  ngAfterViewChecked() {
    // const windowVh = window.innerHeight;
    // const tableFullHeight = this.tableElement.nativeElement.offsetHeight + this.headerHeight + this.tableMarginTop;
    // if (tableFullHeight < windowVh) {
    //   this.navHeight = windowVh - this.headerHeight;
    // } else {
    //   if (this.navHeight !== tableFullHeight) {
    //     this.navHeight = tableFullHeight;
    //   }
    // }
  }

  isParent(parentString: string) {
    if (parentString === 'offers') {
      return this.parent === parentString;
    } else if (parentString === 'plans') {
      return this.parent === parentString;
    }
  }

  isOfferAlreadyInDb(): boolean {
    return this.fetchedOffers.some(
      (offer) => offer.offerCode === this.syncOfferCode.value,
    );
  }

  synchronizeOffer(): void {
    const offerData = {
      offerCode: this.syncOfferCode.value,
      offerType: this.syncOfferType.value,
      storeCode: this.configService.store.value.storeCode,
      offerBusinessOwner: localStorage.getItem('email'),
      updatedBy: localStorage.getItem('username'),
    };

    this.showSynchronizeWindow = false;
    this.loaderService.show();
    this.offersService.synchronizeOffer(offerData).subscribe(
      (res) => this.openResponseDialog(res),
      (res) => this.openErrorDialog(res, { reload: false }),
    );
  }

  isSyncButtonDisabled(): boolean {
    return (
      this.syncOfferType.invalid ||
      this.syncOfferCode.invalid ||
      this.isOfferAlreadyInDb()
    );
  }

  async setRegionsAvailableLanguages(store) {
    try {
      this.loaderService.show(
        this.parent === 'plans'
          ? 'Retrieving plans...'
          : 'Retrieving offers...',
      );
      this.configService
        .fetchConfig()
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (res: any) => {
            const regions: any[] = Object.values(res.data).map(
              (region: any) => {
                const languagesCodes: any[] = Object.keys(region.languages);
                const languages: any[] = Object.values(region.languages).map(
                  (language: any, index) => {
                    return { code: languagesCodes[index], name: language.name };
                  },
                );
                return {
                  code: region.displayName,
                  name: region.description,
                  languages,
                  currencyPrefix: region.currency.prefix,
                  currencyRatio: region.currency.ratio,
                };
              },
            );
            this.regionsLanguagesBinding = regions;

            this.setRegionCode();
            this.fetchData(store);
          },
          (err) => this.openErrorDialog(err),
        );
    } catch (err) {
      this.logger.error(err);
      this.openErrorDialog(new Error(err));
    }
  }

  offerEventHandler(eventName: string, offer: any): void {
    if (eventName === 'offer-status-updated') {
      if (this.fetchedOffers && this.fetchedOffers.length > 0) {
        const foundOffer = this.fetchedOffers.filter((obj) => {
          return obj.offerCode === offer.offerCode;
        });
        if (foundOffer && foundOffer.length > 0) {
          foundOffer[0].statusId = offer.statusId;
          foundOffer[0].Status = offer.Status;
        }
      }
    } else if (eventName === 'offer-deleted') {
      // if (this.fetchedOffers && this.fetchedOffers.length > 0) {
      //   const foundOffers = this.fetchedOffers.filter((obj) => {
      //     return obj.offerCode !== offer.offerCode;
      //   });
      //   this.fetchedOffers = foundOffers;
      //   this.updateUI(this.fetchedOffers);
      // }
    }
    // else if (
    //   eventName === 'offer-draft-saved' ||
    //   eventName === 'offer-created'
    // ) {
    // TODO: re-enable feature in the future
    // const foundOffer = this.fetchedOffers.filter((obj) => {
    //   return obj.offerCode === offer.offerCode;
    // });
    // if (foundOffer.length === 0) {  //should be 0
    //   this.fetchedOffers.push(offer);
    //   this.updateUI(this.fetchedOffers);
    // }
    // }
  }

  updateUI(fetchedOffers: any): void {
    this.data = new MatTableDataSource(fetchedOffers);
    this.setUpSort();
    if (this.parent === 'offers') {
      this.setupOffersFilter();
    } else if (this.parent === 'plans') {
      this.setupPlansFilter();
    }
    this.data.paginator = this.paginator;
    this.reCheckFilters();
  }

  getObjectKey(obj: any): string {
    return Object.keys(obj)[0] as string;
  }

  getObjectValue(obj: any): string {
    return Object.values(obj)[0] as string;
  }

  setupOffersFilter(): void {
    // get the unique status from all the offers that will show
    // as an options in the status filter
    const records = this.fetchedOffers;

    // Getting status checkboxes array
    this.statusCheckboxesValues = JSON.parse(
      localStorage.getItem('statusMap') as string,
    ).map((st) => {
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
    // Getting offer code type checkboxes array
    let offerCodeTypeSet = new Set<string>();
    for (const record of records) {
      const offerType =
        record.offerCodeType === CodeType.BULK_UNIQUE_CODE ? 'Bulk' : 'Single';
      if (!offerCodeTypeSet.has(offerType)) {
        offerCodeTypeSet.add(offerType);
      }
    }
    this.offerCodeTypeCheckboxesValues = Array.from(offerCodeTypeSet).sort();
    // Getting links checkboxes array
    let linkSet = new Set<string>();
    for (const record of records) {
      const linkStatus = record.link ? 'Exists' : 'Not exists';
      if (!linkSet.has(linkStatus)) {
        linkSet.add(linkStatus);
      }
    }
    this.linkCheckboxesValues = Array.from(linkSet).sort();

    // setup mat table filter
    this.data.filterPredicate = (data: Element, filter: string) => {
      const includeStatusCheckedValues: boolean = this.statusCheckedValues
        .length
        ? this.statusCheckedValues.some(
            (value) => data['statusId'] === StatusEnum[value],
          )
        : true;
      const includeCreatedAtFilter: boolean =
        this.createdAtFilter !== ''
          ? !!this.includesSearch(['createdAtDate'], data, this.createdAtFilter)
          : true;
      const includeOfferTypeCheckboxesValues: boolean = this
        .offerTypeCheckedValues.length
        ? this.offerTypeCheckedValues.some(
            (value) => data['offerTypeId'] === OfferType[value],
          )
        : true;
      const includeOfferNameFilter: boolean =
        this.offerNameFilter !== ''
          ? !!this.includesSearch(['offerName'], data, this.offerNameFilter)
          : true;
      const includeOfferCodeFilter: boolean =
        this.offerCodeFilter !== ''
          ? !!this.includesSearch(['offerCode'], data, this.offerCodeFilter)
          : true;
      const includeTotalUniqueCodesFilter: boolean =
        this.totalUniqueCodesFilter !== ''
          ? !!this.includesSearch(
              ['totalUniqueCodes'],
              data,
              this.totalUniqueCodesFilter,
            )
          : true;
      const includeOfferCodeTypeCheckboxesValues: boolean = this
        .offerCodeTypeCheckedValues.length
        ? this.offerCodeTypeCheckedValues.some((value) => {
            switch (value) {
              case 'Single':
                return data['offerCodeType'] === CodeType.SINGLE_CODE;
              case 'Bulk':
                return data['offerCodeType'] === CodeType.BULK_UNIQUE_CODE;
            }
          })
        : true;
      const includePlansFilter: boolean =
        this.plansFilter !== ''
          ? !!this.includesSearch(['planCode'], data, this.plansFilter)
          : true;
      const includeDiscountAmountFilter: boolean =
        this.discountAmountFilter !== ''
          ? !!this.includesSearch(
              ['discountAmount'],
              data,
              this.discountAmountFilter,
            )
          : true;
      const includePromoDurationFilter: boolean =
        this.promoDurationFilter !== ''
          ? !!this.includesSearch(
              ['promoDurationString'],
              data,
              this.promoDurationFilter,
            )
          : true;
      const includeRedeemByFilter: boolean =
        this.redeemByFilter !== ''
          ? !!this.includesSearch(['endDate'], data, this.redeemByFilter)
          : true;
      const includeLinkFilter: boolean = this.linkCheckedValues.length
        ? this.linkCheckedValues.some((value) => {
            switch (value) {
              case 'Exists':
                return !!data['link'];
              case 'Not exists':
                return !data['link'];
            }
          })
        : true;

      return (
        includeStatusCheckedValues &&
        includeCreatedAtFilter &&
        includeOfferTypeCheckboxesValues &&
        includeOfferNameFilter &&
        includeOfferCodeFilter &&
        includeTotalUniqueCodesFilter &&
        includeOfferCodeTypeCheckboxesValues &&
        includePlansFilter &&
        includeDiscountAmountFilter &&
        includePromoDurationFilter &&
        includeRedeemByFilter &&
        includeLinkFilter
      );
    };
  }

  setupPlansFilter(): void {
    // setup mat table filter
    this.data.filterPredicate = (data: Element, filter: string) => {
      const includePlanCodeFilter: boolean =
        this.planCodeFilter !== ''
          ? !!this.includesSearch(['planCode'], data, this.planCodeFilter)
          : true;
      const includePriceFilter: boolean =
        this.priceFilter !== ''
          ? !!this.includesSearch(['price'], data, this.priceFilter)
          : true;
      const includeTermFilter: boolean =
        this.termFilter !== ''
          ? !!this.includesSearch(['term'], data, this.termFilter)
          : true;
      const includeTrialOfferFilter: boolean =
        this.trialOfferFilter !== ''
          ? !!this.includesSearch(['planTrial'], data, this.trialOfferFilter)
          : true;

      return (
        includePlanCodeFilter &&
        includePriceFilter &&
        includeTermFilter &&
        includeTrialOfferFilter
      );
    };
  }

  includesSearch(columns, data, filter) {
    for (const key of columns) {
      if (data[key]) {
        if (data[key].toString().toLowerCase().indexOf(filter) !== -1) {
          return true;
        }
      }
      if (key === "planCode" && data['eligibleCharges']) {
        if (data['eligibleCharges'].toString().toLowerCase().indexOf(filter) !== -1) {
          return true;
        }
      }
    }
  }

  onDataSelect(row): void {
    if (this.parent === 'offers') {
      this.openOfferDetailPage(row.offerCode);
    } else if (this.parent === 'plans') {
      this.openPlanDetailPage(row.planCode);
    }
  }

  openOfferDetailPage(offerCode: string): void {
    this.router.navigate(['/offers/detail', offerCode]);
  }

  openPlanDetailPage(planCode: string): void {
    this.router.navigate(['/plans/detail', planCode]);
  }

  async menuAction(type: string, row) {
    switch (type) {
      case 'HISTORY':
        await this.openOfferHistoryWindow(row.offerCode);
        break;
      case 'VIEW':
        await this.openOfferDetailPage(row.offerCode);
        break;
      case 'UPDATE':
        await this.router.navigate(['/offers/update', row.offerCode], {
          queryParams: { offersPage: true },
        });
        break;
      case 'DUPLICATE':
        await this.duplicateOffer(row);
        break;
      case 'RETIRE':
        await this.retireOffer(row);
        break;
    }
  }

  async openOfferHistoryWindow(offerCode: string) {
    try {
      const storeCode = this.configService.store.value.storeCode;
      this.dialog.open(InfoModalComponent, {
        width: '50vw',
        data: {
          offerHistory: {
            storeCode,
            offerCode,
          },
        },
      });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async duplicateOffer(row) {
    try {
      const action = {
        message: `Do you wish to proceed with DUPLICATE?`,
        action: 'prompt',
      };

      const dialogActionRef = super.openAction(action);
      if (dialogActionRef) {
        this.dialogActionSubscription = dialogActionRef
          .afterClosed()
          .subscribe(async (result) => {
            if (result) {
              await this.router.navigate(['/offers/create'], {
                queryParams: {
                  prefill: row.offerCode,
                  offerType: row.offerTypeId,
                },
              });
            }
          });
      }
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async retireOffer(row) {
    try {
      const action = {
        message: `Do you wish to proceed with ${
          this.isOfferStatusDraft(row) ? 'DELETE' : 'RETIRE'
        }?`,
        action: 'prompt',
      };

      const dialogActionRef = super.openAction(action);
      if (dialogActionRef) {
        this.dialogActionSubscription = dialogActionRef
          .afterClosed()
          .subscribe(async (result) => {
            if (result) {
              const storeCode = this.configService.store.value.storeCode;
              const updatedBy = localStorage.getItem('username');
              this.loaderService.show();
              const response = await this.offersService
                .archiveOffer(
                  row.offerCode,
                  storeCode,
                  updatedBy,
                  row.offerTypeId,
                )
                .toPromise();
              this.openResponseDialog(response);
            }
          });
      }
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  showEditBtn(row) {
    const statusId: number = row.Status.id;
    const endDate = row.endDateTime;

    return (
      (statusId === StatusEnum.DFT || !this.checkPastCurrentDate(endDate)) &&
      statusId !== StatusEnum.STG_VALDN_FAIL &&
      statusId !== StatusEnum.STG_VALDN_PEND &&
      statusId !== StatusEnum.PROD_VALDN_FAIL &&
      statusId !== StatusEnum.PROD_VALDN_PEND &&
      statusId !== StatusEnum.STG_RB_FAIL &&
      statusId !== StatusEnum.PROD_RB_FAIL &&
      statusId !== StatusEnum.APV_PEND &&
      statusId !== StatusEnum.STG_RETD &&
      statusId !== StatusEnum.STG_FAIL &&
      statusId !== StatusEnum.PROD_PEND &&
      statusId !== StatusEnum.PROD_RETD &&
      statusId !== StatusEnum.PROD_FAIL
    );
  }

  checkPastCurrentDate(date) {
    if (!date) {
      return false;
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < currentDate;
  }

  showRetireBtn(element) {
    return (
      element.Status.id !== StatusEnum.STG_RETD &&
      element.Status.id !== StatusEnum.PROD_RETD &&
      ((element.Status.id !== StatusEnum.STG_VALDN_FAIL &&
        element.Status.id !== StatusEnum.STG_VALDN_PEND &&
        element.Status.id !== StatusEnum.PROD_VALDN_FAIL &&
        element.Status.id !== StatusEnum.PROD_VALDN_PEND &&
        element.Status.id !== StatusEnum.STG_RETD &&
        element.Status.id !== StatusEnum.STG_FAIL &&
        element.Status.id !== StatusEnum.STG_RB_FAIL &&
        element.Status.id !== StatusEnum.PROD_RETD &&
        element.Status.id !== StatusEnum.PROD_FAIL &&
        element.Status.id !== StatusEnum.PROD_RB_FAIL) ||
        element.offerTypeId === OfferType.EXTENSION)
    );
  }

  isOfferStatusDraft(row): boolean {
    const statusId: number = row.Status.id;
    return statusId === StatusEnum.DFT;
  }

  getStatusColor(status): string {
    return getStatusColor(status);
  }

  getTableClasses(): string {
    let classes;
    if (this.parent === 'plans') {
      classes = `table-component-container table-component-container-plans-table`;
    } else if (this.parent === 'offers') {
      classes = `table-component-container table-component-container-offers-table`;
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
    this.data.filter = this.statusCheckedValues.length
      ? JSON.stringify(this.statusCheckedValues)
      : this.data.filter;
    if (this.parent === 'offers') {
      this.data.filter = this.offerTypeCheckedValues.length
        ? JSON.stringify(this.offerTypeCheckedValues)
        : this.data.filter;
      this.data.filter = this.offerCodeTypeCheckedValues.length
        ? JSON.stringify(this.offerCodeTypeCheckedValues)
        : this.data.filter;
      this.data.filter = this.linkCheckedValues.length
        ? JSON.stringify(this.linkCheckedValues)
        : this.data.filter;
      this.data.filter = !this.createdAtFilter
        ? this.data.filter
        : this.createdAtFilter;
      this.data.filter = !this.offerNameFilter
        ? this.data.filter
        : this.offerNameFilter;
      this.data.filter = !this.offerCodeFilter
        ? this.data.filter
        : this.offerCodeFilter;
      this.data.filter = !this.totalUniqueCodesFilter
        ? this.data.filter
        : this.totalUniqueCodesFilter;
      this.data.filter = !this.plansFilter
        ? this.data.filter
        : this.plansFilter;
      this.data.filter = !this.discountAmountFilter
        ? this.data.filter
        : this.discountAmountFilter;
      this.data.filter = !this.promoDurationFilter
        ? this.data.filter
        : this.promoDurationFilter;
      this.data.filter = !this.redeemByFilter
        ? this.data.filter
        : this.redeemByFilter;
    } else if (this.parent === 'plans') {
      this.data.filter = !this.planCodeFilter
        ? this.data.filter
        : this.planCodeFilter;
      this.data.filter = !this.priceFilter
        ? this.data.filter
        : this.priceFilter;
      this.data.filter = !this.termFilter ? this.data.filter : this.termFilter;
      this.data.filter = !this.trialOfferFilter
        ? this.data.filter
        : this.trialOfferFilter;
    }
  }

  pluralize(word, count, include = false) {
    return pluralize(word, count, include);
  }

  getDITSortingOrder(item) {
    let resultPriority = 0;
    if (this.isOfferStatusInvalidForDIT(item)) {
      resultPriority |= 0x10;
    }
    if (
      item.dataIntegrityStatus === true ||
      item.dataIntegrityStatus === false
    ) {
      resultPriority |= 0x8;
    }
    if (item.dataIntegrityErrorMessage || item.glValidationError) {
      resultPriority |= 0x1;
    } else if (item.glValidationWarning) {
      resultPriority |= 0x2;
    } else {
      resultPriority |= 0x4;
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
        case 'offerName':
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
            const filteredPlan = this.fetchedPlans.filter((plan) => {
              switch (item.OfferType.id) {
                case OfferType.ACQUISITION:
                case OfferType.WINBACK:
                  return plan.planCode === item.planCode;
                case OfferType.RETENTION:
                  return plan.planCode === item.eligiblePlans[0];
                case OfferType.EXTENSION:
                  return plan.planCode === item.eligibleCharges[0];
              }
            });
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
    return dateTimeString &&
      moment(dateTimeString).format('MM.DD.YYYY') !== 'Invalid date'
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
      this.loaderService.show(
        this.parent === 'plans'
          ? 'Retrieving plans...'
          : 'Retrieving offers...',
      );
      if (store !== null) {
        this.store = store;
        if (this.parent === 'offers') {
          await this.fetchOffers(store);
        }
        await this.fetchPlans(store);
      }
    } catch (err) {
      this.logger.error(err);
      this.openErrorDialog(new Error(err));
    } finally {
      this.loaderService.hide();
    }
  }

  async fetchOffers(store) {
    try {
      const planTermMap = await this.fetchPlanTermMap(store);
      const allOffers = await this.offersService
        .getOffers(store.storeCode, planTermMap)
        .toPromise();
      this.fetchedOffers = this.getSortedOffers(allOffers);

      this.updateUI(this.fetchedOffers);
    } catch (err) {
      this.logger.error(err);
      this.openErrorDialog(new Error(err));
    }
  }

  async fetchPlanTermMap(store) {
    try {
      const planTermMap = new Map();
      const data = await this.plansService.getAllPlans(store).toPromise();
      data.map((plan) => {
        if (!planTermMap.has(plan.planCode)) {
          const planTermSplit = plan['term'].split(' ');
          const planTermValue = planTermSplit[0];
          const planTermUnit = planTermSplit.pop().charAt(0).toLowerCase();
          planTermMap.set(plan.planCode, planTermValue + planTermUnit);
        }
      });
      return planTermMap;
    } catch (err) {
      this.logger.error(err);
      this.openErrorDialog(new Error(err));
    }
  }

  async fetchPlans(store) {
    try {
      this.fetchedPlans = await this.plansService
        .getAllPlans(store)
        .toPromise();
      this.fetchedPlans.sort(
        (a, b) =>
          a.billingCycleDuration - b.billingCycleDuration || a.price - b.price,
      );
      if (this.parent === 'plans') {
        this.showAddButton = true;
        this.updateUI(this.fetchedPlans);
      } else {
        this.fetchedPlans = this.fetchedPlans.filter((obj) => {
          return obj.statusId !== StatusEnum.DFT;
        });
        this.showAddButton = this.fetchedPlans.length > 0;
      }
    } catch (err) {
      this.logger.error(err);
      this.openErrorDialog(new Error(err));
    }
  }

  setRegionCode(): void {
    this.regionCode = this.configService.getRegion()['title'];
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
      message: `Do you wish to proceed with ${
        statusId >= StatusEnum.PROD_ERR_PUB ? 'retiring' : 'deleting'
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
      this.openErrorDialog(new Error(err));
    }
  }

  openResponseDialog(response) {
    const dialogResponseRef = super.openResponse(response);
    this.dialogResponseSubscription = dialogResponseRef
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.androidManagementService.refreshTablePageNavigation(this.router);
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
    if (this.fetchedOffers) {
      this.fetchedOffers.forEach((offer) => {
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
                offerDataIntegrityCheckTimeDate <
                  offerContentfulUpdatedAtDate ||
                offerDataIntegrityCheckTimeDate < offerCouponUpdatedAtDate))
          ) {
            this.startRecordDIT(offer);
          }
        }
      });
    }
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
        return `samocqa_acq_integrity_${offerCode}`;
      case OfferType.WINBACK:
        return `samocqa_win_integrity_${offerCode}`;
      case OfferType.RETENTION:
        return `samocqa_ret_integrity_${offerCode}`;
      case OfferType.EXTENSION:
        return `samocqa_ext_integrity_${offerCode}`;
    }
  }

  async startRecordDIT(elem, target?) {
    elem.validatingDIT = true;
    if (target) {
      target.style.setProperty('background-color', DITColorEnum.YELLOW);
    }
    const offer = this.buildOffer(elem);
    try {
      const validateResponse = await this.offersService
        .validateDIT(elem.offerCode, this.store.storeCode)
        .toPromise();

      const addResponse = await this.offersService.addDraft(offer).toPromise();
      const deleteResponse = await this.offersService
        .archiveOffer(
          offer.offerCode,
          this.store.storeCode,
          null,
          offer.offerTypeId,
        )
        .toPromise();
      if (
        addResponse['success'] &&
        deleteResponse['success'] &&
        validateResponse['success']
      ) {
        await this.offersService
          .updateRecordDITStatus(elem.offerCode, this.store.storeCode, {
            dataIntegrityStatus: true,
            dataIntegrityErrorMessage: null,
          })
          .toPromise();
        elem.glValidationWarning = validateResponse.data.warning;
        if (target)
          if (elem.glValidationError) {
            target.style.setProperty('background-color', DITColorEnum.RED);
          } else if (elem.glValidationWarning) {
            target.style.setProperty('background-color', DITColorEnum.BLUE);
          } else {
            target.style.setProperty('background-color', DITColorEnum.GREEN);
          }
        elem.validatingDIT = false;
        elem.dataIntegrityStatus = true;
        elem.dataIntegrityErrorMessage = null;
      }
    } catch (err) {
      let errorString = 'Validation failed: ';
      if (err.error.errors) {
        err.error.errors.forEach((field) => {
          errorString += `${Object.values(field)}; `;
        });
      } else if (err.error.message) {
        if (err.error.message.startsWith('Validation failed')) {
          errorString = removeXid(err.error.message);
        } else {
          errorString += removeXid(err.error.message);
        }
      }
      await this.offersService
        .updateRecordDITStatus(elem.offerCode, this.store.storeCode, {
          dataIntegrityStatus: false,
          dataIntegrityErrorMessage: errorString,
        })
        .toPromise();
      if (target) {
        target.style.setProperty('background-color', DITColorEnum.RED);
      }
      elem.validatingDIT = false;
      elem.dataIntegrityStatus = false;
      elem.dataIntegrityErrorMessage = errorString;
    }
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
      welcomeEmailText: elem.welcomeEmailText,
      claimOfferTerms: elem.claimOfferTerms,
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
        if (element.dataIntegrityErrorMessage.startsWith('Validation failed')) {
          return element.dataIntegrityErrorMessage;
        } else if (
          element.dataIntegrityErrorMessage.includes('Errors exist!')
        ) {
          return 'Validation failed: proceed to offer detail page for further information.';
        }
      } else if (element.glValidationError) {
        if (element.glValidationError.startsWith('Validation failed')) {
          return element.glValidationError;
        } else {
          return 'Validation failed: ' + element.glValidationError;
        }
      }
    } else {
      if (element.glValidationWarning) {
        return `Validation warning: ${element.glValidationWarning}`;
      } else {
        return 'Validation passed';
      }
    }
  }

  getDITButtonColor(element) {
    if (element.validatingDIT) {
      return DITColorEnum.YELLOW;
    }
    return (element.dataIntegrityStatus === null ||
      element.dataIntegrityStatus === undefined) &&
      !element.glValidationError &&
      !element.glValidationWarning
      ? DITColorEnum.GREY
      : element.glValidationError || element.dataIntegrityStatus === false
      ? DITColorEnum.RED
      : element.glValidationWarning
      ? DITColorEnum.BLUE
      : DITColorEnum.GREEN;
  }

  getOfferTypeTitle(id: number): string | undefined {
    switch (id) {
      case OfferType.ACQUISITION:
        return 'Acquisition';
      case OfferType.WINBACK:
        return 'Winback';
      case OfferType.RETENTION:
        return 'Retention';
      case OfferType.EXTENSION:
        return 'Extension';
    }
  }

  getFormattedPlans(element: any): string {
    if (
      element.formattedPlans === ' (undefined)' ||
      element.formattedPlans === null
    ) {
      if (this.fetchedPlans && this.fetchedPlans.length !== 0) {
        const plansArr: string[] = [];
        if (!!element.eligiblePlans) {
          element.eligiblePlans.forEach((eligiblePlan) => {
            const foundPlan = this.fetchedPlans.find((plan) => {
              return plan.planCode === eligiblePlan;
            });
            if (foundPlan) {
              plansArr.push(
                `${eligiblePlan} (${foundPlan.billingCycleDuration}m)`,
              );
            }
          });
        } else if (!!element.eligibleCharges) {
          element.eligibleCharges.forEach((eligibleCharge) => {
            const foundPlan = this.fetchedPlans.find((plan) => {
              return plan.planCode === eligibleCharge;
            });
            if (foundPlan) {
              plansArr.push(
                `${eligibleCharge} (${foundPlan.billingCycleDuration}m)`,
              );
            }
          });
        }
        return plansArr.join(', ');
      } else {
        return '';
      }
    } else {
      return element.formattedPlans;
    }
  }

  copyOfferCode(offerCode: string) {
    navigator.clipboard.writeText(offerCode);
    this.snackbarService.show(`Copied offer code: "${offerCode}"`, 'OK');
  }

  changeCheckedFilters(filterName: string, element?) {
    const checkedValuesSet = new Set<string>(this[filterName]);

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

  toggleFiltersBlock() {
    this.showFiltersBlock = !this.showFiltersBlock;
  }

  isExtensionOfferType(offer): boolean {
    return offer.offerTypeId === OfferType.EXTENSION;
  }

  ngOnDestroy() {
    this.storeSubscription.unsubscribe();
    if (this.dialogActionSubscription !== undefined) {
      this.dialogActionSubscription.unsubscribe();
    }
    if (this.dialogResponseSubscription !== undefined) {
      this.dialogResponseSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
