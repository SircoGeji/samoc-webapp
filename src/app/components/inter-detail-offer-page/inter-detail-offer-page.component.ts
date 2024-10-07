import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ViewChild,
} from '@angular/core';

import { OffersService } from '../../service/offers.service';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../base/base.component';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { fromEvent, Observable, Subject, Subscription } from 'rxjs';
import {
  CodeType,
  StatusEnum,
  WorkflowAction,
  OfferType,
  DiscountType,
  DurationType,
} from '../../types/enum';
import {
  DEFAULT_TIMEZONE,
  PROCEED_MESSAGE,
  VALIDATE_BUTTON_TOOLTIP,
  VALIDATE_BUTTON_TOOLTIP_DISABLED,
  VALIDATE_BUTTON_TOOLTIP_DISABLED_TIMER,
} from '../../constants';
import { LoaderService } from '../../service/loader.service';
import { NGXLogger } from 'ngx-logger';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import {
  OpenDialogOptions,
  OpenErrorDialogOptions,
} from '../../types/OpenErrorDialogOptions';
import {
  OfferRequestPayload,
  InterFormRegion,
  InterFormLanguage,
} from '../../types/payload';
import * as pluralize from 'pluralize';
import { SnackbarService } from '../../service/snackbar.service';
import { WebSocketService } from '../../service/web-socket.service';
import * as moment from 'moment-timezone';
import { getTimeZoneDateTime } from '../../helpers/date-utils';
import { environment } from '../../../environments/environment';
import { formatStringWithTokens } from '../../helpers/string-utils';
import { ConfigurationService } from '../../service/configuration.service';
import { ShareInterOfferService } from '../../../app/service/inter-offer-share.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { PageEvent } from '@angular/material/paginator';
import { Dropdown } from '../../../app/types/payload';
import { PlansService } from '../../../app/service/plans.service';
import { delay, filter, takeUntil } from 'rxjs/operators';
import { StatusDetail } from '../../types/StatusDetail';
import { getStatusColor } from '../../helpers/color-utils';
import { WebOffersUtils } from '../../utils/web-offers.utils';

