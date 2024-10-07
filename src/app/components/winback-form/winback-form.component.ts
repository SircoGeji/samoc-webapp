import { Component, forwardRef, Input, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormBuilder,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import * as pluralize from 'pluralize';
import * as regenerate from 'regenerate';
import { MatDialog } from '@angular/material/dialog';

import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { ImageValidator } from '../../validators/image-validator';
import { validatePromoPrice } from '../../validators/promo-price-validator';
import { validateDiscountDurationValue } from '../../validators/custom-discount-duration-value-validators';
import { validateEndDate } from '../../validators/custom-datetime-validators';

import { InfoModalComponent } from '../info-modal/info-modal.component';

import { Dropdown } from '../../types/payload';
import {
  CodeType,
  DiscountType,
  OfferType,
  StatusEnum,
} from '../../types/enum';
import { DEFAULT_TIMEZONE, FIELDS_LOOKUP } from '../../constants';

import { ImageLoaderService } from '../../service/image-loader.service';
import { OffersService } from '../../service/offers.service';
import { OfferTemplates, Template } from '../../helpers/offer_templates';
import { ConfigurationService } from '../../service/configuration.service';
import { DurationType } from '../../types/enum';

let VALID_TEXT_FIELD_REGEXP: RegExp;

@Component({
  selector: 'app-winback-form',
  templateUrl: './winback-form.component.html',
  styleUrls: ['./winback-form.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WinbackFormComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => WinbackFormComponent),
      multi: true,
    },
  ],
})
export class WinbackFormComponent
  implements OnInit, OnDestroy, ControlValueAccessor, Validator {
  @Input() regionCode: string;
  @Input() regionsLanguagesBinding: any[];
  public winbackForm: FormGroup;

  public offerCodeTypes = this.offersService.offerCodeTypes;
  public offers = this.offersService.offers;

  public typesHolder: Dropdown[];
  public durationTypes: Dropdown[];
  public durationUnits: Dropdown[];
  public tzName = DEFAULT_TIMEZONE;

  public generalTextFieldPatternErrMsg =
    'Text must start and only contain letters of English, French, German, Swedish, Spanish, Portuguese, Italian or Dutch languages; numbers or special symbols';

  public bgImgUrl: string;
  public planPrice: number;
  public durationValueError: string;
  public planBillingCycleDuration: number;
  public plans: any; // PlanResponsePayload[];
  public discountTypeEnum = DiscountType;
  public offerBoldedTextMsg: string;

  public nameLength = 255;
  public headerLength = 150;
  public bodyTxtLength = 500;
  public boldedTxtLength = 150;
  public bannerTxtLength = 150;
  public bgImageUrlLength = 255;
  public disclaimerLength = 500;
  public emailTxtLength = 255;
  public ownerLength = 50;

  private destroy$ = new Subject<void>();
  private planCode: string;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private offersService: OffersService,
    private imgLoader: ImageLoaderService,
    private configurationService: ConfigurationService,
  ) {}

  public onTouched: () => void = () => {};

  writeValue(val: any): void {
    val && this.setFormData(val);
  }

  registerOnChange(fn: any): void {
    this.winbackForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        fn(this.winbackForm.getRawValue());
      });
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.winbackForm.disable() : this.winbackForm.enable();
  }

  validate(c: AbstractControl): ValidationErrors | null {
    return this.winbackForm.valid
      ? null
      : {
          invalidForm: { valid: false, message: 'winback form are invalid' },
        };
  }

  ngOnInit(): void {
    this.getValidTextFieldRegExp();
    this.setPlans();
    this.createForm();
    this.planValueChanges();
    this.currentOfferTypeValueChanges();
    this.offerCodeTypeValueChanges();
    this.discountTypeValueChanges();
    this.discountAmountValueChanges();
    this.discountDurationTypeValueChanges();
    this.discountDurationValueChanges();
    this.offerBgImageUrlStatusChanges();
    this.endDateValueChanges();
    this.setPlaneCode();
  }

  getValidTextFieldRegExp() {
    VALID_TEXT_FIELD_REGEXP = this.offersService.getValidTextFieldRegExp();
  }

  setPlaneCode(): void {
    this.planCode = this.route.snapshot.queryParamMap.get('planCode') || '';
    this.winbackForm.get('plan')?.setValue(this.planCode);
  }

  setPlans() {
    this.plans = this.offersService.allPlans.filter((plan) => {
      this.formatPlanDetails(plan);
      return plan.statusId !== StatusEnum.DFT;
    });

    this.plans.sort((a, b) => a.billingCycleDuration - b.billingCycleDuration || a.price - b.price);
  }

  formatPlanDetails(plan) {
    plan.billingCycleUnit = pluralize(
      plan.billingCycleUnit,
      plan.billingCycleDuration,
    );
    if (plan.trialDuration == null || plan.trialDuration === 0) {
      plan['planDetails'] = `$${plan.price}/${pluralize(
        plan.billingCycleUnit,
        plan.billingCycleDuration,
        plan.billingCycleDuration > 1,
      )}, no trial`;
    } else {
      plan.trialUnit = plan.trialUnit.endsWith('s')
        ? plan.trialUnit.slice(0, -1)
        : plan.trialUnit;
      plan['planDetails'] = `$${plan.price}/${pluralize(
        plan.billingCycleUnit,
        plan.billingCycleDuration,
        plan.billingCycleDuration > 1,
      )}, ${pluralize(plan.trialUnit, plan.trialDuration, true)} trial`;
    }
  }

  planValueChanges() {
    this.winbackForm
      .get('plan')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((planCode) => {
        const currentPlan = this.plans.filter((plan) => {
          return plan.planCode === planCode;
        });

        this.planPrice = currentPlan[0] ? currentPlan[0]['price'] : 0;

        this.planBillingCycleDuration = currentPlan[0]
          ? currentPlan[0]['billingCycleDuration']
          : 0;

        this.setDiscountDurationList(currentPlan[0]);

        this.resetControls([
          'discountAmount',
          'discountDurationType',
          'discountDurationValue',
          'discountDurationUnit',
        ]);

        this.setDiscountOptions(this.winbackForm.get('discountType')?.value);
      });
  }

  setDiscountDurationList(plan) {
    const result: Dropdown[] = [];
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

      if (this.checkControlValue('discountType', this.discountTypeEnum.FIXED)) {
        this.durationTypes = result;
      }
    }
  }

  createForm(): void {
    this.winbackForm = this.fb.group({
      plan: ['', Validators.required],
      offerCodeType: [''],
      totalUniqueCodes: [
        '',
        [Validators.required, Validators.min(1), Validators.max(99999)],
      ],
      discountType: [''],
      discountAmount: [''],
      discountDurationType: ['', Validators.required],
      discountDurationValue: [''],
      discountDurationUnit: ['', Validators.required],
      offerName: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerHeader: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerBodyText: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerBoldedText: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerAppliedBannerText: [
        '',
        [Validators.pattern(VALID_TEXT_FIELD_REGEXP)],
      ],
      offerBgImageUrl: [
        '',
        {
          asyncValidators: [
            ImageValidator.dimsValidator(this.imgLoader),
            ImageValidator.validateUrlPattern(),
          ],
        },
      ],
      legalDisclaimer: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      welcomeText: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerBusinessOwner: [
        localStorage.email ? localStorage.email : '',
        [Validators.pattern(VALID_TEXT_FIELD_REGEXP)],
      ],
      endDate: ['', validateEndDate()],
      endTime: [{ value: '', disabled: true }],
      noEndDate: [false],
    });
  }

  setFormData(data) {
    this.winbackForm.patchValue(
      {
        plan: data.Plan?.planCode,
        offerCodeType: data.offerCodeType,
        totalUniqueCodes:
          data.statusId === StatusEnum.DFT || data.totalUniqueCodes === null
            ? data.totalUniqueCodes
            : data.totalUniqueCodes - 1,
        discountType: data.discountType,
        discountAmount: data.discountAmount,
        discountDurationType: this.determineCustomize(data),
        discountDurationValue: data.discountDurationValue,
        discountDurationUnit: data.discountDurationUnit,
        offerName: data.offerName || '',
        offerHeader: data.offerHeader || '',
        offerBodyText: data.offerBodyText || '',
        offerBoldedText: this.patchOfferBoldedText(data.offerBoldedText) || '',
        offerAppliedBannerText: data.offerAppliedBannerText || '',
        offerBgImageUrl: data.offerBgImageUrl || '',
        legalDisclaimer: data.legalDisclaimer || '',
        welcomeText: data.welcomeEmailText || '',
        offerBusinessOwner: data.offerBusinessOwner,
        endDate: data.endDate ? new Date(data.endDate) : null,
        endTime: data.endTime || '',
        noEndDate: data.noEndDate,
      },
      {
        emitEvent: Boolean(this.offersService.duplicateOfferCode),
      },
    );

    this.planPrice = data.Plan.price;
    this.planBillingCycleDuration = data.Plan.billingCycleDuration;

    this.showBgImg();
    this.setDiscountDurationList(data.Plan);
    this.setDiscountOptions(data.discountType);

    if (data.offerCodeType === CodeType.SINGLE_CODE) {
      this.winbackForm.get('totalUniqueCodes')?.disable({ emitEvent: false });
    }

    if (!this.offersService.duplicateOfferCode) {
      this.setupDisabledFields();
    }
  }

  setupDisabledFields() {
    Object.keys(this.winbackForm.controls).forEach((control) => {
      if (this.isFieldDisabled(control)) {
        this.winbackForm.get(control)?.disable({ emitEvent: false });
      }
    });
  }

  isFieldDisabled(formField: string) {
    return !!FIELDS_LOOKUP[formField].includes(this.offersService.statusId);
  }

  determineCustomize(data) {
    let durationType =
      data.discountDurationValue + '-' + data.discountDurationUnit;
    let type;
    if (data.discountType === this.discountTypeEnum.TRIAL) {
      type = this.offersService.freeTrialDurationTypes.filter((obj) => {
        return obj['value'] === durationType;
      });
    } else {
      type = this.offersService.priceDurationTypes.filter((obj) => {
        return obj['value'] === durationType;
      });
    }
    if (type.length === 0) {
      durationType = DurationType.CUSTOMIZE;
    }
    return durationType;
  }

  formatOfferBoldedText() {
    return `<span>${this.winbackForm.get('offerBoldedText')?.value}</span>`;
  }

  patchOfferBoldedText(total) {
    if (total) {
      return total.replace('<span>', '').replace('</span>', '');
    } else {
      return '';
    }
  }

  currentOfferTypeValueChanges(): void {
    const offerCodeType = this.winbackForm.get('offerCodeType');
    this.offersService.currentOfferType$
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (res === OfferType.WINBACK) {
          offerCodeType?.setValue(CodeType.SINGLE_CODE, { emitEvent: true });
          offerCodeType?.disable({ emitEvent: false });
          this.disableAndResetControls(['totalUniqueCodes']);
        } else {
          offerCodeType?.reset(null, { emitEvent: false });
          offerCodeType?.enable({ emitEvent: false });
          this.enableControls(['totalUniqueCodes']);
        }
      });
  }

  offerCodeTypeValueChanges(): void {
    this.winbackForm
      .get('offerCodeType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result === CodeType.BULK_UNIQUE_CODE) {
          this.enableControls(['totalUniqueCodes']);
        } else {
          this.disableAndResetControls(['totalUniqueCodes']);
        }
      });
  }

  discountTypeValueChanges(): void {
    this.winbackForm
      .get('discountType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.resetControls([
          'discountAmount',
          'discountDurationType',
          'discountDurationValue',
          'discountDurationUnit',
        ]);

        this.updateTemplates();

        this.setDiscountOptions(result);
        this.offersService.currentOfferType$
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (res === OfferType.ACQUISITION || res === OfferType.WINBACK) {
              this.offersService.currentDiscountTypeSubject$.next(result);
            }
          });
      });
  }

  discountAmountValueChanges(): void {
    this.winbackForm
      .get('discountAmount')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.updateTemplates();
        if (
          this.getControlValue('discountType') === this.discountTypeEnum.FIXED
        ) {
          this.offersService.currentOfferType$
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
              if (
                (res === OfferType.ACQUISITION || res === OfferType.WINBACK) &&
                result <= 99.99
              ) {
                this.offersService.currentDiscountAmountSubject$.next(result);
              }
            });
        }
      });
  }

  setDiscountOptions(type: string): void {
    switch (type) {
      case this.discountTypeEnum.TRIAL:
        this.durationTypes = this.offersService.freeTrialDurationTypes;
        this.durationUnits = this.offersService.freeTrialDurationUnits;
        this.durationValueError = 'Please enter an integer from 1 to 365';
        this.setControlValidators('discountDurationValue', [
          Validators.required,
          Validators.min(1),
          Validators.max(365),
        ]);

        this.disableAndResetControls(['welcomeText']);
        this.disableAndResetControls(['discountAmount']);
        break;
      case this.discountTypeEnum.FIXED:
        this.durationTypes = this.typesHolder;
        this.durationUnits = this.offersService.priceDurationUnits;
        this.durationValueError = 'Please enter an integer from 1 to 24';
        this.setControlValidators('discountDurationValue', [
          Validators.required,
          Validators.min(1),
          Validators.max(24),
          validateDiscountDurationValue(this.planBillingCycleDuration),
        ]);

        this.enableControls(['welcomeText']);
        this.enableControls(['discountAmount']);
        this.setControlValidators('discountAmount', [
          Validators.required,
          Validators.pattern('[0-9]+(.[0-9][0-9]?)?'),
          validatePromoPrice(this.planPrice),
        ]);
        break;
    }
  }

  discountDurationTypeValueChanges(): void {
    this.winbackForm
      .get('discountDurationType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.updateTemplates();
        if (result === DurationType.CUSTOMIZE) {
          this.enableControls([
            'discountDurationValue',
            'discountDurationUnit',
          ]);
        } else {
          this.disableAndResetControls([
            'discountDurationValue',
            'discountDurationUnit',
          ]);
        }

        if (
          this.getControlValue('discountType') === this.discountTypeEnum.FIXED
        ) {
          this.offersService.currentOfferType$
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
              if (res === OfferType.ACQUISITION || res === OfferType.WINBACK) {
                this.offersService.currentDiscountDurationSubject$.next(result);
              }
            });
        }
      });
  }

  discountDurationValueChanges() {
    this.winbackForm
      .get('discountDurationValue')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.updateTemplates();
        if (
          result &&
          this.getControlValue('discountType') === DiscountType.FIXED &&
          this.getControlValue('discountDurationType') === DurationType.CUSTOMIZE
        ) {
          this.offersService.currentOfferType$
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
              if (res === OfferType.ACQUISITION || res === OfferType.WINBACK) {
                this.offersService.currentDiscountDurationSubject$.next(
                  result + '-',
                );
              }
            });
        }
      });
  }

  endDateValueChanges(): void {
    const endDate: any = this.winbackForm.get('endDate');
    const endTime: any = this.winbackForm.get('endTime');

    endDate.valueChanges
      .pipe(
        filter(() => endDate.valid),
        takeUntil(this.destroy$),
      )
      .subscribe((val) => {
        if (val != null) {
          endTime.setValue('11:59 PM');
        } else {
          endTime.reset();
        }
      });
  }

  offerBgImageUrlStatusChanges(): void {
    this.winbackForm
      .get('offerBgImageUrl')
      ?.statusChanges.pipe(
        filter((status) => status === 'VALID' || status === 'INVALID'),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.showBgImg();
        // Updating parent form status.
        // It is needed because an async validator
        // is used for offerBgImageUrl field.
        this.winbackForm.updateValueAndValidity({ onlySelf: true });
      });
  }

  removeNewlines(event, control: AbstractControl, str: string | null = null) {
    if (!str) { str = event.clipboardData.getData('text/plain'); }
    if (str !== str?.trim()) {
      const newData: string = control.value + str;
      control.setValue(newData);
      event.preventDefault();
    }
  }

  disableAndResetControls(controls: string[]): void {
    controls.forEach((control) => {
      this.winbackForm.get(control)?.disable();
      this.winbackForm.get(control)?.reset();
    });
  }

  resetControls(controls: string[]): void {
    controls.forEach((control) => {
      this.winbackForm.get(control)?.reset();
    });
  }

  enableControls(controls: string[]): void {
    controls.forEach((control) => {
      this.winbackForm.get(control)?.enable();
    });
  }

  setControlValidators(
    control: string,
    validators: ValidatorFn[] | null,
  ): void {
    this.winbackForm.get(control)?.setValidators(validators);
    this.winbackForm.get(control)?.updateValueAndValidity({ onlySelf: true });
  }

  openInfoModal(fieldName: string, event?: any): void {
    if (event) {
      event.stopPropagation();
    }
    this.dialog.open(InfoModalComponent, {
      width: '50vw',
      data: { assetPath: `../../assets/${fieldName}.png` },
    });
  }

  keyPressNumbersIntOnly(event: KeyboardEvent): void {
    this.offersService.keyPressOnlyNumbers(event);
  }

  keyPressNumbersWithDecimal(event: KeyboardEvent): void {
    this.offersService.keyPressOnlyNumbers(event, true);
  }

  checkControlValue(control: string, value: string): boolean {
    return this.winbackForm.get(control)?.value === value;
  }

  setBgImgUrl(url: string): void {
    this.winbackForm.get('offerBgImageUrl')?.setValue(url);
  }

  showBgImg() {
    this.bgImgUrl = this.winbackForm.get('offerBgImageUrl')?.value;
  }

  getControlValue(control: string): string {
    return this.winbackForm.get(control)?.value;
  }

  showBoldedText(): any {
    if (
      !this.plans ||
      !this.getControlValue('plan') ||
      this.getControlValue('offerBoldedText')
    ) {
      return false;
    }

    if (this.checkControlValue('discountDurationType', DurationType.CUSTOMIZE)) {
      if (
        this.getControlValue('discountDurationValue') &&
        this.getControlValue('discountDurationUnit')
      ) {
        this.generateBoldedTextMsg();
        return true;
      } else {
        return false;
      }
    }

    switch (this.getControlValue('discountType')) {
      case this.discountTypeEnum.FIXED:
        if (
          this.getControlValue('discountDurationType') &&
          this.getControlValue('discountAmount')
        ) {
          this.generateBoldedTextMsg();
          return true;
        }
        break;

      case this.discountTypeEnum.TRIAL:
        if (this.getControlValue('discountDurationType')) {
          this.generateBoldedTextMsg();
          return true;
        }
        break;
    }
  }

  generateBoldedTextMsg(): void {
    const DEFAULT_TO = 'If left blank, the Bolded Text would appear as: ';
    const currentPlan = this.plans.filter((plan) => {
      return plan.planCode === this.getControlValue('plan');
    })[0];

    let discountDurationUnit;
    let discountDurationValue;

    if (this.checkControlValue('discountDurationType', DurationType.CUSTOMIZE)) {
      discountDurationValue = this.getControlValue('discountDurationValue');
      discountDurationUnit = this.getControlValue('discountDurationUnit');
    } else {
      const defaultValue = this.getControlValue('discountDurationType');
      const array = defaultValue.split('-');
      discountDurationValue = +array[0];
      discountDurationUnit = array[1];
    }

    switch (this.getControlValue('discountType')) {
      case this.discountTypeEnum.FIXED:
        // Fixed type
        if (!currentPlan.trialDuration || !currentPlan.trialUnit) {
          // No trial
          this.offerBoldedTextMsg = `${DEFAULT_TO} ONLY $${this.getControlValue(
            'discountAmount',
          )}/${pluralize(
            discountDurationUnit,
            1,
          ).toUpperCase()} FOR ${pluralize(
            discountDurationUnit.toUpperCase(),
            discountDurationValue,
            true,
          )}`;
        } else {
          // With trial
          this.offerBoldedTextMsg = `${DEFAULT_TO} $${this.getControlValue(
            'discountAmount',
          )}/${pluralize.singular(
            discountDurationUnit,
          )} for ${discountDurationValue} ${pluralize(
            discountDurationUnit,
            discountDurationValue,
          )}, ${currentPlan.trialDuration}-${pluralize(
            currentPlan.trialUnit,
            currentPlan.trialDuration,
          )} free trial`;
        }
        break;

      case this.discountTypeEnum.TRIAL:
        // Trial type
        this.offerBoldedTextMsg = `${DEFAULT_TO} $${
          currentPlan.price
        }/${pluralize(
          currentPlan.billingCycleUnit,
          currentPlan.billingCycleDuration,
          currentPlan.billingCycleDuration > 1,
        )}, ${discountDurationValue}-${pluralize(
          discountDurationUnit,
          discountDurationValue,
        )} free trial`;
        break;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generatedLegal = '';
  generatedBanner = '';

  configureTemplates(): OfferTemplates | null {
    const templates = new OfferTemplates();
    templates.country = 'US';
    templates.planPrice = this.planPrice;
    templates.planTerm = this.planBillingCycleDuration;
    if (!templates.planPrice || !templates.planPrice) {
      return null;
    }

    let discountDurationValue;

    if (this.checkControlValue('discountDurationType', DurationType.CUSTOMIZE)) {
      discountDurationValue = this.getControlValue('discountDurationValue');
    } else {
      const defaultValue = this.getControlValue('discountDurationType');
      if (!defaultValue) {
        return null;
      }
      const array = defaultValue.split('-');
      discountDurationValue = +array[0];
    }

    templates.offerDuration = discountDurationValue;
    templates.offerPrice = parseFloat(this.getControlValue('discountAmount'));
    if (isNaN(templates.offerPrice)) {
      return null;
    }
    return templates;
  }

  updateTemplates(): void {
    const templates = this.configureTemplates();
    const bannerText = this.getControlValue('offerAppliedBannerText');
    if (bannerText === this.generatedBanner) {
      if (
        templates &&
        templates.isValid(Template.BANNER) &&
        this.getControlValue('discountType') === DiscountType.FIXED
      ) {
        this.generatedBanner = templates.render(Template.BANNER);
      } else {
        this.generatedBanner = '';
      }
      this.winbackForm
        .get('offerAppliedBannerText')
        ?.setValue(this.generatedBanner);
    }
    const legalDisclaimer = this.getControlValue('legalDisclaimer');
    if (legalDisclaimer == this.generatedLegal) {
      if (
        templates &&
        templates.isValid(Template.LEGAL_DISCLAIMER) &&
        this.getControlValue('discountType') === DiscountType.FIXED
      ) {
        this.generatedLegal = templates.render(Template.LEGAL_DISCLAIMER);
      } else {
        this.generatedLegal = '';
      }
      this.winbackForm.get('legalDisclaimer')?.setValue(this.generatedLegal);
    }
  }
}
