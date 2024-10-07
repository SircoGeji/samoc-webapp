import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
} from '@angular/core';

import { OffersService } from '../../service/offers.service';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../components/base/base.component';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { fromEvent, Observable, Subscription } from 'rxjs';
import {
  CodeType,
  StatusEnum,
  WorkflowAction,
  OfferType,
  DiscountType,
  DurationType,
  DITColorEnum,
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
import { OfferRequestPayload } from '../../types/payload';
import * as pluralize from 'pluralize';
import { SnackbarService } from '../../service/snackbar.service';
import { WebSocketService } from '../../service/web-socket.service';
import * as moment from 'moment-timezone';
import { getTimeZoneDateTime } from '../../helpers/date-utils';
import { environment } from '../../../environments/environment';
import { formatStringWithTokens, removeXid } from '../../helpers/string-utils';
import { ConfigurationService } from '../../service/configuration.service';
import { InfoModalComponent } from '../../components/info-modal/info-modal.component';

@Component({
  selector: 'app-detail-offer-page',
  templateUrl: './detail-offer-page.component.html',
  styleUrls: ['./detail-offer-page.component.scss'],
})
export class DetailOfferPageComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  detailPageTooltipText: string | undefined;
  offerType: number; // 1=Default Signup, 2=Acquisition
  offerTypeString: string | undefined;
  offerCode: string | null | undefined; // offerCode
  offerCodeType: string | undefined; // offerCodeType: [single, bulk]
  formattedOfferCodeType: string | undefined; // offerCodeType: [single, bulk]
  totalRedemptions: number;
  totalUniqueCodes: number | undefined; // totalUniqueCodes from Recurly
  origTotalUniqueCodes: number | undefined; // original TotalUniqueCodes entered
  plan: string | undefined; // planCode
  createUpgradeOffer: boolean | undefined;
  upgradePlan?: string | undefined;
  planCode: string | undefined;
  eligiblePlans: string | undefined;
  eligiblePlansArr: string[] | undefined;
  eligibleCharges: string | undefined;
  eligibleChargesArr: string[] | undefined;
  usersOnPlans: string | undefined;
  usersOnPlansArr: string[] | undefined;
  discountDurationType: string | undefined;
  durationType: string | undefined;
  formattedDiscountType: string | undefined;
  formattedDiscountAmount: string | undefined;
  formattedDiscountDuration: string | undefined;
  offerHeader: string | undefined; // contentful title
  offerName: string | undefined; // coupon name
  offerTitle: string | undefined;
  offerDescription: string | undefined;
  offerTerms: string | undefined;
  offerBodyText: string | undefined; // description
  // offerCTA: string; // cta
  offerBoldedText: string | undefined; // total line
  offerBoldedTextHint: string | undefined;
  offerAppliedBannerText: string | undefined; // bannerText
  offerBgImageUrl: string | undefined; // imageUrl
  legalDisclaimer: string | undefined; // legalDisclaimer
  claimOfferTerms: string | undefined; // claimOfferTerms
  welcomeEmailText: string | undefined; // welcomeEmailText
  offer: string | undefined; // discountType: [price, trial]
  formattedOffer: string | undefined; // discountType: [price, trial]
  offerPrice?: number | null | undefined; // discountPrice
  offerDurationValue?: number | null | undefined; // discountDurationValue
  offerDurationAmount?: number | null | undefined; // discountDurationAmount
  offerDurationUnit?: string | undefined; // discountDurationUnit: [days, weeks, months]
  formattedOfferDurationUnit?: string; // discountDurationUnit: [days, weeks, months]
  offerBusinessOwner: string | undefined; // businessOwner
  offerVanityUrl: string | undefined; // vanityUrl
  publishDate: string; // format: mm/dd/yyyy
  publishTime: string | undefined; // format: hh:mm (AM/PM)
  endDateTime: string | undefined;
  endDate?: string | undefined; // format: mm/dd/yyyy
  endTime?: string | undefined; // format: hh:mm (AM/PM)
  noEndDate: boolean | undefined;
  status: number;
  StatusEnum = StatusEnum;
  routerSubscription: Subscription;
  dialogResponseSubscription: Subscription;
  resizeObservable$: Observable<Event>;
  resizeSubscription$: Subscription;
  retireButtonText: string | undefined;
  offerPayload?: OfferRequestPayload;
  entryState: string | undefined;
  couponState: string | undefined;
  currentStatus: StatusEnum | undefined;
  couponCreatedAt: string | null;
  couponExpiredAt: string | null;
  showButtonsGroupCls = 'hideBtns';
  csvFileName: string | undefined;
  exportingCsv = false;
  showExportCsvBtn = false;
  showDownloadCsvBtn = false;
  isInWorkflow: string | null | undefined = null;
  showRefreshBtn = false;
  tzName = DEFAULT_TIMEZONE;
  offerUrl: string | undefined;
  lastModifiedAt: string | undefined;
  readyToValidate: boolean;
  invalidStrings: string[] | undefined;
  contentfulImageUpdatedAt: Date | undefined;
  contentfulUpdatedAt: Date | undefined;
  couponUpdatedAt: Date | undefined;
  dataIntegrityStatus: boolean | undefined;
  dataIntegrityCheckTime: Date | undefined;
  dataIntegrityErrorMessage: string | undefined;
  DITButtonColor: string = DITColorEnum.GREY;
  glValidationError: string | undefined;
  glValidationWarning: string | undefined;
  public validateDITTooltipMessage: string = 'DIT was not yet finished';
  public showDITButton = false;

  private storeCode: string = '';

  constructor(
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
    private configService: ConfigurationService,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.storeCode = this.configService.getStore().storeCode;
    this.setOfferType(this.router.url);
    this.webSocketService.listen('show-snackbar').subscribe((data: any) => {
      const regexPattern = '^.*offers/detail/' + data.offerCode + '$';
      if (this.router.url.match(regexPattern)) {
        this.snackbarService.show(data.msg, data.action);
        if (data.event === 'enableDownloadBtn') {
          this.showExportCsvBtn = false;
          this.exportingCsv = false;
          this.showDownloadCsvBtn = true;
        } else if (
          (data.event === 'generateCsvComplete' && data.reload) ||
          data.event === 'exportCsvFailed'
        ) {
          this.getOffer(true);
        } else {
          if (!this.loaderService.isLoading.value.value) {
            this.getOffer(true);
          }
        }
      }
    });
    this.routerSubscription = this.route.paramMap.subscribe(
      (params: ParamMap) => {
        this.offerCode = params.get('offerCode');
        this.getOffer();
      },
    );
    this.resizeObservable$ = fromEvent(window, 'resize');
    this.resizeSubscription$ = this.resizeObservable$.subscribe((evt) => {
      this.updateScrollableHeight();
    });
  }

  setOfferType(offerCode: string) {
    if (!!offerCode.includes('acq_') || !!offerCode.includes('acquisition_')) {
      this.offerType = OfferType.ACQUISITION;
    } else if (
      !!offerCode.includes('win_') ||
      !!offerCode.includes('winback_')
    ) {
      this.offerType = OfferType.WINBACK;
    } else if (
      !!offerCode.includes('ret_') ||
      !!offerCode.includes('retention_')
    ) {
      this.offerType = OfferType.RETENTION;
    } else if (!!offerCode.includes('ext_')) {
      this.offerType = OfferType.EXTENSION;
    }
    this.showDITButton = true;
  }

  async getOffer(skipSpinner?: boolean) {
    if (!skipSpinner) {
      this.loaderService.show('Retrieving offer details...');
    }
    try {
      const data: any = await this.offersService
        .getOffer(this.offerCode, this.storeCode, this.offerType)
        .toPromise();
      this.offerPayload = data;
      if (this.offerType === OfferType.EXTENSION) {
        this.setExtensionOfferData(data);
      } else {
        this.setNonExtensionOfferData(data);
      }
    } catch (err) {
      this.openErrorDialog(err, {
        reload: false,
      } as OpenErrorDialogOptions);
    } finally {
      this.loaderService.hide();
    }
    if (
      !this.isOfferStatusInvalidForDIT() &&
      !!this.showDITButton &&
      !this.isExtension()
    ) {
      await this.startRecordDIT();
    }
  }

  setExtensionOfferData(data: any) {
    if (data.eligibleCharges === null) {
      this.eligibleCharges = 'All Plans';
    } else if (Array.isArray(data.eligibleCharges)) {
      this.eligibleChargesArr = [...data.eligibleCharges];
      this.eligibleCharges =
        data.eligibleCharges.length > 0
          ? data.eligibleCharges.join(', ')
          : 'All Plans';
    }
    this.offerType = data.OfferType?.id;
    this.offerTypeString = data.OfferType?.title;
    this.offerCode = data.offerCode;
    if (data.upgradePlan) {
      this.offerCode += `, ${this.offerCode}_upgrade`;
    }
    this.upgradePlan = data.upgradePlan;
    this.usersOnPlansArr = data.usersOnPlans;
    this.usersOnPlans =
      data.usersOnPlans && data.usersOnPlans.length > 0
        ? data.usersOnPlans.join(', ')
        : 'All Plans';
    this.offer = data.discountType;
    this.formattedOffer = this.formatOffer(data.discountType);
    this.offerPrice = data.discountAmount;
    this.formattedDiscountAmount = `$${data.discountAmount}`;
    this.offerDurationAmount = data.durationAmount;
    this.offerDurationUnit = data.durationUnit;
    this.formattedOfferDurationUnit = data.durationUnit
      ? pluralize(
          data.durationUnit[0].toUpperCase() + data.durationUnit.slice(1),
          data.durationAmount,
        )
      : '';
    this.durationType = data.durationType;
    this.offerDurationValue = data.durationAmount;
    if (data.durationType === DurationType.SINGLE_USE) {
      this.formattedDiscountDuration = 'Single Use';
    } else if (data.durationType === DurationType.FOREVER) {
      this.formattedDiscountDuration = 'Forever';
    } else {
      this.formattedDiscountDuration = `${this.offerDurationValue} ${this.formattedOfferDurationUnit}`;
    }
    this.offerTitle = data.offerTitle;
    this.offerDescription = data.offerDescription;
    this.offerTerms = data.offerTerms;
    this.status = data.statusId;
    this.couponCreatedAt = data.couponCreatedAt
      ? format(new Date(data.couponCreatedAt), 'MMM dd, yyyy')
      : null;
    this.couponExpiredAt = data.couponExpiredAt
      ? format(new Date(data.couponExpiredAt), 'MMM dd, yyyy')
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
    this.currentStatus = status[0]?.[1]?.description;
    this.showButtonsGroupCls = 'showBtns';
    this.lastModifiedAt = data.lastModifiedAt;
    this.readyToValidate = this.isOfferReadyForValidation();
    this.contentfulImageUpdatedAt = data.contentfulImageUpdatedAt;
    this.contentfulUpdatedAt = data.contentfulUpdatedAt;
    this.couponCreatedAt = data.couponCreatedAt
      ? format(new Date(data.couponCreatedAt), 'MMM dd, yyyy')
      : null;
    this.couponExpiredAt = data.couponExpiredAt
      ? format(new Date(data.couponExpiredAt), 'MMM dd, yyyy')
      : null;
    this.couponState =
      data.couponState === 'expired'
        ? 'Expired At ' + this.couponExpiredAt
        : data.couponState
        ? data.couponState
        : 'Not found';
    this.couponUpdatedAt = data.couponUpdatedAt;
    this.retireButtonText = this.determineButtonText(this.status);
    this.entryState = data.entryState ? data.entryState : 'Not found';
    this.offerBusinessOwner = data.offerBusinessOwner;
    this.offerAppliedBannerText = data.bannerText;
  }

  setNonExtensionOfferData(data: any) {
    if (data.eligiblePlans === null) {
      this.eligiblePlans = 'All Plans';
    } else if (Array.isArray(data.eligiblePlans)) {
      this.eligiblePlansArr = [...data.eligiblePlans];
      this.eligiblePlans =
        data.eligiblePlans.length > 0
          ? data.eligiblePlans.join(', ')
          : 'All Plans';
    }
    this.offerType = data.OfferType?.id;
    this.offerTypeString = data.OfferType?.title;
    this.offerCode = data.offerCode;
    if (data.upgradePlan) {
      this.offerCode += `, ${this.offerCode}_upgrade`;
    }
    this.usersOnPlansArr = data.usersOnPlans;
    this.usersOnPlans =
      data.usersOnPlans && data.usersOnPlans.length > 0
        ? data.usersOnPlans.join(', ')
        : 'All Plans';
    this.offerCodeType = data.offerCodeType;
    this.formattedOfferCodeType = this.formatOfferCodeType(data.offerCodeType);
    this.totalRedemptions = data.totalRedemptions ? data.totalRedemptions : 0;
    this.totalUniqueCodes = data.totalUniqueCodes;
    this.origTotalUniqueCodes = data.origTotalUniqueCodes;
    this.plan = data.Plan?.planCode;
    this.createUpgradeOffer = data.createUpgradeOffer;
    this.upgradePlan = data.upgradePlan;

    this.offerUrl = data.offerUrl;
    this.offerHeader = data.offerHeader;
    this.offerName = data.offerName;
    this.offerBodyText = data.offerBodyText;
    this.offerBoldedText = data.offerBoldedText;
    // this.offerCTA = data.offerCTA;
    this.offerBoldedText = data.offerBoldedText;
    this.offerBoldedTextHint = data.offerBoldedTextHint;
    this.offerAppliedBannerText = data.offerAppliedBannerText;
    this.offerBgImageUrl = data.offerBgImageUrl;
    this.legalDisclaimer = data.legalDisclaimer;
    this.claimOfferTerms = data.claimOfferTerms;
    this.welcomeEmailText = data.welcomeEmailText;
    this.offer = data.discountType;
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

    if (this.isRetention()) {
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
    this.publishDate = data.publishDate ? data.publishDate : 'No Publish Date';
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
      ? format(new Date(data.couponCreatedAt), 'MMM dd, yyyy')
      : null;
    this.couponExpiredAt = data.couponExpiredAt
      ? format(new Date(data.couponExpiredAt), 'MMM dd, yyyy')
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
    this.currentStatus = status[0]?.[1]?.description;
    this.changeDetectorRef.detectChanges();
    this.updateScrollableHeight();
    this.showButtonsGroupCls = 'showBtns';
    this.csvFileName = data.csvFileName;
    this.isInWorkflow = data.isInWorkflow;
    this.exportingCsv = this.isInWorkflow === WorkflowAction.EXPORT_CSV;
    this.showRefreshBtn =
      Number(this.totalUniqueCodes) < Number(this.origTotalUniqueCodes) ||
      this.isInWorkflow === 'generateCsv';
    this.showHideCsvBtns();
    this.lastModifiedAt = data.lastModifiedAt;
    this.readyToValidate = this.isOfferReadyForValidation();
    this.contentfulImageUpdatedAt = data.contentfulImageUpdatedAt;
    this.contentfulUpdatedAt = data.contentfulUpdatedAt;
    this.couponUpdatedAt = data.couponUpdatedAt;
    this.dataIntegrityStatus = data.dataIntegrityStatus;
    this.dataIntegrityCheckTime = data.dataIntegrityCheckTime;
    this.dataIntegrityErrorMessage = data.dataIntegrityErrorMessage;
    this.glValidationError = data.glValidationError;
    this.glValidationWarning = data.glValidationWarning;
  }

  isOfferValidationFailed(): boolean {
    return (
      (!!this.status && this.status === StatusEnum.STG_VALDN_FAIL) ||
      (!!this.status && this.status === StatusEnum.PROD_VALDN_FAIL) ||
      (!!this.status && this.status === StatusEnum.STG_RB_FAIL) ||
      (!!this.status && this.status === StatusEnum.PROD_RB_FAIL)
    );
  }

  editOffer() {
    this.router.navigate(['/offers/update', this.getOfferCode()]);
  }

  return() {
    this.router.navigate(['/offers']);
  }

  refresh() {
    window.location.reload();
  }

  onSubmit(type) {
    if (type === 'HISTORY') {
      this.openOfferHistoryWindow(this.getOfferCode());
    } else {
      const action = {};
      action['message'] = PROCEED_MESSAGE + type + '?';
      action['action'] = 'prompt';
      this.openActionDialog(action, type);
    }
  }

  showHistoryBtn(): boolean {
    return this.status !== StatusEnum.DFT;
  }

  getOfferCode(): string {
    return this.offerCode ? this.offerCode.split(', ')[0] : '';
  }

  async addOffer(offer) {
    try {
      this.loaderService.show();
      const skipValidation = offer.OfferType.id === OfferType.EXTENSION;
      const response = await this.offersService
        .createOffer(this.offerPayload, skipValidation)
        .toPromise();
      this.openResponseDialog(response, 'detail');
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async validateOffer() {
    try {
      this.loaderService.show();
      const updatedBy = localStorage.getItem('username');
      const response = await this.offersService
        .validateOffer(this.getOfferCode(), this.storeCode, updatedBy)
        .toPromise();
      this.openResponseDialog(response, 'detail');
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async publishOffer() {
    try {
      this.loaderService.show();
      const updatedBy = localStorage.getItem('username');
      const response = await this.offersService
        .publishOffer(
          this.getOfferCode(),
          this.storeCode,
          updatedBy,
          this.offerType,
        )
        .toPromise();
      this.openResponseDialog(response, 'detail');
    } catch (err) {
      this.openErrorDialog(!!err.error ? err.error : err, {
        navigateTo: `/offers/detail/${this.getOfferCode()}`,
        reload: true,
      } as OpenErrorDialogOptions);
    }
  }

  async retireOffer() {
    try {
      this.loaderService.show();
      const updatedBy = localStorage.getItem('username');
      const response = await this.offersService
        .archiveOffer(
          this.getOfferCode(),
          this.storeCode,
          updatedBy,
          this.offerType,
        )
        .toPromise();
      if (this.status === StatusEnum.DFT) {
        this.openResponseDialog(response, 'offers');
      } else {
        this.openResponseDialog(response, 'detail');
      }
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async exportCsv() {
    try {
      this.exportingCsv = true;
      const timeStamp = format(new Date(), 'yyyyMMdd-HHmmss');
      const response = await this.offersService
        .exportCsv(this.getOfferCode(), this.storeCode)
        .toPromise();
      // this.openResponseDialog(response, '', { reload: false });
    } catch (err) {
      this.openErrorDialog(err, { reload: false });
      this.exportingCsv = false;
    } finally {
    }
  }

  async downloadCsv() {
    const action = {};
    action['message'] = `Download or request new export?`;
    action['action'] = 'download';
    const dlg = this.openAction(action);
    if (dlg) {
      this.dialogResponseSubscription = dlg
        .afterClosed()
        .subscribe(async (result) => {
          if (result === 'download') {
            try {
              const timeStamp = format(new Date(), 'yyyyMMdd-HHmmss');
              const fileName = `UniqueCouponCodes-${this.offerCode}-${timeStamp}.csv`;
              this.loaderService.show();
              const response = await this.offersService
                .downloadCSV(this.offerCode, this.storeCode)
                .toPromise();
              saveAs(response, fileName);
            } catch (err) {
              this.openErrorDialog(
                new Error(
                  `Failed to download CSV for offer '${this.offerCode}'`,
                ),
                { reload: false },
              );
            } finally {
              this.loaderService.hide();
            }
          } else if (result === 'export') {
            this.showDownloadCsvBtn = false;
            this.showExportCsvBtn = true;
            await this.exportCsv();
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
          } else if (returnTo === 'offers') {
            this.return();
          } else {
            this.refresh();
          }
        }
      });
  }

  openActionDialog(action, type) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            switch (type) {
              case 'CREATE':
                this.addOffer(this.offerPayload);
                break;
              case 'PUBLISH':
                this.publishOffer();
                break;
              case 'VALIDATE':
                this.validateOffer();
                break;
              case 'RETIRE':
              case 'DELETE':
                this.retireOffer();
                break;
              case 'DUPLICATE':
                this.duplicateOffer(this.getOfferCode());
                break;
            }
          }
        });
    }
  }

  async openOfferHistoryWindow(offerCode: string) {
    try {
      this.dialog.open(InfoModalComponent, {
        width: '50vw',
        data: {
          offerHistory: {
            storeCode: this.storeCode,
            offerCode,
          },
        },
      });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  duplicateOffer(offerCode) {
    this.loaderService.show();
    this.router.navigate(['/offers/create'], {
      queryParams: { offerType: this.offerType, prefill: offerCode },
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
      this.status !== StatusEnum.STG_RETD &&
      this.status !== StatusEnum.PROD_RETD &&
      ((this.status !== StatusEnum.STG_VALDN_FAIL &&
        this.status !== StatusEnum.STG_VALDN_PEND &&
        this.status !== StatusEnum.PROD_VALDN_FAIL &&
        this.status !== StatusEnum.PROD_VALDN_PEND &&
        this.status !== StatusEnum.STG_RETD &&
        this.status !== StatusEnum.STG_FAIL &&
        this.status !== StatusEnum.STG_RB_FAIL &&
        this.status !== StatusEnum.PROD_RETD &&
        this.status !== StatusEnum.PROD_FAIL &&
        this.status !== StatusEnum.PROD_RB_FAIL) ||
        this.offerType === OfferType.EXTENSION)
    );
  }

  showCreateBtn() {
    return (
      !this.checkPastCurrentDate(this.endDate) &&
      (this.status === StatusEnum.DFT || this.status === StatusEnum.STG_ERR_CRT)
    );
  }

  showHideCsvBtns() {
    const csvFileExists = this.csvFileName !== null;
    this.showDownloadCsvBtn =
      (this.status === StatusEnum.STG_VALDN_PASS ||
        this.status === StatusEnum.PROD_VALDN_PASS) &&
      this.offerCodeType === CodeType.BULK_UNIQUE_CODE &&
      csvFileExists;

    const csvFileDoesNotExist = this.csvFileName === null;
    this.showExportCsvBtn =
      (this.status === StatusEnum.STG_VALDN_PASS ||
        this.status === StatusEnum.PROD_VALDN_PASS) &&
      this.offerCodeType === CodeType.BULK_UNIQUE_CODE &&
      csvFileDoesNotExist;
  }

  showValidateBtn() {
    return (
      (this.status === StatusEnum.STG || this.status === StatusEnum.PROD) &&
      this.offerType !== OfferType.EXTENSION
    );
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

  isValidateButtonDisabled(): boolean {
    return (
      (this.offerCodeType === CodeType.BULK_UNIQUE_CODE &&
        (this.isInWorkflow === WorkflowAction.GENERATE_CSV ||
          Number(this.origTotalUniqueCodes) > Number(this.totalUniqueCodes))) ||
      (!!this.showDITButton &&
        (this.DITButtonColor === DITColorEnum.YELLOW ||
          this.DITButtonColor === DITColorEnum.RED))
    );
  }

  showPublishBtn(): boolean {
    return (
      (!this.checkPastCurrentDate(this.endDate) &&
        (this.status === StatusEnum.STG_VALDN_PASS ||
          this.status === StatusEnum.APV_APRVD ||
          this.status === StatusEnum.PROD_ERR_PUB)) ||
      (this.offerType === OfferType.EXTENSION && this.status === StatusEnum.STG)
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

  updateScrollableHeight() {
    const elem = this.element.nativeElement.querySelector(
      '.details-component-container-details',
    );
    const rec = elem.getBoundingClientRect();
    const height = window.innerHeight - (Math.floor(rec.top) + 30);
    elem.style.height = `${height}px`;
  }

  async refreshClickHandler() {
    try {
      if (
        this.isInWorkflow !== WorkflowAction.GENERATE_CSV &&
        Number(this.origTotalUniqueCodes) > Number(this.totalUniqueCodes)
      ) {
        this.showDownloadCsvBtn = false;
        this.showExportCsvBtn = false;
        await this.offersService
          .generateCodes(this.offerCode, this.storeCode)
          .toPromise();
      }
    } catch (err) {
      this.snackbarService.show(`${err.message}`, 'ERROR');
    } finally {
      this.snackbarService.show('Updating total unique codes count...', 'OK');
      await this.getOffer(true);
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
    } else if (this.isValidateButtonDisabled()) {
      return `[${this.validateDITTooltipMessage}]: ${VALIDATE_BUTTON_TOOLTIP_DISABLED}`;
    } else {
      return `[${this.validateDITTooltipMessage}]: ${VALIDATE_BUTTON_TOOLTIP}`;
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
        return `samocqa_acq_integrity_${offerCode}`;
      case OfferType.WINBACK:
        return `samocqa_win_integrity_${offerCode}`;
      case OfferType.RETENTION:
        return `samocqa_ret_integrity_${offerCode}`;
      case OfferType.EXTENSION:
        return `samocqa_ext_integrity_${offerCode}`;
    }
  }

  async startRecordDIT() {
    this.invalidStrings = [];
    const offer = this.buildOffer();
    if (this.glValidationError === null) {
      try {
        this.DITButtonColor = DITColorEnum.YELLOW;
        this.validateDITTooltipMessage =
          'VALIDATE action is blocked until DIT passed';
        this.detailPageTooltipText = 'Running test...';
        const validateResponse = await this.offersService
          .validateDIT(this.getOfferCode(), this.storeCode)
          .toPromise();

        const addResponse = await this.offersService
          .addDraft(offer)
          .toPromise();
        const updatedBy = localStorage.getItem('username');
        const deleteResponse = await this.offersService
          .archiveOffer(
            offer.offerCode,
            this.storeCode,
            updatedBy,
            this.offerType,
          )
          .toPromise();
        if (
          addResponse['success'] &&
          deleteResponse['success'] &&
          validateResponse['success']
        ) {
          await this.offersService
            .updateRecordDITStatus(this.getOfferCode(), this.storeCode, {
              dataIntegrityStatus: true,
              dataIntegrityErrorMessage: null,
            })
            .toPromise();
          this.glValidationWarning = validateResponse.data.warning;
          if (!this.glValidationWarning) {
            this.DITButtonColor = DITColorEnum.GREEN;
            this.validateDITTooltipMessage =
              'DIT passed, VALIDATE action can be safely run';
            this.detailPageTooltipText = 'Record DIT: passed';
          } else {
            this.DITButtonColor = DITColorEnum.BLUE;
            this.detailPageTooltipText = `Record DIT: ${this.glValidationWarning}`;
          }
        }
      } catch (err) {
        this.DITButtonColor = DITColorEnum.RED;
        let errorMessagePrefix =
          'Record DIT failed: Offer Validation is blocked due to failure of Data Integrity Test. Please try again later.';
        this.detailPageTooltipText = errorMessagePrefix;
        let errorString = 'Errors exist!';
        if (err.error.errors) {
          err.error.errors.forEach((field) => {
            this.invalidStrings?.push(field);
          });
        } else if (err.error.message) {
          // not a field-related error, so display it in place
          const error = removeXid(err.error.message);
          errorString = `Validation failed: ${error}`;
          this.detailPageTooltipText = errorMessagePrefix + ` Error: ${error}`;
        }
        await this.offersService
          .updateRecordDITStatus(this.getOfferCode(), this.storeCode, {
            dataIntegrityStatus: false,
            dataIntegrityErrorMessage: errorString,
          })
          .toPromise();
      }
    } else {
      this.DITButtonColor = DITColorEnum.RED;
      this.detailPageTooltipText = this.glValidationError;
    }
  }

  isInvalidField(fieldName: string) {
    return this.invalidStrings?.some((field) => {
      const fieldKeyNameArr = Object.keys(field);
      return fieldKeyNameArr[0] === fieldName;
    });
  }

  getInvalidErrorText(fieldName: string) {
    const result = this.invalidStrings?.find((field) => {
      const fieldKeyNameArr = Object.keys(field);
      return fieldKeyNameArr[0] === fieldName;
    });
    return !!result ? result[fieldName] : null;
  }

  buildOffer() {
    let offer: any;
    switch (this.offerType) {
      case OfferType.ACQUISITION:
      case OfferType.WINBACK:
        offer = this.acquisitionWinbackOffer();
        break;
      case OfferType.RETENTION:
        offer = this.retentionOffer();
        break;
    }

    return offer;
  }

  acquisitionWinbackOffer() {
    const offer: OfferRequestPayload = {
      offerTypeId: this.offerType,
      offerCode: this.generateRandomOfferCode(),

      planCode: this.plan,
      offerCodeType: this.offerCodeType,
      discountType: this.offer,
      offerName: this.offerName,
      offerHeader: this.offerHeader,
      offerBodyText: this.offerBodyText,
      offerBoldedText: this.offerBoldedText,
      offerAppliedBannerText: this.offerAppliedBannerText,
      offerBgImageUrl: this.offerBgImageUrl,
      discountDurationValue: this.offerDurationValue,
      discountDurationUnit: this.offerDurationUnit,

      legalDisclaimer: this.legalDisclaimer,
      welcomeEmailText: this.welcomeEmailText,
      offerBusinessOwner: this.offerBusinessOwner,
      noEndDate: this.noEndDate,
    };

    if (this.offerCodeType === CodeType.BULK_UNIQUE_CODE) {
      offer.totalUniqueCodes = this.totalUniqueCodes;
    }

    if (this.offer === DiscountType.FIXED) {
      offer.discountAmount = this.offerPrice;
    }

    if (this.endDate) {
      offer.endDateTime = this.endDateTime;
    }

    return offer;
  }

  retentionOffer() {
    const offer: OfferRequestPayload = {
      storeCode: this.storeCode,
      offerCodeType: CodeType.SINGLE_CODE,
      offerTypeId: OfferType.RETENTION,
      offerCode: this.generateRandomOfferCode(),

      eligiblePlans: this.eligiblePlansArr,
      createUpgradeOffer: this.createUpgradeOffer,
      upgradePlan: this.upgradePlan,
      usersOnPlans: this.usersOnPlansArr,
      addToPrimaryDefault: undefined, // legacy things
      addToSecondaryDefault: undefined, // legacy things

      discountType: this.offer,
      discountDurationType: this.discountDurationType,
      discountAmount: this.offerPrice,
      discountDurationValue: this.offerDurationValue,
      discountDurationUnit: this.offerDurationUnit,

      offerName: this.offerName,
      offerHeader: this.offerHeader,
      offerBodyText: this.offerBodyText,
      offerBoldedText: this.offerBoldedText,
      offerAppliedBannerText: this.offerAppliedBannerText,

      legalDisclaimer: this.legalDisclaimer,
      welcomeEmailText: this.welcomeEmailText,
      claimOfferTerms: this.claimOfferTerms,
      offerBusinessOwner: this.offerBusinessOwner,
      noEndDate: this.noEndDate,
    };

    if (this.endDate) {
      offer.endDateTime = this.endDateTime;
    }

    return offer;
  }

  ngOnDestroy() {
    this.routerSubscription.unsubscribe();
    this.resizeSubscription$.unsubscribe();
    if (this.dialogResponseSubscription !== undefined) {
      this.dialogResponseSubscription.unsubscribe();
    }
  }

  isRetention() {
    return this.offerType === OfferType.RETENTION;
  }

  isExtension() {
    return this.offerType === OfferType.EXTENSION;
  }
}
