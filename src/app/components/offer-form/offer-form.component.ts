import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { MatDialog } from '@angular/material/dialog';

import { Observable, Subject } from 'rxjs';
import { delay, filter, takeUntil } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

import { BaseComponent } from '../base/base.component';

import { LoaderService } from '../../service/loader.service';
import { OffersService } from '../../service/offers.service';
import { PlansService } from '../../service/plans.service';
import { ConfigurationService } from '../../service/configuration.service';

import { offerCodeValidator } from '../../validators/offer-code-validator';
import { OpenErrorDialogOptions } from '../../types/OpenErrorDialogOptions';

import { FIELDS_LOOKUP, PROCEED_MESSAGE } from '../../constants';
import {
  CodeType,
  DiscountType,
  DurationType,
  OfferType,
  StatusEnum,
} from '../../types/enum';
import { formatDateTime } from '../../helpers/date-utils';
import { OfferRequestPayload } from '../../types/payload';
import * as moment from 'moment';
import { WebOffersUtils } from '../../utils/web-offers.utils';

export const ROUTE_UPDATE_OFFER_CODE = 'offers/update/:offerCode';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

@Component({
  selector: 'app-offer-form',
  templateUrl: './offer-form.component.html',
  styleUrls: ['./offer-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class OfferFormComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public offerForm: FormGroup;
  public offerCodeErrorMsg: string;
  public heading: string;
  public offerTypes = this.offersService.offerTypes;
  public currentOfferType: number;

  public planPrice: number;
  public planBillingCycleDuration: number;
  public isUpdateRoute: boolean;
  public statusID: number;

  public OfferTypeEnum = OfferType;
  public offerCodeLength = 50;
  public showForm = false;
  public showOfferCodeLoader = false;

  public regionCode: string;

  public regionsLanguagesBinding: any[];

  public createUpgradeOfferShowed: boolean = false;
  public usersOnPlansShowed: boolean = false;

  private destroy$ = new Subject<void>();
  private duplicateOfferCode: string;
  private offerCode: string | null | undefined;
  private checkOfferCodeSuffixVariables = false;

  constructor(
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,

    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private offersService: OffersService,
    private plansService: PlansService,
    private configurationService: ConfigurationService,
    private webOffersUtils: WebOffersUtils,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.setIsUpdateRoute();
    this.setCurrentOfferType();

    this.setDuplicateOfferCode();

    this.getAllplans();
    this.listenForCreateUpgradeOfferBlockAppearance();
  }

  getAllplans() {
    this.loaderService.show('Getting existing plans...');
    const store: any = this.configurationService.getStore();

    this.plansService
      .getAllPlans(store)
      .pipe(delay(500), takeUntil(this.destroy$))
      .subscribe((allPlans) => {
        this.offersService.allPlans = allPlans;
        this.setRegionsAvailableLanguages();
      });
  }

  async setRegionsAvailableLanguages() {
    this.configurationService
      .fetchConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res: any) => {
          const regions: any[] = Object.values(res.data).map((region: any) => {
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
          });
          this.regionsLanguagesBinding = regions;

          this.createForm();
          this.offerTypeValueChanges();
          this.offerCodeValueChanges();
          this.updateOfferCodeDuration();
          this.setRegionCode();

          if (this.isUpdateRoute) {
            this.editOffer();
          } else {
            this.createOffer();
          }

          this.showForm = Boolean(this.offersService.allPlans.length);
        },
        (err) => this.openErrorDialog(err),
      );
  }

  setRegionCode(): void {
    this.regionCode = this.configurationService.getRegion()['id'];
  }

  setCurrentOfferType(): void {
    this.setOfferType(this.router.url);
    this.offersService.currentOfferTypeSubject$.next(
      this.currentOfferType as any,
    );
  }

  setDuplicateOfferCode(): void {
    this.duplicateOfferCode =
      this.route.snapshot.queryParamMap.get('prefill') || '';
    this.offersService.duplicateOfferCode = this.duplicateOfferCode;
  }

  getOfferCodeErrorMessage(): string {
    if (this.currentOfferType === OfferType.EXTENSION) {
      return environment.production
        ? 'Valid characters are "a-z", "0-9", or "_".'
        : 'Must start with "ext_samocqa_" and only contain these valid characters: "a-z", "0-9", or "_".';
    } else {
      return environment.production
        ? 'Valid characters are "a-z", "0-9", or "_".'
        : 'Must start with "samocqa_" and only contain these valid characters: "a-z", "0-9", or "_".';
    }
  }

  setIsUpdateRoute(): void {
    this.isUpdateRoute =
      this.route.routeConfig?.path === ROUTE_UPDATE_OFFER_CODE;
  }

  setOfferType(offerCode: string) {
    if (!!offerCode.includes('acq_') || !!offerCode.includes('acquisition_')) {
      this.currentOfferType = OfferType.ACQUISITION;
    } else if (
      !!offerCode.includes('win_') ||
      !!offerCode.includes('winback_')
    ) {
      this.currentOfferType = OfferType.WINBACK;
    } else if (
      !!offerCode.includes('ret_') ||
      !!offerCode.includes('retention_')
    ) {
      this.currentOfferType = OfferType.RETENTION;
    } else if (!!offerCode.includes('ext_')) {
      this.currentOfferType = OfferType.EXTENSION;
    }
  }

  createForm() {
    this.offerForm = this.fb.group({
      offerType: [this.currentOfferType, Validators.required],
      offerCode: [
        '',
        [Validators.required, Validators.pattern(this.getOfferCodePattern())],
        !this.isUpdateRoute
          ? [
              offerCodeValidator(
                this.http,
                this.configurationService.store.value.storeCode,
                this.currentOfferType,
              ),
            ]
          : [],
      ],
      acquisitionWinback: [
        { value: null, disabled: !(this.currentOfferType === 2 || 3) },
      ],
      retention: [{ value: null, disabled: !(this.currentOfferType === 4) }],
      extension: [{ value: null, disabled: !(this.currentOfferType === 5) }],
    });
  }

  getOfferCodePattern(): RegExp {
    if (this.currentOfferType === OfferType.EXTENSION) {
      return environment.production
        ? /^[a-z0-9_]+$/
        : /^ext_samocqa_[a-z0-9_]+$/;
    } else {
      return environment.production ? /^[a-z0-9_]+$/ : /^samocqa_[a-z0-9_]+$/;
    }
  }

  async checkOfferCodeValidation(offerCode: string) {
    this.offerForm.get('offerCode')?.disable();
    this.showOfferCodeLoader = true;
    let errorExist = false;
    try {
      await this.offersService
        .getOfferCodeValidationResult(
          offerCode,
          this.configurationService.store.value.storeCode,
          this.currentOfferType,
        )
        .toPromise();
    } catch (err) {
      if (err && err['status'] === 409) {
        errorExist = true;
      }
    } finally {
      if (errorExist) {
        const newCode = this.webOffersUtils.getNewOfferCode(offerCode);
        this.checkOfferCodeValidation(newCode);
      } else {
        this.offerForm.get('offerCode')?.setValue(offerCode);
        this.offerForm.get('offerCode')?.markAsDirty();
        if (offerCode.length > this.offerCodeLength) {
          // display maximum length error message
          this.offerForm.get('offerCode')?.markAsTouched();
        }
        this.showOfferCodeLoader = false;
        this.offerForm.get('offerCode')?.enable();
      }
    }
  }

  updateOfferCodeDuration() {
    this.offersService.currentDiscountType$
      .pipe(delay(500), takeUntil(this.destroy$))
      .subscribe((type) => {
        if (type && type === DiscountType.FIXED) {
          this.listenForCurrentDiscountAmount();
        } else if (type && type !== DiscountType.FIXED) {
          this.updateSuffixString('');
        }
      });
  }

  listenForCurrentDiscountAmount() {
    let discountAmount: number | null = null;
    let discountDuration: number | null = null;
    this.offersService.currentDiscountAmount$
      .pipe(delay(500), takeUntil(this.destroy$))
      .subscribe((amount) => {
        if (amount) {
          discountAmount = Math.round(amount * 100);
          this.offersService.currentDiscountDuration$
            .pipe(delay(500), takeUntil(this.destroy$))
            .subscribe((duration) => {
              if (duration) {
                if (duration.match('-')) {
                  discountDuration = Number(
                    duration.substring(0, duration.indexOf('-')),
                  );
                  this.updateSuffixString(
                    discountAmount + '_for_' + discountDuration + 'mo',
                  );
                } else if (duration === DurationType.SINGLE_USE) {
                  this.offersService.currentPlanDuration$
                    .pipe(delay(500), takeUntil(this.destroy$))
                    .subscribe((planDuration) => {
                      this.updateSuffixString(
                        discountAmount + '_for_' + planDuration + 'mo',
                      );
                    });
                }
              } else {
                this.updateSuffixString('');
              }
            });
        } else {
          this.updateSuffixString('');
        }
      });
  }

  isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  getOfferCodeDivTopValue(): string | undefined {
    switch (this.offerForm.get('offerType')?.value) {
      case OfferType.ACQUISITION:
      case OfferType.WINBACK:
        return '380px';
      case OfferType.RETENTION:
        let resultRetValue: number = 380;
        if (this.createUpgradeOfferShowed) {
          resultRetValue += 95;
          if (this.offerForm.get('offerCode')?.value) {
            resultRetValue += 30;
          }
        }
        if (this.usersOnPlansShowed) {
          resultRetValue += 95;
        }
        return resultRetValue + 'px';
      case OfferType.EXTENSION:
        let resultExtValue: number = 285;
        if (
          this.createUpgradeOfferShowed &&
          this.offerForm.get('offerCode')?.value
        ) {
          resultExtValue += 30;
        }
        return resultExtValue + 'px';
    }
  }

  listenForCreateUpgradeOfferBlockAppearance() {
    this.offersService.currentPlanDuration$
      .pipe(takeUntil(this.destroy$))
      .subscribe((planDuration) => {
        if (planDuration) {
          if (
            (this.currentOfferType === OfferType.RETENTION ||
              this.currentOfferType === OfferType.EXTENSION) &&
            planDuration >= 1
          ) {
            this.createUpgradeOfferShowed = true;
          } else {
            this.createUpgradeOfferShowed = false;
          }
        }
      });
  }

  updateSuffixString(durationString: string): void {
    if (this.route.routeConfig?.path !== 'offers/create') {
      return;
    }
    let previousCode = this.offerForm.get('offerCode')?.value;
    if (previousCode === '') {
      this.setOfferCodePrefix();
      previousCode = this.offerForm.get('offerCode')?.value;
    }
    if (previousCode && this.checkOfferCodeSuffixVariables) {
      let offerVersion = '';
      const offerCodeVersionIndex = previousCode.indexOf('_v');
      if (previousCode.match('_v\\d+$')) {
        offerVersion = previousCode.substring(offerCodeVersionIndex);
        previousCode = previousCode.substring(0, offerCodeVersionIndex);
      }
      let pricePos = previousCode.indexOf('_for_');
      if (pricePos >= 0) {
        const endPricePos = pricePos;
        while (
          pricePos > 0 &&
          this.isDigit(previousCode.charAt(pricePos - 1))
        ) {
          pricePos--;
        }
        if (endPricePos - pricePos > 5) {
          // it seems price was missing and number is a date, add extra '_'
          previousCode = previousCode.substring(0, endPricePos) + '_';
        } else {
          previousCode = previousCode.substring(0, pricePos);
        }
      }

      const newCode = previousCode + durationString + offerVersion;
      this.offerForm.get('offerCode')?.setValue(newCode);
      this.offerForm.get('offerCode')?.markAsDirty();
    }
    this.checkOfferCodeSuffixVariables = true;
  }

  setOfferCodePrefix(): void {
    if (this.offerForm.get('offerCode')?.value) {
      return;
    }
    const offerCodeQAPrefix = environment.production ? '' : 'samocqa_';
    let offerCodePrefix = environment.production ? '' : 'samocqa_';
    const dateString = moment().format('YYMMDD');
    switch (this.currentOfferType) {
      case OfferType.ACQUISITION:
        offerCodePrefix += 'acq_' + dateString + '_';
        break;
      case OfferType.WINBACK:
        offerCodePrefix += 'win_' + dateString + '_';
        break;
      case OfferType.RETENTION:
        offerCodePrefix += 'ret_' + dateString + '_';
        break;
      case OfferType.EXTENSION:
        offerCodePrefix = 'ext_' + offerCodeQAPrefix + dateString + '_';
        break;
    }

    this.offerForm.get('offerCode')?.setValue(offerCodePrefix);
  }

  offerTypeValueChanges() {
    this.offerForm
      .get('offerType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.currentOfferType = result;
        this.offersService.currentOfferTypeSubject$.next(
          this.currentOfferType as any,
        );
        this.offerForm.get('offerCode')?.setValue('');
        this.offerCodeLength = 50;
        this.offerForm.controls.offerCode.setValidators([
          Validators.required,
          Validators.pattern(this.getOfferCodePattern()),
        ]);
        if (!this.isUpdateRoute) {
          this.offerForm.controls.offerCode.setAsyncValidators([
            offerCodeValidator(
              this.http,
              this.configurationService.store.value.storeCode,
              this.currentOfferType,
            ),
          ]);
        }
        switch (result) {
          case this.OfferTypeEnum.ACQUISITION:
          case this.OfferTypeEnum.WINBACK:
            if (this.offerForm.get('acquisitionWinback')?.disabled) {
              this.offerForm.get('acquisitionWinback')?.enable();
              this.disableAndResetControls(['retention']);
              this.disableAndResetControls(['extension']);
            }
            break;
          case this.OfferTypeEnum.RETENTION:
            this.offerForm.get('retention')?.enable();
            this.disableAndResetControls(['acquisitionWinback']);
            this.disableAndResetControls(['extension']);
            this.createUpgradeOfferShowed = false;
            this.usersOnPlansShowed = false;
            break;
          case this.OfferTypeEnum.EXTENSION:
            this.offerForm.get('extension')?.enable();
            this.disableAndResetControls(['acquisitionWinback']);
            this.disableAndResetControls(['retention']);
            this.listenForCurrentDiscountAmount();
            this.createUpgradeOfferShowed = false;
            this.usersOnPlansShowed = false;
            break;
        }
      });
  }

  offerCodeValueChanges() {
    this.offerForm
      .get('offerCode')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((code) => {
        this.offersService.currentOfferCodeSubject$.next(code);
      });
    this.offersService.currentOfferCodeLimit$
      .pipe(takeUntil(this.destroy$))
      .subscribe((len) => {
        if (
          this.currentOfferType === this.OfferTypeEnum.RETENTION ||
          this.currentOfferType === this.OfferTypeEnum.EXTENSION
        ) {
          this.offerCodeLength = len;
          const offerCode = this.offerForm.get('offerCode');
          if (offerCode?.value.length > len) {
            offerCode?.markAsTouched();
          }
          if (len === 50) {
            this.usersOnPlansShowed = false;
          } else {
            this.usersOnPlansShowed = true;
          }
        }
      });
  }

  disableAndResetControls(controls: string[]): void {
    controls.forEach((control) => {
      this.offerForm.get(control)?.disable();
      this.offerForm.get(control)?.reset();
    });
  }

  editOffer(): void {
    this.heading = 'EDIT OFFER';
    this.offerCode = this.route.snapshot.paramMap.get('offerCode');
    this.loaderService.show('Retrieving offer details...');
    this.fetchOffer().finally(() => {
      this.loaderService.hide();
    });
  }

  createOffer(): void {
    this.heading = 'NEW OFFER';
    this.statusID = 0;
    this.offersService.statusId = this.statusID;
    if (this.duplicateOfferCode) {
      this.duplicateOffer().finally(() => {
        this.loaderService.hide();
      });
    } else {
      this.loaderService.hide();
    }
  }

  async duplicateOffer() {
    this.loaderService.show('Duplicating offer...');
    try {
      const storeCode = this.configurationService.getStore().storeCode;
      const data = await this.offersService
        .getOffer(this.duplicateOfferCode, storeCode, this.currentOfferType)
        .toPromise();

      this.setFormData(data);
    } catch (err) {
      this.openErrorDialog(err, {
        navigateTo: '/offers',
      } as OpenErrorDialogOptions);
    }
  }

  openBackDialog() {
    if (this.offerForm.dirty) {
      super
        .openBack()
        .afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe((result) => {
          if (result) {
            this.navigateBack();
          }
        });
    } else {
      this.navigateBack();
    }
  }

  navigateBack() {
    if (this.isUpdateRoute && !this.route.snapshot.queryParams.offersPage) {
      this.router.navigate([`/offers/detail/${this.offerCode}`]);
    } else {
      this.router.navigate(['/offers']);
    }
  }

  async fetchOffer() {
    try {
      const storeCode = this.configurationService.getStore().storeCode;
      const data = await this.offersService
        .getOffer(this.offerCode, storeCode, this.currentOfferType)
        .toPromise();

      this.statusID = data.statusId;
      this.offersService.statusId = this.statusID;

      this.setFormData(data);
    } catch (err) {
      super.openErrorDialog(err);
    }
  }

  checkOfferCode() {
    const offerCodeInput = document.querySelectorAll(
      '[formcontrolname="offerCode"]',
    )[0] as HTMLInputElement;
    (offerCodeInput as HTMLInputElement).focus();
    (offerCodeInput as HTMLInputElement).blur();
  }

  setFormData(data: any) {
    const patchData: any = {
      offerType: data.OfferType?.id,
      offerCode: data.offerCode,
    };

    switch (patchData.offerType) {
      case OfferType.RETENTION:
        patchData.retention = data;
        break;
      case OfferType.EXTENSION:
        patchData.extension = data;
        break;
      default:
        patchData.acquisitionWinback = data;
        break;
    }

    if (this.duplicateOfferCode) {
      this.checkOfferCodeValidation(this.duplicateOfferCode);
    }

    this.checkOfferCode();
    this.offerForm.patchValue(patchData);

    if (!this.duplicateOfferCode) {
      this.setupDisabledFields();
    }
  }

  setupDisabledFields() {
    ['offerType', 'offerCode'].forEach((control) => {
      if (this.isFieldDisabled(control)) {
        this.offerForm.get(control)?.disable({ emitEvent: false });
      }
    });
  }

  isFieldDisabled(formField: string) {
    return !!FIELDS_LOOKUP[formField].includes(this.statusID);
  }

  openResponseDialog(response) {
    super
      .openResponse(response)
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.router.navigate(['/offers/detail', this.offerCode]);
        }
      });
  }

  acquisitionWinbackOffer() {
    const fieldData = this.offerForm.get('acquisitionWinback')?.value;

    const offer: OfferRequestPayload = {
      offerTypeId: this.offerForm.get('offerType')?.value,
      offerCode: this.offerForm.get('offerCode')?.value,

      planCode: fieldData.plan,
      offerCodeType: fieldData.offerCodeType,
      discountType: fieldData.discountType,
      offerName: fieldData.offerName,
      offerHeader: fieldData.offerHeader,
      offerBodyText: fieldData.offerBodyText,
      offerBoldedText: fieldData.offerBoldedText,
      offerAppliedBannerText: fieldData.offerAppliedBannerText,
      offerBgImageUrl: fieldData.offerBgImageUrl,

      legalDisclaimer: fieldData.legalDisclaimer,
      welcomeEmailText: fieldData.welcomeText,
      offerBusinessOwner: fieldData.offerBusinessOwner,
      noEndDate: fieldData.noEndDate,
    };

    if (fieldData.offerCodeType === CodeType.BULK_UNIQUE_CODE) {
      offer.totalUniqueCodes = Number(fieldData.totalUniqueCodes);
    }

    if (fieldData.discountType === DiscountType.FIXED) {
      offer.discountAmount = Number(fieldData.discountAmount);
    }

    if (fieldData.discountDurationType === DurationType.CUSTOMIZE) {
      offer.discountDurationValue = Number(fieldData.discountDurationValue);
      offer.discountDurationUnit = fieldData.discountDurationUnit;
    } else {
      const arrayValue = fieldData.discountDurationType.split('-');
      offer.discountDurationValue = Number(arrayValue[0]);
      offer.discountDurationUnit = arrayValue[1];
    }

    if (fieldData.endDate) {
      offer.endDateTime = formatDateTime(fieldData.endDate, fieldData.endTime);
    }

    this.offerCode = offer.offerCode;

    return offer;
  }

  retentionOffer() {
    const fieldData = this.offerForm.get('retention')?.value;

    const placeholderClaimOfferTerms = this.offersService.getRegionClaimOfferTermsPlaceholder(
      this.regionCode,
    );
    const offerCodeClaimOfferTerms = this.offersService.getRegionClaimOfferTermsPlaceholder(
      this.regionCode,
      this.offerForm.get('offerCode')?.value,
    );
    const sameUpgradePlan = fieldData.eligiblePlans.includes(
      fieldData.upgradePlan,
    );
    const offer: OfferRequestPayload = {
      storeCode: this.configurationService.store.value.storeCode,
      offerCodeType: CodeType.SINGLE_CODE,
      offerTypeId: OfferType.RETENTION,
      offerCode: this.offerForm.get('offerCode')?.value,

      eligiblePlans: fieldData.eligiblePlans,
      createUpgradeOffer: fieldData.createUpgradeOffer,
      upgradePlan: fieldData.upgradePlan,
      usersOnPlans: fieldData.usersOnPlans,
      addToPrimaryDefault: fieldData.addToPrimaryDefault,
      addToSecondaryDefault: fieldData.addToSecondaryDefault,
      discountType: fieldData.discountType,
      discountDurationType: fieldData.discountDurationType,

      offerName: fieldData.offerName,
      offerHeader: fieldData.offerHeader,
      offerBodyText: fieldData.offerBodyText,
      offerBoldedText: fieldData.offerBoldedText,
      offerAppliedBannerText: fieldData.offerAppliedBannerText,

      legalDisclaimer: fieldData.legalDisclaimer,
      claimOfferTerms:
        placeholderClaimOfferTerms === fieldData.claimOfferTerms
          ? offerCodeClaimOfferTerms
          : fieldData.claimOfferTerms,
      welcomeEmailText: fieldData.welcomeEmailText || fieldData.welcomeText,
      offerBusinessOwner: fieldData.offerBusinessOwner,
      noEndDate: fieldData.noEndDate,

      useUpgradePlan: !!fieldData.createUpgradeOffer && !sameUpgradePlan,
    };

    if (fieldData.discountType === DiscountType.FIXED) {
      offer.discountAmount = Number(fieldData.discountAmount);
    } else if (fieldData.discountType === DiscountType.PERCENT) {
      offer.discountAmount = Number(fieldData.discountPercents);
    }

    if (
      fieldData.discountDurationType === DurationType.CUSTOMIZE ||
      fieldData.discountDurationType === DurationType.TEMPORAL
    ) {
      offer.discountDurationType = DurationType.TEMPORAL;
      offer.discountDurationValue = Number(fieldData.discountDurationValue);
      offer.discountDurationUnit = fieldData.discountDurationUnit;
    } else if (
      fieldData.discountDurationType !== DurationType.SINGLE_USE &&
      fieldData.discountDurationType !== DurationType.FOREVER
    ) {
      offer.discountDurationType = DurationType.TEMPORAL;
      const arrayValue = fieldData.discountDurationType.split('-');
      offer.discountDurationValue = Number(arrayValue[0]);
      offer.discountDurationUnit = arrayValue[1];
    }

    if (fieldData.endDate) {
      offer.endDateTime = formatDateTime(fieldData.endDate, fieldData.endTime);
    }

    this.offerCode = offer.offerCode;

    return offer;
  }

  extensionOffer() {
    const fieldData = this.offerForm.get('extension')?.value;
    const offer: any = {
      storeCode: this.configurationService.store.value.storeCode,
      offerTypeId: OfferType.EXTENSION,
      offerCode: this.offerForm.get('offerCode')?.value,
      eligibleCharges: fieldData.eligibleCharges,
      createUpgradeOffer: fieldData.createUpgradeOffer,
      upgradePlan: !!fieldData.createUpgradeOffer
        ? fieldData.eligibleCharges[0]
        : '',
      usersOnPlans: !!fieldData.createUpgradeOffer ? ['-'] : [],
      discountAmount: fieldData.discountAmount,
      durationType: fieldData.durationType,
      durationAmount: fieldData.durationAmount,
      durationUnit: fieldData.durationUnit,
      offerTitle: fieldData.offerTitle,
      offerDescription: fieldData.offerDescription,
      offerTerms: fieldData.offerTerms,
      bannerText: fieldData.bannerText,
      offerBusinessOwner: fieldData.offerBusinessOwner,
      useUpgradePlan: fieldData.createUpgradeOffer,
    };

    if (!!fieldData.createUpgradeOffer) {
      offer.upgradeOfferCode = `${
        this.offerForm.get('offerCode')?.value
      }_upgrade`;
    }

    if (
      fieldData.durationType === DurationType.CUSTOMIZE ||
      fieldData.durationType === DurationType.TEMPORAL
    ) {
      offer.durationType = DurationType.TEMPORAL;
      offer.durationAmount = Number(fieldData.durationAmount);
      offer.durationUnit = fieldData.durationUnit;
    } else if (
      fieldData.durationType !== DurationType.SINGLE_USE &&
      fieldData.durationType !== DurationType.FOREVER
    ) {
      offer.durationType = DurationType.TEMPORAL;
      const arrayValue = fieldData.durationType.split('-');
      offer.durationAmount = Number(arrayValue[0]);
      offer.durationUnit = arrayValue[1];
    }

    this.offerCode = offer.offerCode;
    return offer;
  }

  buildOffer() {
    let offer: any;
    switch (this.currentOfferType) {
      case OfferType.ACQUISITION:
      case OfferType.WINBACK:
        offer = this.acquisitionWinbackOffer();
        break;
      case OfferType.RETENTION:
        offer = this.retentionOffer();
        break;
      case OfferType.EXTENSION:
        offer = this.extensionOffer();
        break;
    }
    return offer;
  }

  showSaveBtn(): boolean {
    return this.route.routeConfig?.path === 'offers/create';
  }

  showUpdateBtn(): boolean {
    return (
      (this.route.routeConfig?.path === ROUTE_UPDATE_OFFER_CODE &&
        this.statusID !== StatusEnum.STG_ERR_CRT &&
        this.statusID <= StatusEnum.STG_VALDN_PASS &&
        this.statusID !== StatusEnum.STG_VALDN_PEND) ||
      (this.route.routeConfig?.path === ROUTE_UPDATE_OFFER_CODE &&
        this.statusID > StatusEnum.PROD_PEND &&
        this.statusID !== StatusEnum.PROD_ERR_PUB &&
        this.statusID <= StatusEnum.PROD_VALDN_PASS &&
        this.statusID !== StatusEnum.PROD_VALDN_PEND)
    );
  }

  showCreateBtn(): boolean {
    return (
      (this.route.routeConfig?.path === 'offers/create' &&
        this.statusID <= StatusEnum.STG_VALDN_PASS &&
        this.statusID !== StatusEnum.STG_VALDN_PEND) ||
      (this.route.routeConfig?.path === ROUTE_UPDATE_OFFER_CODE &&
        this.statusID === StatusEnum.STG_ERR_CRT)
    );
  }

  showPublishBtn(): boolean {
    return (
      this.route.routeConfig?.path === ROUTE_UPDATE_OFFER_CODE &&
      this.statusID === StatusEnum.PROD_ERR_PUB
    );
  }

  save(): void {
    const action: DialogAction = {
      message: PROCEED_MESSAGE + 'SAVE ?',
      action: 'prompt',
    };
    this.openActionDialog(action).subscribe(() => {
      let offer = this.buildOffer();
      offer.updatedBy = localStorage.getItem('username');
      this.addDraft(offer);
    });
  }

  async addDraft(offer) {
    try {
      this.loaderService.show();
      const skipValidation = offer.offerTypeId === OfferType.EXTENSION;
      const response = await this.offersService
        .addDraft(offer, skipValidation)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  create(): void {
    const action: DialogAction = {
      message: PROCEED_MESSAGE + 'CREATE ?',
      action: 'prompt',
    };
    this.openActionDialog(action).subscribe(() => {
      let offer = this.buildOffer();
      offer.createdBy = localStorage.getItem('username');
      offer.updatedBy = localStorage.getItem('username');
      this.addOffer(offer);
    });
  }

  async addOffer(offer) {
    try {
      this.loaderService.show();
      const skipValidation = offer.offerTypeId === OfferType.EXTENSION;
      const response = await this.offersService
        .createOffer(offer, skipValidation)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      if (
        err.status === 422 &&
        err.error?.message?.toLowerCase().includes('validation failed') &&
        err.error?.errors?.length > 0
      ) {
        this.openErrorDialog(err, {
          reload: false,
        } as OpenErrorDialogOptions);
      } else {
        this.openErrorDialog(err, {
          navigateTo: `/offers/detail/${offer.offerCode}`,
          errorMessage: `The offer is saved as Draft`,
        } as OpenErrorDialogOptions);
      }
    }
  }

  publish(): void {
    const action: DialogAction = {
      message: PROCEED_MESSAGE + 'PUBLISH ?',
      action: 'prompt',
    };

    this.openActionDialog(action).subscribe(() => {
      let offer = this.buildOffer();
      offer.updatedBy = localStorage.getItem('username');
      this.publishOffer(offer);
    });
  }

  async publishOffer(offer) {
    try {
      this.loaderService.show();
      const storeCode = this.configurationService.getStore().storeCode;
      const updatedBy = localStorage.getItem('username');
      const response = await this.offersService
        .publishOffer(
          offer.offerCode,
          storeCode,
          updatedBy,
          this.currentOfferType,
        )
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err, {
        navigateTo: `/offers/detail/${offer.offerCode}`,
        errorMessage: `The offer failed to publish to PROD`,
      } as OpenErrorDialogOptions);
    }
  }

  update(): void {
    const action: DialogAction = {
      message: PROCEED_MESSAGE + 'UPDATE ?',
      action: 'prompt',
    };

    if (this.statusID !== StatusEnum.DFT) {
      action.footNote =
        'REMINDER: Contentful text updates may take\n' +
        'approximately 20 minutes to appear on the website.';
    }

    this.openActionDialog(action).subscribe(() => {
      const { offerCode, planCode, ...rest } = this.buildOffer();
      rest.updatedBy = localStorage.getItem('username');
      this.updateOffer(rest);
    });
  }

  async updateOffer(offer) {
    try {
      this.loaderService.show();
      const storeCode = this.configurationService.getStore().storeCode;
      const response = await this.offersService
        .updateOffer(
          offer,
          this.offerCode,
          storeCode,
          this.currentOfferType,
          this.currentOfferType === OfferType.EXTENSION,
        )
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err, {
        navigateTo: `/offers/detail/${this.offerCode}`,
      } as OpenErrorDialogOptions);
    }
  }

  openActionDialog(action: DialogAction): Observable<boolean> {
    const dialogActionRef = super.openAction(action);
    return dialogActionRef.afterClosed().pipe(
      filter((res) => Boolean(res)),
      takeUntil(this.destroy$),
    );
  }

  isSaveButtonDisabled(): boolean {
    return (
      this.offerForm.invalid ||
      !this.offerForm.dirty ||
      this.offerForm.pending ||
      this.showOfferCodeLoader
    );
  }

  isPublishButtonDisabled(): boolean {
    return this.offerForm.invalid || !this.offerForm.dirty;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