@Component({
  selector: 'app-inter-detail-offer-page',
  templateUrl: './inter-detail-offer-page.component.html',
  styleUrls: ['./inter-detail-offer-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class InterDetailOfferPageComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  @ViewChild('regionsTablePaginator') regionsPaginator: MatPaginator;

  public plans: any; // PlanResponsePayload[];
  detailPageTooltipText: string;
  offerType: number; // 1=Default Signup, 2=Acquisition
  offerTypeTitle: string;
  offerCode: string; // offerCode
  offerCodeType: string; // offerCodeType: [single, bulk]
  formattedOfferCodeType: string | undefined; // offerCodeType: [single, bulk]
  totalRedemptions: number;
  totalUniqueCodes: number; // totalUniqueCodes from Recurly
  origTotalUniqueCodes: number; // original TotalUniqueCodes entered
  plan: string; // planCode
  createUpgradeOffer: boolean;
  upgradePlan?: string;
  planCode: string;
  eligiblePlans: string;
  eligiblePlansArr: string[];
  usersOnPlans: string;
  usersOnPlansArr: string[];
  discountDurationType: string;
  formattedDiscountType: string;
  formattedDiscountAmount: string;
  formattedDiscountDuration: string;
  offerHeader: string; // contentful title
  campaign: string | null; // campaign unique code
  campaignName: string; // campaign name
  // offerName: string; // coupon name
  offerBodyText: string; // description
  // offerCTA: string; // cta
  offerBoldedText: string; // total line
  offerBoldedTextHint: string;
  offerAppliedBannerText: string; // bannerText
  offerBgImageUrl: string; // imageUrl
  legalDisclaimer: string; // legalDisclaimer
  welcomeEmailText: string; // welcomeEmailText
  offer: string; // discountType: [price, trial]
  formattedOffer: string | undefined; // discountType: [price, trial]
  offerPrice?: number; // discountPrice
  offerDurationValue?: number; // discountDurationValue
  offerDurationUnit?: string; // discountDurationUnit: [days, weeks, months]
  formattedOfferDurationUnit?: string; // discountDurationUnit: [days, weeks, months]
  offerBusinessOwner: string; // businessOwner
  offerVanityUrl: string; // vanityUrl
  publishDate: string; // format: mm/dd/yyyy
  publishTime: string; // format: hh:mm (AM/PM)
  endDateTime: string;
  endDate?: string; // format: mm/dd/yyyy
  endTime?: string; // format: hh:mm (AM/PM)
  noEndDate: boolean;
  status: number;
  StatusEnum = StatusEnum;
  routerSubscription: Subscription;
  dialogResponseSubscription: Subscription;
  resizeObservable$: Observable<Event>;
  resizeSubscription$: Subscription;
  retireButtonText: string;
  offerPayload?: OfferRequestPayload;
  entryState: string;
  couponState: string;
  currentStatus: string;
  couponCreatedAt: string | null;
  couponExpiredAt: string | null;
  showButtonsGroupCls = 'hideBtns';
  showRefreshBtn = false;
  tzName = DEFAULT_TIMEZONE;
  offerUrl: string;
  lastModifiedAt: string;
  readyToValidate: boolean;
  invalidStrings: string[];
  contentfulImageUpdatedAt: Date;
  contentfulUpdatedAt: Date;
  couponUpdatedAt: Date;
  dataIntegrityStatus: boolean;
  dataIntegrityCheckTime: Date;
  dataIntegrityErrorMessage: string;
  DITButtonColor: string;
  glValidationError: string;

  public regions: any[];
  public regionsData: MatTableDataSource<any>;
  public regionsTableHeaders: string[] = [];
  public regionsTableDataKeys: string[] = [];
  public regionFilter: string = '';
  public regionsLength: number;
  public pageEvent: PageEvent;
  public regionsTablePageSize: number = 20;
  public durationTypes: Dropdown[];
  public typesHolder: Dropdown[];
  public languages: any[];
  public fullOffer: object;
  public showDetailPage = false;
  public discountType: string;
  public regionsLanguagesBinding: any[];
  public dptrmLink: string;
  public targetLaunchDate: string | null;

  public creationErrorMessage: string = 'Creation Error.';
  public validationErrorMessage: string = 'Validation Error.';
  public validationErrorSuggestion: string =
    'Please manually validate or try to retire';
  public isRetention: boolean;
  public exportCsvButtonDisabled: boolean = false;

  private statusMap: Map<number, StatusDetail>;
  private destroy$ = new Subject<void>();

  constructor(
    public shareInterOfferService: ShareInterOfferService,

    private route: ActivatedRoute,
    private offersService: OffersService,
    public dialog: MatDialog,
    public router: Router,
    public loaderService: LoaderService,
    private logger: NGXLogger,
    private element: ElementRef,
    private changeDetectorRef: ChangeDetectorRef,
    private snackbarService: SnackbarService,
    private webSocketService: WebSocketService,
    private configurationService: ConfigurationService,
    private plansService: PlansService,
    private webOffersUtils: WebOffersUtils,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.showSnackBarListener();
    this.routerSubscription = this.route.paramMap.subscribe(
      (params: ParamMap) => {
        this.campaign = params.get('campaign');
        this.getAllplans();
      },
    );
    // this.resizeObservable$ = fromEvent(window, 'resize');
    // this.resizeSubscription$ = this.resizeObservable$.subscribe((evt) => {
    //   this.updateScrollableHeight();
    // });
  }

  showSnackBarListener() {
    this.webSocketService.listen('show-snackbar').subscribe((data: any) => {
      const regexPattern =
        '^.*inter-offers/inter-detail/' + data.campaign + '$';
      if (this.router.url.match(regexPattern)) {
        this.snackbarService.show(data.msg, data.action);
        if (data.event === 'enableDownloadBtn') {
          this.regions.forEach((region) => {
            if (region.offerCode === data.offerCode) {
              region.showExportCsvBtn = false;
              region.showDownloadCsvBtn = true;
            }
          });
          this.regionsData = new MatTableDataSource(this.regions);
        } else if (
          (data.event === 'generateCsvComplete' && data.reload) ||
          data.event === 'exportCsvFailed'
        ) {
          this.regionsData = new MatTableDataSource(this.regions);
          this.getOffer(data.offerCode, data.storeCode);
        } else if (data.event === 'exportCsvCompleted') {
          this.regionsData = new MatTableDataSource(this.regions);
          this.getOffer(data.offerCode, data.storeCode);
        } else {
          if (
            !this.loaderService.isLoading.value.value &&
            data.action !== 'OK'
          ) {
            this.getOffer(data.offerCode, data.storeCode);
          }
        }
      }
    });
  }

  getAllplans() {
    this.loaderService.show('Getting existing plans...');

    this.plansService
      .getAllPlans()
      .pipe(delay(500), takeUntil(this.destroy$))
      .subscribe(
        (allPlans) => {
          try {
            this.offersService.allPlans = allPlans;
            this.setRegionsAvailableLanguages();
          } catch (err) {
            this.openErrorDialog(err, {
              navigateTo: '/inter-offers',
              reload: false,
            } as OpenErrorDialogOptions);
          }
        },
        (err) =>
          this.openErrorDialog(err, {
            navigateTo: '/inter-offers',
            reload: false,
          }),
      );
  }

  async setRegionsAvailableLanguages() {
    this.loaderService.show('Getting available languages for regions...');

    this.configurationService
      .fetchConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res: any) => {
          try {
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
                  languages: languages,
                  currencyPrefix: region.currency.prefix,
                  currencyRatio: region.currency.ratio,
                };
              },
            );
            this.regionsLanguagesBinding = regions;

            this.statusMap = this.configurationService.getStatuses();

            this.setPlans();
            this.getCampaign();
          } catch (err) {
            this.openErrorDialog(err, {
              navigateTo: '/inter-offers',
              reload: false,
            } as OpenErrorDialogOptions);
          }
        },
        (err) =>
          this.openErrorDialog(err, {
            navigateTo: '/inter-offers',
            reload: false,
          }),
      );
  }

  setPlans() {
    this.plans = this.offersService.allPlans.filter((plan) => {
      this.formatPlanDetails(plan);
      return plan.statusId !== StatusEnum.DFT;
    });
  }

  getPlanRegion(planCode: string): string {
    const foundRegion = this.regionsLanguagesBinding.find((region) => {
      return region.code === planCode.substring(0, 2).toUpperCase();
    });
    return foundRegion ? foundRegion.code : null;
  }

  formatPlanDetails(plan) {
    const planRegion = this.getPlanRegion(plan.planCode);
    const currenctPrefix = planRegion
      ? this.getRegionProperty(planRegion, 'currencyPrefix')
      : '$';
    plan.billingCycleUnit = pluralize(
      plan.billingCycleUnit,
      plan.billingCycleDuration,
    );
    if (plan.trialDuration == null || plan.trialDuration === 0) {
      plan['planDetails'] = `${currenctPrefix}${plan.price}/${pluralize(
        plan.billingCycleUnit,
        plan.billingCycleDuration,
        plan.billingCycleDuration > 1,
      )}, no trial`;
    } else {
      plan.trialUnit = plan.trialUnit.endsWith('s')
        ? plan.trialUnit.slice(0, -1)
        : plan.trialUnit;
      plan['planDetails'] = `${currenctPrefix}${plan.price}/${pluralize(
        plan.billingCycleUnit,
        plan.billingCycleDuration,
        plan.billingCycleDuration > 1,
      )}, ${pluralize(plan.trialUnit, plan.trialDuration, true)} trial`;
    }
  }

  getFormattedPlan(selectedPlan: string): string {
    const plan = this.plans.filter((plan) => {
      return plan.planCode === selectedPlan;
    });
    return `${plan[0].planCode} - ${plan[0].planDetails}`;
  }

  getStatusColor(status): string {
    return getStatusColor(status);
  }

  async getOffer(offerCode: string, storeCode: string) {
    try {
      const data = await this.offersService
        .getOffer(offerCode, storeCode, this.offerType)
        .toPromise();
      if (data) {
        this.regions.forEach((region) => {
          if (
            region.offerCode === offerCode &&
            region.code === storeCode.slice(-2).toUpperCase()
          ) {
            region.isInWorkflow = data.isInWorkflow;
            region.csvFileName = data.csvFileName;
          }
        });
        this.regionsData = new MatTableDataSource(this.regions);
      }
    } catch (err) {
      this.openErrorDialog(err, {
        reload: false,
      } as OpenErrorDialogOptions);
    } finally {
      this.showHideCsvBtns();
      this.exportCsvButtonDisabled = false;
    }
  }

  async getCampaign(skipSpinner?: boolean) {
    if (!skipSpinner) {
      this.loaderService.show('Retrieving campaign details...');
    }
    try {
      const data: any = await this.offersService
        .getInterOffer(this.campaign)
        .toPromise();
      if (data.eligiblePlans === null) {
        this.eligiblePlans = 'All Plans';
      } else if (Array.isArray(data.eligiblePlans)) {
        this.eligiblePlansArr = [...data.eligiblePlans];
        this.eligiblePlans =
          data.eligiblePlans.length > 0
            ? data.eligiblePlans.join(', ')
            : 'All Plans';
      }
      this.offerPayload = data;
      if (!!this.offerPayload) {
        this.offerPayload.createdBy = localStorage.getItem('username');
        this.offerPayload.updatedBy = localStorage.getItem('username');
      }
      this.offerType = data.offerTypeId;
      switch (this.offerType) {
        case OfferType.ACQUISITION:
          this.offerTypeTitle = 'Acquisition';
          break;
        case OfferType.WINBACK:
          this.offerTypeTitle = 'Winback';
          break;
        case OfferType.RETENTION:
          this.offerTypeTitle = 'Retention';
          break;
      }
      this.isRetention = this.offerType === OfferType.RETENTION;
      this.usersOnPlansArr = data.usersOnPlans;
      this.usersOnPlans =
        data.usersOnPlans && data.usersOnPlans.length > 0
          ? data.usersOnPlans.join(', ')
          : 'All Plans';
      this.offerCodeType = data.offerCodeType;
      this.formattedOfferCodeType = this.formatOfferCodeType(
        data.offerCodeType,
      );
      this.totalRedemptions = data.totalRedemptions ? data.totalRedemptions : 0;
      this.totalUniqueCodes = data.totalUniqueCodes;
      this.origTotalUniqueCodes = data.origTotalUniqueCodes;
      this.plan = data.Plan?.planCode;
      this.createUpgradeOffer = data.createUpgradeOffer;
      this.upgradePlan = data.upgradePlan;

      this.offerUrl = data.offerUrl;
      this.offerHeader = data.offerHeader;
      this.campaignName = data.campaignName;
      this.offerBodyText = data.offerBodyText;
      this.offerBoldedText = data.offerBoldedText;
      this.offerBoldedText = data.offerBoldedText;
      this.offerBoldedTextHint = data.offerBoldedTextHint;
      this.offerAppliedBannerText = data.offerAppliedBannerText;
      this.offerBgImageUrl = data.offerBgImageUrl;
      this.legalDisclaimer = data.legalDisclaimer;
      this.welcomeEmailText = data.welcomeEmailText;
      this.offer = data.discountType;
      this.discountType = data.discountType;
      this.formattedOffer = this.formatOffer(data.discountType);
      this.offerPrice = data.discountAmount;
      this.offerDurationValue = data.discountDurationValue;
      this.formattedOfferDurationUnit = data.discountDurationUnit
        ? pluralize(
            data.discountDurationUnit[0].toUpperCase() +
              data.discountDurationUnit.slice(1),
            data.discountDurationValue,
          )
        : '';

      if (this.isRetention) {
        this.formattedDiscountType =
          data.discountType === 'percent' ? 'Percentage' : 'Fixed Amount';
        this.formattedDiscountAmount =
          data.discountType === 'percent'
            ? `${data.discountAmount}%`
            : `$${data.discountAmount}`;
        this.discountDurationType = data.discountDurationType;
        if (data.discountDurationType === DurationType.SINGLE_USE) {
          this.formattedDiscountDuration = 'Single Use';
        } else if (data.discountDurationType === DurationType.FOREVER) {
          this.formattedDiscountDuration = 'Forever';
        } else {
          this.formattedDiscountDuration = `${this.offerDurationValue} ${this.formattedOfferDurationUnit}`;
        }
      }

      this.offerDurationUnit = data.discountDurationUnit;
      this.offerBusinessOwner = data.offerBusinessOwner;
      this.offerVanityUrl = data.offerVanityUrl;
      this.endDateTime = data.endDateTime;
      this.publishDate = data.publishDate
        ? data.publishDate
        : 'No Publish Date';
      this.publishTime = data.publishDateTime
        ? data.publishTime
        : 'No Publish Time';
      this.endDate = data.endDateTime
        ? getTimeZoneDateTime(data.endDateTime, this.tzName, 'date')
        : 'No End Date';
      this.endTime = data.endDateTime
        ? getTimeZoneDateTime(data.endDateTime, this.tzName, 'time')
        : 'No End Time';

      this.noEndDate = data.noEndDate;
      this.status = data.statusId;
      this.retireButtonText = this.determineButtonText(this.status);
      this.entryState = data.entryState ? data.entryState : 'Not found';
      this.couponCreatedAt = data.couponCreatedAt
        ? format(new Date(data.couponCreatedAt), 'MM.dd.yyyy')
        : null;
      this.couponExpiredAt = data.couponExpiredAt
        ? format(new Date(data.couponExpiredAt), 'MM.dd.yyyy')
        : null;
      this.couponState =
        data.couponState === 'expired'
          ? 'Expired At ' + this.couponExpiredAt
          : data.couponState
          ? data.couponState
          : 'Not found';
      const status = JSON.parse(
        localStorage.getItem('statusMap') as string,
      ).filter((st) => {
        return st[1].statusId === data.statusId;
      });
      this.currentStatus = status[0]?.[1]?.title;
      this.changeDetectorRef.detectChanges();
      this.showButtonsGroupCls = 'showBtns';
      this.lastModifiedAt = data.lastModifiedAt;
      this.readyToValidate = this.isOfferReadyForValidation();
      this.contentfulImageUpdatedAt = data.contentfulImageUpdatedAt;
      this.contentfulUpdatedAt = data.contentfulUpdatedAt;
      this.couponUpdatedAt = data.couponUpdatedAt;
      this.dataIntegrityStatus = data.dataIntegrityStatus;
      this.dataIntegrityCheckTime = data.dataIntegrityCheckTime;
      this.dataIntegrityErrorMessage = data.dataIntegrityErrorMessage;
      this.glValidationError = data.glValidationError;
      this.dptrmLink = data.dptrmLink;
      this.targetLaunchDate = data.targetLaunchDate
        ? moment(data.targetLaunchDate).format('MM.DD.YYYY')
        : null;

      this.setRegionsTableColumns();

      this.regions = data.regions.map((region) => {
        const resultObj: InterFormRegion = {
          code: region.code,
          name: this.getRegionProperty(region.code, 'name'),
          duration:
            this.isRetention && region.durationType === DurationType.SINGLE_USE
              ? DurationType.SINGLE_USE
              : region.durationValue + '-' + region.durationUnit,
          durationValue: region.durationValue,
          durationUnit: region.durationUnit,
          offerCode: region.offerCode,
          offerName: region.offerName,
          offerCodeStatus: region.offerCodeStatus,
          statusId: region.statusId,
          offerUrl: region.offerUrl,
          currencyPrefix: this.getRegionProperty(region.code, 'currencyPrefix'),
          currencyRatio: this.getRegionProperty(region.code, 'currencyRatio'),
          totalUniqueCodes: region.totalUniqueCodes,
          origTotalUniqueCodes: region.origTotalUniqueCodes,
          showExportCsvBtn: false,
          showDownloadCsvBtn: false,
          exportingCsv: false,
          downloadingCsv: false,
          isInWorkflow: region.isInWorkflow,
          showRefreshBtn:
            region.totalUniqueCodes < region.origTotalUniqueCodes ||
            region.isInWorkflow === 'generateCsv',
          csvFileName: region.csvFileName,
          nextValidOfferCode: region.offerCode,
        };
        if (this.discountType !== DiscountType.TRIAL) {
          resultObj.price = region.price;
        }
        if (this.isRetention) {
          resultObj.createUpgradeOffer = region.createUpgradeOffer;
          resultObj.upgradePlan = region.upgradePlan;
          resultObj.usersOnPlans = region.usersOnPlans;
          resultObj.eligiblePlans = region.eligiblePlans;
          resultObj.eligiblePlanCodes = region.eligiblePlanCodes;
        } else {
          resultObj.planCode = region.planCode;
        }
        return resultObj;
      });
      this.languages = data.languages.map((language) => {
        const arr = language.code.split('-');
        const reg = arr[0];
        arr.shift();
        const lang = arr.join('-');
        const resultObj: InterFormLanguage = {
          code: language.code,
          name:
            this.getRegionProperty(reg, 'name') +
            ' - ' +
            this.getLanguageName(reg, lang),
          offerUrl: language.offerUrl,
          marketingHeadline: language.marketingHeadline,
          offerHeadline: language.offerHeadline,
          subhead: language.subhead,
          offerAppliedBanner: language.offerAppliedBanner,
          offerTerms: language.offerTerms,
          welcomeEmailText: language.welcomeEmailText,
        };
        if (this.isRetention) {
          resultObj.claimOfferTerms = language.claimOfferTerms;
        } else {
          resultObj.offerBgImageUrl = language.offerBgImageUrl;
        }
        return resultObj;
      });
      this.regionsData = new MatTableDataSource(this.regions);
      this.regionsLength = data.regions.length;
      this.regionsData.paginator = this.regionsPaginator;

      this.showHideCsvBtns();

      this.setDiscountDurationList(data.Plan);
    } catch (err) {
      this.openErrorDialog(err, {
        navigateTo: '/inter-offers',
        reload: false,
      } as OpenErrorDialogOptions);
    } finally {
      if (this.offerPayload) {
        this.setNextValidRegionsOfferCodes().then(() => {
          this.showDetailPage = true;
          this.loaderService.hide();
        });
        // this.showDetailPage = true;
        // this.loaderService.hide();
      }
    }
    // if (!this.isOfferStatusInvalidForDIT()) {
    //   await this.startRecordDIT();
    // }
  }

  setRegionsTableColumns(): void {
    const regionsTableHeadersArr: any[] = [];
    const regionsTableDataKeysArr: any[] = [];
    regionsTableHeadersArr.push('STATUS', 'REGION');
    regionsTableDataKeysArr.push('statusId', 'region');
    switch (this.discountType) {
      case DiscountType.FIXED:
        regionsTableHeadersArr.push('PRICE');
        regionsTableDataKeysArr.push('price');
        break;
      case DiscountType.TRIAL:
        break;
      case DiscountType.PERCENT:
        regionsTableHeadersArr.push('PERCENTAGE');
        regionsTableDataKeysArr.push('price');
        break;
    }
    regionsTableHeadersArr.push('DURATION', 'PLAN', 'OFFER CODE', 'OFFER NAME');
    regionsTableDataKeysArr.push('duration', 'plan', 'offerCode', 'offerName');
    if (this.offerCodeType === 'bulk') {
      regionsTableHeadersArr.push('TOTAL UNIQUE CODES');
      regionsTableDataKeysArr.push('bulkCodes');
      regionsTableHeadersArr.push('');
      regionsTableDataKeysArr.push('exportCsvButton');
    } else {
      if (this.offerType !== OfferType.RETENTION) {
        regionsTableHeadersArr.push('LINK');
        regionsTableDataKeysArr.push('offerUrl');
      }
    }
    this.regionsTableHeaders = regionsTableHeadersArr;
    this.regionsTableDataKeys = regionsTableDataKeysArr;
  }

  getStatusTitle(statusId: number) {
    return this.statusMap.get(statusId)?.title;
  }

  capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  getLanguageName(regionCode: string, languageCode: string): string {
    const foundRegion = this.regionsLanguagesBinding.find((region) => {
      return region.code === regionCode;
    });
    const foundLanguage = foundRegion['languages'].find((language) => {
      return language.code === languageCode;
    });
    return foundLanguage.name;
  }

  getRegionProperty(regionCode: string, property: string) {
    const selectedRegion = this.regionsLanguagesBinding.find((bindedRegion) => {
      return regionCode === bindedRegion.code;
    });
    return selectedRegion[property];
  }

  setDiscountDurationList(plan) {
    const result: Dropdown[] = [];
    if (plan && this.discountType === DiscountType.TRIAL) {
      this.durationTypes = this.offersService.freeTrialDurationTypes;
    }
    if (plan && plan['billingCycleUnit'].includes('month')) {
      const bcd = plan['billingCycleDuration'];
      if (bcd === 1) {
        result.push({ value: '1-month', viewValue: '1 Month' });
      }
      if (bcd === 1 || bcd === 3) {
        result.push({ value: '3-month', viewValue: '3 Months' });
      }
      if (bcd === 1 || bcd === 3 || bcd === 6) {
        result.push({ value: '6-month', viewValue: '6 Months' });
      }
      if (bcd === 6 || bcd === 12) {
        result.push({ value: '12-month', viewValue: '12 Months' });
      }
      result.push({ value: DurationType.CUSTOMIZE, viewValue: 'Customize' });

      this.typesHolder = result;

      if (this.discountType === DiscountType.FIXED) {
        this.durationTypes = result;
      }
    }
  }

  showCampaignLinks(): boolean {
    return this.status !== StatusEnum.DFT && !this.isRetention;
  }

  getDiscountDurationViewValue(currentDuration: string): string {
    if (currentDuration === DurationType.SINGLE_USE) {
      return 'Single Use';
    } else {
      const durationAmount = currentDuration.substring(
        0,
        currentDuration.indexOf('-'),
      );
      let durationUnit = currentDuration.substring(
        currentDuration.indexOf('-') + 1,
        currentDuration.length,
      );
      durationUnit =
        durationUnit.charAt(0).toUpperCase() + durationUnit.slice(1);
      if (Number(durationAmount) > 1) {
        durationUnit += 's';
      }
      return durationAmount + ' ' + durationUnit;
    }
  }

  editOffer() {
    this.router.navigate([
      '/inter-offers/inter-update',
      this.offerType,
      this.campaign,
    ]);
  }

  // --- --- ---
  navigateBack(): void {
    this.router.navigate(['/inter-offers']);
  }

  refresh() {
    window.location.reload();
  }

  onSubmit(type, element?) {
    const action = {};
    action['message'] = PROCEED_MESSAGE + type + '?';
    action['action'] = 'prompt';
    this.openActionDialog(action, type, element);
  }

  getOfferCode(): string {
    return this.offerCode ? this.offerCode.split(', ')[0] : '';
  }

  async addInterOffer(offer) {
    try {
      this.loaderService.show();
      const response = await this.offersService
        .createInterOffer(this.offerPayload)
        .toPromise();
      this.openResponseDialog(response, 'inter-detail');
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async validateInterOffer() {
    try {
      this.loaderService.show();
      const updatedBy = localStorage.getItem('username');
      const response = await this.offersService
        .validateInterOffer(this.campaign, updatedBy)
        .toPromise();
      this.openResponseDialog(response, 'inter-detail');
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async publishInterOffer() {
    try {
      this.loaderService.show();
      const updatedBy = localStorage.getItem('username');
      const response = await this.offersService
        .publishInterOffer(this.campaign, updatedBy)
        .toPromise();
      this.openResponseDialog(response, 'inter-detail');
    } catch (err) {
      this.openErrorDialog(err, {
        navigateTo: `/inter-offers/inter-detail/${this.campaign}`,
        reload: true,
      } as OpenErrorDialogOptions);
    }
  }

  async retireInterOffer() {
    try {
      this.loaderService.show();
      const updatedBy = localStorage.getItem('username');
      const response = await this.offersService
        .archiveInterOffer(this.campaign, updatedBy)
        .toPromise();
      if (this.status === StatusEnum.DFT) {
        this.openResponseDialog(response, 'inter-offers');
      } else {
        this.openResponseDialog(response, 'inter-detail');
      }
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async regionRetryAction(region) {
    try {
      this.loaderService.show();
      const updatedBy = localStorage.getItem('username');
      const offerFromRegion = this.buildRegionOffer(region.code);
      const storeCode = 'twlght-web-' + region.code.toLowerCase();
      const archiveResponse: any = await this.offersService
        .archiveOffer(region.offerCode, storeCode, updatedBy, this.offerType)
        .toPromise();
      if (archiveResponse.success) {
        const createResponse: any = await this.offersService
          .createOffer(offerFromRegion)
          .toPromise();
        if (createResponse.success) {
          this.openResponseDialog(createResponse, 'inter-detail');
        }
      }
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  deleteRegionFromData(regionCode: string): void {
    const newRegions: InterFormRegion[] = [];
    this.regions.forEach((region) => {
      if (region.code !== regionCode) {
        newRegions.push(region);
      }
    });
    this.regions = newRegions;

    const newLanguages: InterFormLanguage[] = [];
    this.languages.forEach((language) => {
      if (!language.code.startsWith(regionCode)) {
        newLanguages.push(language);
      }
    });
    this.languages = newLanguages;
  }

  async regionRetireAction(region) {
    try {
      this.loaderService.show();
      const storeCode = 'twlght-web-' + region.code.toLowerCase();
      const updatedBy = localStorage.getItem('username');
      const response = await this.offersService
        .archiveOffer(region.offerCode, storeCode, updatedBy, this.offerType)
        .toPromise();
      this.openResponseDialog(response, 'inter-detail');
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async regionValidateAction(region) {
    try {
      this.loaderService.show();
      const storeCode = 'twlght-web-' + region.code.toLowerCase();
      const updatedBy = localStorage.getItem('username');
      const response = await this.offersService
        .validateOffer(region.offerCode, storeCode, updatedBy, false)
        .toPromise();
      this.openResponseDialog(response, 'inter-detail');
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  shouldBlink(status: StatusEnum): string {
    return status === StatusEnum.STG_VALDN_PEND ||
      status === StatusEnum.PROD_VALDN_PEND
      ? 'pending-blink'
      : '';
  }

  isRegionCreationFailed(region): boolean {
    const regionStatusId: number = region.statusId;
    return (
      regionStatusId === StatusEnum.STG_ERR_CRT ||
      regionStatusId === StatusEnum.STG_FAIL
    );
  }

  isRegionValidationFailed(region): boolean {
    const regionStatusId: number = region.statusId;
    return (
      regionStatusId === StatusEnum.STG_VALDN_FAIL ||
      regionStatusId === StatusEnum.PROD_VALDN_FAIL
    );
  }

  async exportCsv(elem: InterFormRegion) {
    try {
      this.exportCsvButtonDisabled = true;
      elem.exportingCsv = true;
      const storeCode: string = 'twlght-web-' + elem.code.toLowerCase();
      await this.offersService.exportCsv(elem.offerCode, storeCode).toPromise();
    } catch (err) {
      this.openErrorDialog(err, { reload: false });
      elem.exportingCsv = false;
    } finally {
    }
  }

  async downloadCsv(elem: InterFormRegion) {
    elem.downloadingCsv = true;
    const action = {};
    action['message'] = `Download or request new export?`;
    action['action'] = 'download';
    const dlg = this.openAction(action);
    if (dlg) {
      this.dialogResponseSubscription = dlg
        .afterClosed()
        .subscribe(async (result) => {
          const storeCode: string = 'twlght-web-' + elem.code.toLowerCase();
          if (result === 'download') {
            try {
              const region = this.regions.find(
                (region) => region.code === elem.code,
              );
              const timeStamp = format(new Date(), 'yyyyMMdd-HHmmss');
              const fileName = `UniqueCouponCodes-${
                region.offerCode
              }-${timeStamp}-${elem.code.toLowerCase()}.csv`;
              this.loaderService.show();
              const response = await this.offersService
                .downloadCSV(elem.offerCode, storeCode)
                .toPromise();
              saveAs(response, fileName);
            } catch (err) {
              this.openErrorDialog(
                new Error(
                  `Failed to download CSV for offer '${elem.offerCode}'`,
                ),
                { reload: false },
              );
              elem.downloadingCsv = false;
            } finally {
              this.loaderService.hide();
            }
          } else if (result === 'export') {
            elem.showDownloadCsvBtn = false;
            elem.showExportCsvBtn = true;
            await this.exportCsv(elem);
          } else {
            // cancel
          }
        });
    }
  }

  openResponseDialog(response, returnTo?, opts?: OpenDialogOptions) {
    const dialogResponseRef = super.openResponse(response);
    this.dialogResponseSubscription = dialogResponseRef
      .afterClosed()
      .subscribe((result) => {
        if (opts && opts.reload === true) {
          this.refresh();
        }
        if (result) {
          if (opts && !opts.reload) {
            // do nothing
          } else if (returnTo === 'inter-offers') {
            this.navigateBack();
          } else {
            this.refresh();
          }
        }
      });
  }

  getLocalizedContent(regionCode: string) {
    const localized: any = {};
    this.languages.forEach((lang) => {
      if (lang.code.startsWith(regionCode)) {
        const languageCode: string = lang.code.substring(
          lang.code.indexOf('-') + 1,
        );
        localized[languageCode] = {
          claimOfferTerms: lang.claimOfferTerms,
          legalDisclaimer: lang.offerTerms,
          offerAppliedBannerText: lang.offerAppliedBanner,
          offerBodyText: lang.offerHeadline,
          offerBoldedText: lang.subhead,
          offerHeader: lang.marketingHeadline,
          welcomeEmailText: lang.welcomeEmailText,
        };
        if (!this.isRetention) {
          localized[languageCode].offerBgImageUrl = lang.offerBgImageUrl;
        }
      }
    });
    return localized;
  }

  openActionDialog(action, type, element?) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            if (type === 'CREATE') {
              this.addInterOffer(this.offerPayload);
            } else if (type === 'PUBLISH') {
              this.publishInterOffer();
            } else if (type === 'VALIDATE') {
              this.validateInterOffer();
            } else if (type === 'RETIRE' || type === 'DELETE') {
              this.retireInterOffer();
            } else if (type === 'DUPLICATE') {
              this.duplicateInterOffer();
            } else if (type === 'VALIDATE REGION') {
              this.regionValidateAction(element);
            } else if (type === 'RETIRE REGION') {
              this.regionRetireAction(element);
            } else if (type === 'RETRY REGION') {
              this.regionRetryAction(element);
            }
          }
        });
    }
  }

  duplicateInterOffer() {
    this.loaderService.show();
    this.router.navigate(['/inter-offers/inter-create', this.offerType], {
      queryParams: { prefill: this.campaign },
    });
  }

  showDuplicateBtn() {
    return true;
  }

  showRecurlyContentfulStatus() {
    return this.status !== StatusEnum.DFT;
  }

  showRetireBtn() {
    return (
      this.status !== StatusEnum.STG_VALDN_FAIL &&
      this.status !== StatusEnum.STG_VALDN_PEND &&
      this.status !== StatusEnum.PROD_VALDN_FAIL &&
      this.status !== StatusEnum.PROD_VALDN_PEND &&
      this.status !== StatusEnum.STG_RETD &&
      this.status !== StatusEnum.STG_FAIL &&
      this.status !== StatusEnum.STG_RB_FAIL &&
      this.status !== StatusEnum.PROD_RETD &&
      this.status !== StatusEnum.PROD_FAIL &&
      this.status !== StatusEnum.PROD_RB_FAIL
    );
  }

  showCreateBtn() {
    return (
      !this.checkPastCurrentDate(this.endDate) &&
      (this.status === StatusEnum.DFT || this.status === StatusEnum.STG_ERR_CRT)
    );
  }

  showHideCsvBtns() {
    this.regions.forEach((region) => {
      const csvFileExists = region.csvFileName !== null;
      region.showDownloadCsvBtn =
        (this.status === StatusEnum.STG_VALDN_PASS ||
          this.status === StatusEnum.PROD_VALDN_PASS) &&
        this.offerCodeType === CodeType.BULK_UNIQUE_CODE &&
        csvFileExists;
      const csvFileDoesNotExist = region.csvFileName === null;
      region.showExportCsvBtn =
        (this.status === StatusEnum.STG_VALDN_PASS ||
          this.status === StatusEnum.PROD_VALDN_PASS) &&
        this.offerCodeType === CodeType.BULK_UNIQUE_CODE &&
        csvFileDoesNotExist;
    });
    this.regionsData = new MatTableDataSource(this.regions);
  }

  showValidateBtn() {
    return this.status === StatusEnum.STG || this.status === StatusEnum.PROD;
  }

  isOfferReadyForValidation() {
    const enableValidateAt = moment(this.lastModifiedAt).add(
      environment.validationTimer,
      'seconds',
    );
    const now = moment();
    return now.isAfter(enableValidateAt);
  }

  countDownCompleteHandler(completed) {
    this.readyToValidate = completed === 'countdown-completed';
  }

  disableValidateBtn() {
    return (
      this.offerCodeType === CodeType.BULK_UNIQUE_CODE &&
      this.regions.some((region) => {
        return (
          region.isInWorkflow === WorkflowAction.GENERATE_CSV ||
          this.origTotalUniqueCodes > this.totalUniqueCodes
        );
      })
    );
  }

  disablePublishBtn() {
    return true;
  }

  showPublishBtn() {
    return (
      !this.checkPastCurrentDate(this.endDate) &&
      (this.status === StatusEnum.STG_VALDN_PASS ||
        this.status === StatusEnum.APV_APRVD ||
        this.status === this.StatusEnum.PROD_ERR_PUB)
    );
  }

  showEditBtn() {
    return (
      (this.status === StatusEnum.DFT ||
        !this.checkPastCurrentDate(this.endDate)) &&
      this.status !== StatusEnum.STG_VALDN_FAIL &&
      this.status !== StatusEnum.STG_VALDN_PEND &&
      this.status !== StatusEnum.PROD_VALDN_FAIL &&
      this.status !== StatusEnum.PROD_VALDN_PEND &&
      this.status !== StatusEnum.STG_RB_FAIL &&
      this.status !== StatusEnum.PROD_RB_FAIL &&
      this.status !== StatusEnum.APV_PEND &&
      this.status !== StatusEnum.STG_RETD &&
      this.status !== StatusEnum.STG_FAIL &&
      this.status !== StatusEnum.PROD_PEND &&
      this.status !== StatusEnum.PROD_RETD &&
      this.status !== StatusEnum.PROD_FAIL
    );
  }

  checkPastCurrentDate(date) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < currentDate;
  }

  async refreshClickHandler(elem: InterFormRegion) {
    try {
      if (
        elem.isInWorkflow !== WorkflowAction.GENERATE_CSV &&
        Number(elem.origTotalUniqueCodes) > Number(elem.totalUniqueCodes)
      ) {
        elem.showDownloadCsvBtn = false;
        elem.showExportCsvBtn = false;
        const storeCode: string = 'twlght-web-' + elem.code.toLowerCase();
        await this.offersService
          .generateCodes(elem.offerCode, storeCode)
          .toPromise();
      }
    } catch (err) {
      this.snackbarService.show(`${err.message}`, 'ERROR');
    } finally {
      this.snackbarService.show('Updating total unique codes count...', 'OK');
      await this.getOffer(elem.offerCode, elem.code);
    }
  }

  getOfferBoldedText() {
    if (this.offerBoldedText) {
      return this.offerBoldedText.replace('<span>', '').replace('</span>', '');
    } else {
      return '';
    }
  }

  getOfferBoldedTextHint() {
    if (this.offerBoldedTextHint) {
      return this.offerBoldedTextHint
        .replace('<span>', '')
        .replace('</span>', '');
    } else {
      return '';
    }
  }

  getValidateButtonToolTip() {
    if (!this.readyToValidate) {
      return formatStringWithTokens(
        VALIDATE_BUTTON_TOOLTIP_DISABLED_TIMER,
        environment.validationTimer / 60,
      );
    } else if (this.disableValidateBtn()) {
      return VALIDATE_BUTTON_TOOLTIP_DISABLED;
    } else {
      return VALIDATE_BUTTON_TOOLTIP;
    }
  }

  isOfferStatusInvalidForDIT() {
    return (
      this.status === StatusEnum.DFT ||
      this.status === StatusEnum.STG_ERR_CRT ||
      this.status === StatusEnum.STG_ERR_UPD ||
      this.status === StatusEnum.STG_ERR_DEL ||
      this.status === StatusEnum.STG_VALDN_FAIL ||
      this.status === StatusEnum.STG_RETD ||
      this.status === StatusEnum.STG_RB_FAIL ||
      this.status === StatusEnum.STG_FAIL ||
      this.status === StatusEnum.APV_REJ ||
      this.status === StatusEnum.PROD_ERR_PUB ||
      this.status === StatusEnum.PROD_ERR_UPD ||
      this.status === StatusEnum.PROD_ERR_DEL ||
      this.status === StatusEnum.PROD_VALDN_FAIL ||
      this.status === StatusEnum.PROD_RETD ||
      this.status === StatusEnum.PROD_RB_FAIL ||
      this.status === StatusEnum.PROD_FAIL
    );
  }

  generateRandomOfferCode() {
    const offerCode = Math.random().toString(32).substring(2);
    switch (this.offerType) {
      case OfferType.ACQUISITION:
        return `samocqa_acquisition_integrity_${offerCode}`;

      case OfferType.WINBACK:
        return `samocqa_winback_integrity_${offerCode}`;

      case OfferType.RETENTION:
        return `samocqa_retention_integrity_${offerCode}`;
    }
  }

  buildRegionOffer(regionCode: string) {
    let offer: any;
    switch (this.offerType) {
      case OfferType.ACQUISITION:
      case OfferType.WINBACK:
        offer = this.acquisitionWinbackOffer(regionCode);
        break;

      case OfferType.RETENTION:
        offer = this.retentionOffer(regionCode);
        break;
    }
    offer.localized = this.getLocalizedContent(regionCode);
    return offer;
  }

  acquisitionWinbackOffer(regionCode: string) {
    const region: InterFormRegion = this.regions.find(
      (region) => region.code === regionCode,
    );
    const language: InterFormLanguage = this.languages.find(
      (lang) => lang.code.substring(0, 2) === regionCode,
    );
    const offer: OfferRequestPayload = {
      campaign: this.campaign,
      campaignName: this.campaignName,
      storeCode: 'twlght-web-' + region.code.toLowerCase(),
      offerTypeId: this.offerType,
      offerCode: region.nextValidOfferCode,
      planCode: region.planCode,
      offerCodeType: this.offerCodeType,
      discountType: this.discountType,
      offerName: region.offerName,
      offerBusinessOwner: this.offerBusinessOwner,
      noEndDate: this.noEndDate,
      discountDurationValue: region.durationValue,
      discountDurationUnit: region.durationUnit,

      offerHeader: language.marketingHeadline,
      offerBodyText: language.offerHeadline,
      offerBoldedText: language.subhead,
      offerAppliedBannerText: language.offerAppliedBanner,
      offerBgImageUrl: language.offerBgImageUrl,
      legalDisclaimer: language.offerTerms,
      welcomeEmailText: language.welcomeEmailText,
    };
    if (this.offerCodeType === CodeType.BULK_UNIQUE_CODE) {
      offer.totalUniqueCodes = region.totalUniqueCodes;
    }
    if (this.offer === DiscountType.FIXED) {
      offer.discountAmount = region.price;
    }
    if (this.endDate) {
      offer.endDateTime = this.endDateTime;
    }
    return offer;
  }

  retentionOffer(regionCode: string) {
    const region: InterFormRegion = this.regions.find(
      (region) => region.code === regionCode,
    );
    const language: InterFormLanguage = this.languages.find(
      (lang) => lang.code.substring(0, 2) === regionCode,
    );
    const offer: OfferRequestPayload = {
      campaign: this.campaign,
      campaignName: this.campaignName,
      storeCode: 'twlght-web-' + region.code.toLowerCase(),
      offerCodeType: CodeType.SINGLE_CODE,
      offerTypeId: OfferType.RETENTION,
      offerCode: region.nextValidOfferCode,

      eligiblePlans: region.eligiblePlans,
      createUpgradeOffer: region.createUpgradeOffer,
      upgradePlan: region.upgradePlan,
      usersOnPlans: region.usersOnPlans,
      addToPrimaryDefault: undefined, // legacy things
      addToSecondaryDefault: undefined, // legacy things
      discountType: this.discountType,
      discountDurationType: this.discountDurationType,
      discountDurationValue: region.durationValue,
      discountDurationUnit: region.durationUnit,
      discountAmount: region.price,

      offerName: region.offerName,
      offerHeader: language.marketingHeadline,
      offerBodyText: language.offerHeadline,
      offerBoldedText: language.subhead,
      offerAppliedBannerText: language.offerAppliedBanner,
      legalDisclaimer: language.offerTerms,
      claimOfferTerms: language.claimOfferTerms,
      welcomeEmailText: language.welcomeEmailText,
      offerBusinessOwner: this.offerBusinessOwner,
      noEndDate: this.noEndDate,
    };
    if (this.endDate) {
      offer.endDateTime = this.endDateTime;
    }
    return offer;
  }

  async startRecordDIT() {
    // this.invalidStrings = [];
    // const offer = this.buildOffer();
    // if (this.glValidationError === null) {
    //   try {
    //     this.DITButtonColor = '#ff0';
    //     this.detailPageTooltipText = 'Running test...';
    //     const addResponse = await this.offersService.addDraft(offer).toPromise();
    //     const deleteResponse = await this.offersService.archiveOffer(offer.offerCode).toPromise();
    //     if (addResponse['success'] && deleteResponse['success']) {
    //       await this.offersService.updateRecordDITStatus(
    //         this.getOfferCode(),
    //         {
    //           dataIntegrityStatus: true,
    //           dataIntegrityErrorMessage: null
    //         }
    //       ).toPromise();
    //       this.DITButtonColor = '#0f0';
    //       this.detailPageTooltipText = 'Record DIT: passed';
    //     }
    //   } catch (err) {
    //     let errorString: string = 'Errors exist!';
    //     err.error.errors.forEach(field => {
    //       this.invalidStrings.push(field)
    //     })
    //     await this.offersService.updateRecordDITStatus(
    //       this.getOfferCode(),
    //       {
    //         dataIntegrityStatus: false,
    //         dataIntegrityErrorMessage: errorString
    //       }
    //     ).toPromise();
    //     this.DITButtonColor = '#f00';
    //     this.detailPageTooltipText = 'Record DIT: failed';
    //   }
    // } else {
    //   this.DITButtonColor = '#f00';
    //   this.detailPageTooltipText = this.glValidationError;
    // }
  }

  isInvalidField(fieldName: string) {
    return this.invalidStrings.some((field) => {
      const fieldKeyNameArr = Object.keys(field);
      return fieldKeyNameArr[0] === fieldName;
    });
  }

  getInvalidErrorText(fieldName: string) {
    const result: any = this.invalidStrings.find((field) => {
      const fieldKeyNameArr = Object.keys(field);
      return fieldKeyNameArr[0] === fieldName;
    });
    return result[fieldName];
  }

  getCreationErrorSuggestion(nextValidOfferCode: string): string {
    return `Click retry to try again with the prefilled suggested code: "${nextValidOfferCode}"`;
  }

  async setNextValidRegionsOfferCodes(): Promise<any> {
    this.loaderService.show('Getting regions next valid offer codes...');
    const result: any[] = [];
    try {
      this.regions.forEach((region) => {
        if (this.isRegionCreationFailed(region)) {
          result.push(
            this.validateRegionOfferCode(region).then((res) => {
              return res.success;
            }),
          );
        }
      });
      return Promise.all(result);
    } catch (err) {
      this.openErrorDialog(err as OpenErrorDialogOptions);
    }
  }

  async validateRegionOfferCode(region): Promise<any> {
    try {
      let isValidOfferCode: boolean = false;
      let result: any = {};
      while (!isValidOfferCode) {
        region.nextValidOfferCode = this.webOffersUtils.getNewOfferCode(
          region.nextValidOfferCode,
        );
        result = await this.checkInterOfferCodeValidation(region);
        if (result.success) {
          isValidOfferCode = true;
        }
      }
      return result;
    } catch (err) {
      this.openErrorDialog(err as OpenErrorDialogOptions);
    }
  }

  // --- --- ---
  async checkInterOfferCodeValidation(region): Promise<any> {
    const offerCode = region.nextValidOfferCode;
    try {
      //TODO: use actual store code
      const storeCode = `twlght-web-${region.code.toLowerCase()}`;
      const response = await this.offersService
        .getOfferCodeValidationResult(offerCode, storeCode, this.offerType)
        .toPromise();
      return response;
    } catch (err) {
      return err;
    }
  }

  // build campaign
  buildCampaign(): object {
    const offer: any = this.offerPayload;
    const regions: any[] = this.regions.map((region) => {
      const regionData: InterFormRegion = {
        code: region.code,
        price: region.price,
        durationType:
          region.duration === DurationType.SINGLE_USE
            ? DurationType.SINGLE_USE
            : region.duration,
        durationValue: Number(region.durationValue) || null,
        durationUnit: region.durationUnit || null,
        offerCode: region.offerCode,
        offerName: region.offerName,
        offerCodeStatus: region.offerCodeStatus,
        statusId: region.statusId,
      };
      if (this.isRetention) {
        regionData.eligiblePlans = region.eligiblePlans;
        regionData.eligiblePlanCodes = region.eligiblePlans;
        regionData.createUpgradeOffer = offer.createUpgradeOffer
          ? region.createUpgradeOffer
          : null;
        regionData.upgradePlan = offer.createUpgradeOffer
          ? region.upgradePlan
          : null;
        regionData.usersOnPlans = offer.createUpgradeOffer
          ? region.usersOnPlans
          : null;
      } else {
        regionData.planCode = region.planCode;
      }
      if (this.offerCodeType === CodeType.BULK_UNIQUE_CODE) {
        regionData.totalUniqueCodes = offer.totalUniqueCodes;
        regionData.origTotalUniqueCodes = offer.totalUniqueCodes;
      }
      return regionData;
    });
    const languages: any[] = this.languages.map((language) => {
      let regionalClaimOfferTerms: string = '';
      if (this.isRetention) {
        const selectedLanguageCode: string = language.code.substring(
          language.code.indexOf('-') + 1,
          language.code.length,
        );
        const languageRegionsData = this.regions.find(
          (region) => region.code === language.code.substring(0, 2),
        );
        const regionalOfferCode: string = languageRegionsData.offerCode;
        regionalClaimOfferTerms = this.offersService.getRegionClaimOfferTermsPlaceholder(
          selectedLanguageCode,
          regionalOfferCode,
        );
      }
      const languageData: InterFormLanguage = {
        code: language.code,
        marketingHeadline: language.marketingHeadline,
        offerHeadline: language.offerHeadline,
        subhead: language.subhead,
        offerAppliedBanner: language.offerAppliedBanner,
        offerTerms: language.offerTerms,
        welcomeEmailText: language.welcomeEmailText,
      };
      if (this.isRetention) {
        languageData.claimOfferTerms = regionalClaimOfferTerms;
      } else {
        languageData.offerBgImageUrl = language.offerBgImageUrl;
      }
      return languageData;
    });
    const result = {
      OfferType: {
        id: this.offerType,
        title: this.offerTypeTitle,
      },
      Plan: offer.Plan,
      Status: {
        id: 1,
        title: 'DFT',
        description: 'Saved to Draft',
      },
      couponExpiredAt: null,
      couponState: 'None',
      csvFileName: null,
      discountAmount: offer.discountAmount,
      discountDurationType: offer.discountDurationType,
      discountDurationUnit: offer.discountDurationUnit,
      discountDurationValue: offer.discountDurationValue,
      discountType: offer.discountType,
      endDateTime: offer.endDate,
      entryState: 'None',
      environments: ['Dev'],
      lastModifiedAt: null,
      noEndDate: offer.noEndDate,
      campaignName: offer.campaignName ? offer.campaignName : offer.offerName,
      offerName: offer.offerName,
      offerBusinessOwner: offer.offerBusinessOwner,
      marketingHeadline: offer.marketingHeadline,
      offerHeadline: offer.offerHeadline,
      subhead: offer.subhead,
      offerAppliedBanner: offer.offerAppliedBanner,
      offerTerms: offer.offerTerms,
      welcomeEmailText: offer.welcomeEmailText,
      offerBgImageUrl: offer.offerBgImageUrl,
      claimOfferTerms: offer.claimOfferTerms,
      offerCTA: null,
      offerCodeType: offer.offerCodeType,
      offerTypeId: this.offerType,
      offerUrl:
        'https://twlghtcom-dev3.twlght.com/us/en/offers?c=b21hY3NxYV9hY3F1aXNpdGlvbl8yMDIxMTIwN184MDBfZm9yXzVtb192Mg==',
      offerVanityUrl: null,
      origTotalUniqueCodes: null,
      publishDateTime: null,
      statusId: 1,
      totalUniqueCodes: offer.totalUniqueCodes,
      updatedAt: null,
      createUpgradeOffer: offer.createUpgradeOffer,
      upgradePlan: offer.upgradePlan || null,
      usersOnPlans: offer.usersOnPlans || null,
      dptrmLink: offer.dptrmLink,
      targetLaunchDate: offer.targetLaunchDate,
      regions,
      languages,
    };
    if (!this.isRetention) {
      result['planCode'] = offer.Plan?.planCode;
    } else {
      result['eligiblePlans'] = offer.eligiblePlans;
      result['eligiblePlanCodes'] = offer.eligiblePlans;
    }
    return result;
  }

  ngOnDestroy() {
    // this.routerSubscription.unsubscribe();
    // this.resizeSubscription$.unsubscribe();
    // if (this.dialogResponseSubscription !== undefined) {
    //   this.dialogResponseSubscription.unsubscribe();
    // }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
