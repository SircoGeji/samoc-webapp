import { Component, forwardRef, OnDestroy, OnInit, Input } from '@angular/core';
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

import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Dropdown, PlanResponsePayload } from '../../types/payload';
import {
  CodeType,
  OfferType,
  DiscountType,
  StatusEnum,
  DurationType,
} from '../../types/enum';
import { MatDialog } from '@angular/material/dialog';
import { OffersService } from 'src/app/service/offers.service';
import * as pluralize from 'pluralize';
import { validatePromoPrice } from '../../validators/promo-price-validator';
import { DEFAULT_TIMEZONE, FIELDS_LOOKUP } from '../../constants';
import { validateEndDate } from '../../validators/custom-datetime-validators';
import { InfoModalComponent } from '../info-modal/info-modal.component';
import { validateDiscountDurationValue } from '../../validators/custom-discount-duration-value-validators';
import { OfferTemplates, Template } from '../../helpers/offer_templates';
import { ConfigurationService } from '../../service/configuration.service';

let VALID_TEXT_FIELD_REGEXP: RegExp;

@Component({
  selector: 'app-retention-form',
  templateUrl: './retention-form.component.html',
  styleUrls: ['./retention-form.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RetentionFormComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => RetentionFormComponent),
      multi: true,
    },
  ],
})
export class RetentionFormComponent
  implements OnInit, OnDestroy, ControlValueAccessor, Validator {
  @Input() regionCode: string;
  @Input() regionsLanguagesBinding: any[];
  public retentionForm: FormGroup;
  public offerCodeTypes = this.offersService.offerCodeTypes;
  public offerCode: string;
  public plans: PlanResponsePayload[];
  public planPrice: number;
  public durationValueError: string;
  public planBillingCycleDuration: number;
  public planBillingCycleUnit: string;
  public offerBoldedTextMsg: string;

  public durationTypes: Dropdown[];
  public durationUnits: Dropdown[];

  public offers = [
    { value: DiscountType.FIXED, viewValue: 'Fixed Amount' },
    { value: DiscountType.PERCENT, viewValue: 'Percentage' },
  ];

  public nameLength = 255;
  public headerLength = 150;
  public bodyTxtLength = 500;
  public boldedTxtLength = 150;
  public bannerTxtLength = 150;
  public disclaimerLength = 500;
  public emailTxtLength = 255;
  public ownerLength = 50;
  public claimOfferTermsLength = 50000;

  public tzName = DEFAULT_TIMEZONE;

  public upgradeUsersPlan: PlanResponsePayload[];
  public showCreateUpgradeOffer = false;

  public generalTextFieldPatternErrMsg =
    'Text must start and only contain letters of English, French, German, Swedish, Spanish, Portuguese, Italian or Dutch languages; numbers or special symbols';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private offersService: OffersService,
    private configurationService: ConfigurationService,
  ) {}

  public onTouched: () => void = () => {};

  writeValue(val: any): void {
    val && this.setFormData(val);
  }

  registerOnChange(fn: any): void {
    this.retentionForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        fn(this.retentionForm.getRawValue());
      });
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.retentionForm.disable() : this.retentionForm.enable();
  }

  validate(c: AbstractControl): ValidationErrors | null {
    return this.retentionForm.valid
      ? null
      : {
          invalidForm: { valid: false, message: 'retention form is invalid' },
        };
  }

  ngOnInit(): void {
    this.getRegExpString();
    this.subscribeToOfferCode();
    this.setPlans();
    this.createForm();
    this.setDurationProps();

    this.planValueChanges();
    this.createUpgradeOfferValueChanges();
    this.currentOfferTypeValueChanges();
    this.discountTypeValueChanges();
    this.discountAmountValueChanges();
    this.discountDurationTypeValueChanges();
    this.discountDurationValueChanges();
    this.endDateValueChanges();
  }

  removeNewlines(event, control: AbstractControl, str: string = null) {
    if (!str) {
      str = event.clipboardData.getData('text/plain');
    }
    if (str !== str.trim()) {
      const newData: string = control.value + str;
      control.setValue(newData);
      event.preventDefault();
    }
  }

  getRegExpString() {
    VALID_TEXT_FIELD_REGEXP = this.offersService.getValidTextFieldRegExp();
  }

  setPlans() {
    this.plans = this.offersService.allPlans.filter((plan) => {
      this.formatPlanDetails(plan);
      return plan.statusId !== StatusEnum.DFT;
    });

    this.plans.sort(
      (a, b) =>
        a.billingCycleDuration - b.billingCycleDuration || a.price - b.price,
    );
  }

  setDurationProps(): void {
    this.durationUnits = this.offersService.priceDurationUnits;
    this.durationValueError = 'Please enter an integer from 1 to 24';
  }

  createUpgradeOfferValueChanges() {
    this.retentionForm
      .get('createUpgradeOffer')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value: boolean) => {
        if (value) {
          this.enableControls(['upgradePlan']);
          this.offersService.currentOfferCodeLimitSubject$.next(42);
          this.setControlValidators('upgradePlan', [Validators.required]);
        } else {
          this.offersService.currentOfferCodeLimitSubject$.next(50);
          this.disableAndResetControls(['upgradePlan']);
        }
      });
  }

  createForm(): void {
    this.retentionForm = this.fb.group({
      eligiblePlans: [[]],
      offerCodeType: [''],
      usersOnPlans: [['-']],
      createUpgradeOffer: [false],
      upgradePlan: [''],
      discountType: [''],
      discountAmount: [''],
      discountPercents: [
        '',
        [Validators.required, Validators.min(1), Validators.max(100)],
      ],
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
      legalDisclaimer: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      claimOfferTerms: [
        this.offersService.getRegionClaimOfferTermsPlaceholder(this.regionCode),
      ],
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

  determineCustomize(data) {
    if (
      data.discountDurationType === DurationType.SINGLE_USE ||
      data.discountDurationType === DurationType.FOREVER
    ) {
      return data.discountDurationType;
    }
    let durationType =
      data.discountDurationValue + '-' + data.discountDurationUnit;
    const type = this.offersService.priceDurationTypes.filter((obj) => {
      return obj['value'] === durationType;
    });
    if (type.length === 0) {
      durationType = DurationType.CUSTOMIZE;
    }
    return durationType;
  }

  patchOfferBoldedText(total) {
    if (total) {
      return total.replace('<span>', '').replace('</span>', '');
    } else {
      return '';
    }
  }

  setFormData(data) {
    data.discountPercents = data.discountAmount;
    this.retentionForm.patchValue({
      eligiblePlans: data.eligiblePlans,
      offerCodeType: data.offerCodeType,
      usersOnPlans:
        data.usersOnPlans && data.usersOnPlans.length > 0
          ? data.usersOnPlans
          : ['-'],
      createUpgradeOffer: data.createUpgradeOffer,
      upgradePlan: data.upgradePlan,
      discountType: data.discountType,
      discountAmount: data.discountAmount,
      discountPercents: data.discountAmount,
      discountDurationType: this.determineCustomize(data),
      discountDurationValue: data.discountDurationValue,
      discountDurationUnit: data.discountDurationUnit,
      offerName: data.offerName,
      offerHeader: data.offerHeader,
      offerBodyText: data.offerBodyText,
      offerBoldedText: this.patchOfferBoldedText(data.offerBoldedText),
      offerAppliedBannerText: data.offerAppliedBannerText,
      legalDisclaimer: data.legalDisclaimer,
      claimOfferTerms: data.claimOfferTerms,
      offerBusinessOwner: data.offerBusinessOwner,
      welcomeText: data.welcomeEmailText || '',
      endDate: data.endDate ? new Date(data.endDate) : null,
      endTime: data.endTime || '',
      noEndDate: data.noEndDate,
    });

    const currentPlan = this.plans.filter((plan) => {
      return data.eligiblePlans.includes(plan.planCode);
    })[0];

    this.planPrice = currentPlan.price;
    this.planBillingCycleDuration = currentPlan.billingCycleDuration;

    this.setControlValidators('discountAmount', [
      Validators.required,
      Validators.pattern('[0-9]+(.[0-9][0-9]?)?'),
      validatePromoPrice(this.planPrice),
    ]);

    this.setControlValidators('discountDurationValue', [
      Validators.required,
      Validators.min(1),
      Validators.max(24),
      validateDiscountDurationValue(this.planBillingCycleDuration),
    ]);

    this.setDiscountDurationList(currentPlan);

    if (!this.offersService.duplicateOfferCode) {
      this.setupDisabledFields();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  subscribeToOfferCode() {
    this.offersService.currentOfferCode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((code) => {
        if (code) {
          this.offerCode = code;
        }
      });
  }

  // TODO: Remove duplicated code
  setDiscountDurationList(plan: PlanResponsePayload) {
    const result: Dropdown[] = [
      { value: DurationType.SINGLE_USE, viewValue: 'Single Use' },
    ];
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

      this.durationTypes = result;
    }
  }

  resetControls(controls: string[]): void {
    controls.forEach((control) => {
      this.retentionForm.get(control).reset();
    });
  }

  setControlValidators(
    control: string,
    validators: ValidatorFn[] | null,
  ): void {
    this.retentionForm.get(control).setValidators(validators);
    this.retentionForm.get(control).updateValueAndValidity({ onlySelf: true });
  }

  planValueChanges(): void {
    this.retentionForm
      .get('eligiblePlans')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((planCodes: string[]) => {
        const currentPlan = this.plans.filter((plan) => {
          return planCodes.includes(plan.planCode);
        });

        if (currentPlan.length) {
          this.upgradeUsersPlan = this.plans.filter(
            (plan) =>
              plan.billingCycleDuration < currentPlan[0].billingCycleDuration,
          );

          this.showCreateUpgradeOffer =
            currentPlan[0].billingCycleDuration >= 1;
        } else {
          this.retentionForm.get('createUpgradeOffer').reset();
          this.retentionForm.get('usersOnPlans').reset(['-']);
        }

        this.planPrice = currentPlan[0] ? currentPlan[0]['price'] : 0;

        this.planBillingCycleDuration = currentPlan[0]
          ? currentPlan[0]['billingCycleDuration']
          : 0;
        this.planBillingCycleUnit = currentPlan[0]
          ? currentPlan[0]['billingCycleUnit']
          : '';

        this.setDiscountDurationList(currentPlan[0]);

        this.resetControls([
          'discountAmount',
          'discountPercents',
          'discountDurationType',
          'discountDurationValue',
          'discountDurationUnit',
        ]);

        this.setControlValidators('discountAmount', [
          Validators.required,
          Validators.pattern('[0-9]+(.[0-9][0-9]?)?'),
          validatePromoPrice(this.planPrice),
        ]);

        this.setControlValidators('discountDurationValue', [
          Validators.required,
          Validators.min(1),
          Validators.max(24),
          validateDiscountDurationValue(this.planBillingCycleDuration),
        ]);

        this.offersService.currentOfferType$
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (res === OfferType.RETENTION) {
              this.offersService.currentPlanDurationSubject$.next(
                this.planBillingCycleDuration,
              );
            }
          });
      });
  }

  setupDisabledFields() {
    Object.keys(this.retentionForm.controls).forEach((control) => {
      if (this.isFieldDisabled(control)) {
        this.retentionForm.get(control).disable({ emitEvent: false });
      }
    });
  }

  isFieldDisabled(formField: string) {
    return !!FIELDS_LOOKUP[formField].includes(this.offersService.statusId);
  }

  currentOfferTypeValueChanges(): void {
    const offerCodeType = this.retentionForm.get('offerCodeType');
    this.offersService.currentOfferType$
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (res === OfferType.RETENTION) {
          offerCodeType.setValue(CodeType.SINGLE_CODE, { emitEvent: true });
          offerCodeType.disable({ emitEvent: false });
        } else {
          offerCodeType.reset(null, { emitEvent: false });
          offerCodeType.enable({ emitEvent: false });
        }
      });
  }

  getPlanDetails(plan: PlanResponsePayload, addTrialInfo = true): string {
    let details = `$${plan.price}/${pluralize(
      plan.billingCycleUnit,
      plan.billingCycleDuration,
      plan.billingCycleDuration > 1,
    )}`;
    if (addTrialInfo) {
      if (plan.trialDuration == null || plan.trialDuration === 0) {
        details += ', no trial';
      } else {
        details += `, ${pluralize(
          plan.trialUnit,
          plan.trialDuration,
          true,
        )} trial`;
      }
    }
    return details;
  }

  formatPlanDetails(plan: PlanResponsePayload) {
    plan.billingCycleUnit = pluralize(
      plan.billingCycleUnit,
      plan.billingCycleDuration,
    );
    plan['planDetails'] = this.getPlanDetails(plan);
  }

  findPlanByCode(code: string): PlanResponsePayload {
    for (const plan of this.plans) {
      if (plan.planCode === code) {
        return plan;
      }
    }
  }

  isPlanAvailable(code: string): boolean {
    const control = this.retentionForm.controls.eligiblePlans;
    if (control.value.length === 0) {
      return true;
    } else {
      const selectedCode = control.value[0];
      const selectedPlan = this.findPlanByCode(selectedCode);
      const plan = this.findPlanByCode(code);

      return (
        selectedPlan.price === plan.price &&
        selectedPlan.billingCycleDuration === plan.billingCycleDuration &&
        selectedPlan.billingCycleUnit === plan.billingCycleUnit
      );
    }
  }

  formatSelectedPlans(control: AbstractControl): string {
    const selectedPlans = control.value;
    if (selectedPlans.length === 0) {
      return '';
    } else if (selectedPlans.length === 1) {
      if (selectedPlans[0] === '-') {
        return 'All Plans';
      }
      const plan = this.findPlanByCode(selectedPlans[0]);
      return `${plan.planCode} - ${plan['planDetails']}`;
    } else {
      const firstPlan = this.findPlanByCode(selectedPlans[0]);
      let sameTermAndPrice = true;
      // display price / term information only if all selected plans have the same plan / term values
      for (let i = 1; i < selectedPlans.length; i++) {
        const anotherPlan = this.findPlanByCode(selectedPlans[i]);
        if (
          firstPlan.price !== anotherPlan.price ||
          firstPlan.billingCycleDuration !== anotherPlan.billingCycleDuration ||
          firstPlan.billingCycleUnit !== anotherPlan.billingCycleUnit
        ) {
          sameTermAndPrice = false;
          break;
        }
      }
      let termAndPrice = '';
      if (sameTermAndPrice) {
        termAndPrice = ' - ' + this.getPlanDetails(firstPlan, false);
      }
      return selectedPlans.join(', ') + termAndPrice;
    }
  }

  listOfUpgradePlans(): PlanResponsePayload[] {
    const eligiblePlans: string[] = this.retentionForm.controls.eligiblePlans
      .value;
    return this.plans.filter((p) => {
      return eligiblePlans.includes(p.planCode);
    });
  }

  selectAllUserPlans(): void {
    this.retentionForm.controls.usersOnPlans.setValue(['-']);
  }

  selectUserPlan(): void {
    const control = this.retentionForm.controls.usersOnPlans;
    control.setValue(
      control.value.filter((p: string) => {
        return p !== '-';
      }),
    );
  }

  keyPressNumbersIntOnly(event: KeyboardEvent): void {
    this.offersService.keyPressOnlyNumbers(event);
  }

  keyPressNumbersWithDecimal(event: KeyboardEvent): void {
    this.offersService.keyPressOnlyNumbers(event, true);
  }

  openInfoModal(fieldName: string, event?: any): void {
    this.logErrors();
    if (event) {
      event.stopPropagation();
    }
    this.dialog.open(InfoModalComponent, {
      data: { assetPath: `../../assets/${fieldName}.png` },
    });
  }

  getControlValue(control: string): string {
    return this.retentionForm.get(control).value;
  }

  checkControlValue(control: string, value: string): boolean {
    return this.retentionForm.get(control).value === value;
  }

  showBoldedText(): boolean {
    if (
      !this.plans ||
      this.getControlValue('eligiblePlans').length === 0 ||
      this.getControlValue('offerBoldedText')
    ) {
      return false;
    }

    if (
      this.checkControlValue('discountDurationType', DurationType.CUSTOMIZE)
    ) {
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
      case DiscountType.FIXED:
        if (
          this.getControlValue('discountDurationType') &&
          this.getControlValue('discountAmount')
        ) {
          this.generateBoldedTextMsg();
          return true;
        }
        break;
      case DiscountType.PERCENT:
        if (
          this.getControlValue('discountDurationType') &&
          this.getControlValue('discountPercents')
        ) {
          this.generateBoldedTextMsg();
          return true;
        }
        break;
    }
  }

  generateBoldedTextMsg(): void {
    const DEFAULT_TO = 'If left blank, the Bolded Text would appear as: ';

    let discountDurationUnit;
    let discountDurationValue;
    const durationType = this.getControlValue('discountDurationType');
    if (durationType === DurationType.CUSTOMIZE) {
      discountDurationValue = this.getControlValue('discountDurationValue');
      discountDurationUnit = this.getControlValue('discountDurationUnit');
    } else if (durationType === DurationType.SINGLE_USE) {
      discountDurationValue = this.planBillingCycleDuration;
      discountDurationUnit = this.planBillingCycleUnit;
    } else {
      const defaultValue = this.getControlValue('discountDurationType');
      const array = defaultValue.split('-');
      discountDurationValue = +array[0];
      discountDurationUnit = array[1];
    }

    switch (this.getControlValue('discountType')) {
      case DiscountType.FIXED:
        if (durationType !== DurationType.SINGLE_USE) {
          this.offerBoldedTextMsg = `${DEFAULT_TO} ONLY $${this.getControlValue(
            'discountAmount',
          )}/${pluralize(
            this.planBillingCycleUnit.toUpperCase(),
            this.planBillingCycleDuration,
            true,
          ).toUpperCase()} FOR ${pluralize(
            discountDurationUnit.toUpperCase(),
            discountDurationValue,
            true,
          )}`;
        } else {
          this.offerBoldedTextMsg = `${DEFAULT_TO} ONLY $${this.getControlValue(
            'discountAmount',
          )} FOR ${pluralize(
            discountDurationUnit.toUpperCase(),
            discountDurationValue,
            true,
          )}`;
        }
        break;
      case DiscountType.PERCENT:
        this.offerBoldedTextMsg = `${DEFAULT_TO} ${this.getControlValue(
          'discountPercents',
        )}% OFF FOR ${pluralize(
          discountDurationUnit.toUpperCase(),
          discountDurationValue,
          true,
        )}`;
        break;
    }
  }

  logErrors(): void {
    if (this.retentionForm.invalid) {
      const invalid: [string, AbstractControl][] = [];
      const controls = this.retentionForm.controls;
      for (const name in controls) {
        if (controls[name] && controls[name].invalid) {
          invalid.push([name, controls[name]]);
        }
      }
      const errors = invalid
        .map((c) => {
          const [name, ctl] = c;
          let msg = `${name}: `;
          if (ctl.errors !== null) {
            Object.keys(ctl.errors).forEach((keyError) => {
              msg += `${keyError}: ${ctl.errors[keyError]}`;
            });
          }
          return msg;
        })
        .join('\n');
      console.log(errors);
    }
  }

  enableControls(controls: string[]): void {
    controls.forEach((control) => {
      this.retentionForm.get(control).enable();
    });
  }

  disableAndResetControls(controls: string[]): void {
    controls.forEach((control) => {
      this.retentionForm.get(control).disable();
      this.retentionForm.get(control).reset();
    });
  }

  discountDurationTypeValueChanges(): void {
    this.retentionForm
      .get('discountDurationType')
      .valueChanges.pipe(takeUntil(this.destroy$))
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
          this.getControlValue('discountType') === DiscountType.FIXED &&
          result !== DurationType.CUSTOMIZE
        ) {
          this.offersService.currentOfferType$
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
              if (res === OfferType.RETENTION) {
                this.offersService.currentDiscountDurationSubject$.next(result);
              }
            });
        }
      });
  }

  discountDurationValueChanges() {
    this.retentionForm
      .get('discountDurationValue')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.updateTemplates();
        if (
          result &&
          this.getControlValue('discountType') === DiscountType.FIXED &&
          this.getControlValue('discountDurationType') ===
            DurationType.CUSTOMIZE
        ) {
          this.offersService.currentOfferType$
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
              if (res === OfferType.RETENTION) {
                this.offersService.currentDiscountDurationSubject$.next(
                  result + '-',
                );
              }
            });
        }
      });
  }

  endDateValueChanges(): void {
    const endDate = this.retentionForm.get('endDate');
    const endTime = this.retentionForm.get('endTime');

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

  discountTypeValueChanges(): void {
    this.retentionForm
      .get('discountType')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.updateTemplates();
        this.resetControls([
          'discountAmount',
          'discountPercents',
          'discountDurationType',
          'discountDurationValue',
          'discountDurationUnit',
        ]);

        switch (result) {
          case DiscountType.FIXED:
            this.enableControls(['discountAmount']);
            this.disableAndResetControls(['discountPercents']);
            break;
          case DiscountType.PERCENT:
            this.enableControls(['discountPercents']);
            this.disableAndResetControls(['discountAmount']);
            break;
        }

        this.offersService.currentOfferType$
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (res === OfferType.RETENTION) {
              this.offersService.currentDiscountTypeSubject$.next(result);
            }
          });
      });
  }

  discountAmountValueChanges(): void {
    this.retentionForm
      .get('discountAmount')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.updateTemplates();
        if (this.getControlValue('discountType') === DiscountType.FIXED) {
          this.offersService.currentOfferType$
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
              if (res === OfferType.RETENTION && result <= 99.99) {
                this.offersService.currentDiscountAmountSubject$.next(result);
              }
            });
        }
      });
  }

  generatedLegal = '';
  generatedBanner = '';

  configureTemplates(): OfferTemplates {
    const templates = new OfferTemplates();
    templates.country = 'US';
    templates.planPrice = this.planPrice;
    templates.planTerm = this.planBillingCycleDuration;
    if (!templates.planPrice || !templates.planPrice) {
      return null;
    }

    let discountDurationValue;

    if (
      this.checkControlValue('discountDurationType', DurationType.CUSTOMIZE)
    ) {
      discountDurationValue = this.getControlValue('discountDurationValue');
    } else if (
      this.checkControlValue('discountDurationType', DurationType.SINGLE_USE)
    ) {
      discountDurationValue = this.planBillingCycleDuration;
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
    if (bannerText == this.generatedBanner) {
      if (
        templates &&
        templates.isValid(Template.BANNER) &&
        this.getControlValue('discountType') === DiscountType.FIXED
      ) {
        this.generatedBanner = templates.render(Template.BANNER);
      } else {
        this.generatedBanner = '';
      }
      this.retentionForm
        .get('offerAppliedBannerText')
        .setValue(this.generatedBanner);
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
      this.retentionForm.get('legalDisclaimer').setValue(this.generatedLegal);
    }
  }
}
