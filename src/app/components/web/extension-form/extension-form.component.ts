import { Component, forwardRef, OnDestroy, OnInit, Input } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { OfferTemplates, Template } from '../../../helpers/offer_templates';

import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Dropdown, PlanResponsePayload } from '../../../types/payload';
import {
  OfferType,
  DiscountType,
  StatusEnum,
  DurationType,
} from '../../../types/enum';
import { MatDialog } from '@angular/material/dialog';
import { OffersService } from '../../../service/offers.service';
import * as pluralize from 'pluralize';
import { validatePromoPrice } from '../../../validators/promo-price-validator';
import { DEFAULT_TIMEZONE, FIELDS_LOOKUP } from '../../../constants';
import { InfoModalComponent } from '../../info-modal/info-modal.component';
import { validateDiscountDurationValue } from '../../../validators/custom-discount-duration-value-validators';
import { ConfigurationService } from '../../../service/configuration.service';

let VALID_TEXT_FIELD_REGEXP: RegExp;

@Component({
  selector: 'app-extension-form',
  templateUrl: './extension-form.component.html',
  styleUrls: ['./extension-form.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ExtensionFormComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ExtensionFormComponent),
      multi: true,
    },
  ],
})
export class ExtensionFormComponent
  implements OnInit, OnDestroy, ControlValueAccessor, Validator {
  @Input() regionCode: string;
  @Input() regionsLanguagesBinding: any[];
  public extensionForm: FormGroup;
  // public offerCodeTypes = this.offersService.offerCodeTypes;
  public offerCode: string;
  public plans: PlanResponsePayload[];
  public planPrice: number;
  public durationAmountError: string;
  public planBillingCycleDuration: number;
  public planBillingCycleUnit: string;

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
  public offerTermsLength = 50000;
  public bannerTextLength = 255;

  public tzName = DEFAULT_TIMEZONE;

  public upgradeUsersPlan: PlanResponsePayload[];
  public showCreateUpgradeOffer = false;
  private generatedBanner = '';

  public generalTextFieldPatternErrMsg =
    'Text must start and only contain letters of English, French, German, Swedish, Spanish, Portuguese, Italian or Dutch languages; numbers or special symbols';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private offersService: OffersService,
    private configurationService: ConfigurationService,
  ) {
    this.extensionForm = this.fb.group({});
  }

  public onTouched: () => void = () => {};

  writeValue(val: any): void {
    val && this.setFormData(val);
  }

  registerOnChange(fn: any): void {
    this.extensionForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        fn(this.extensionForm.getRawValue());
      });
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.extensionForm.disable() : this.extensionForm.enable();
  }

  validate(c: AbstractControl): ValidationErrors | null {
    return this.extensionForm.valid
      ? null
      : {
          invalidForm: { valid: false, message: 'extension form is invalid' },
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
    // this.currentOfferTypeValueChanges();
    // this.discountTypeValueChanges();
    this.discountAmountValueChanges();
    this.durationTypeValueChanges();
    this.durationAmountChanges();
  }

  removeNewlines(event, control: AbstractControl, str: string | null = null) {
    if (!str) {
      str = event.clipboardData.getData('text/plain');
    }
    if (!!str && str !== str.trim()) {
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
      (a: any, b: any) =>
        a.billingCycleDuration - b.billingCycleDuration || a.price - b.price,
    );
  }

  setDurationProps(): void {
    this.durationUnits = this.offersService.priceDurationUnits;
    this.durationAmountError = 'Please enter an integer from 1 to 24';
  }

  createUpgradeOfferValueChanges() {
    (this.extensionForm.get('createUpgradeOffer') as FormControl).valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: boolean) => {
        if (value) {
          this.offersService.currentOfferCodeLimitSubject$.next(42);
        } else {
          this.offersService.currentOfferCodeLimitSubject$.next(50);
        }
      });
  }

  createForm(): void {
    this.extensionForm = this.fb.group({
      eligibleCharges: [[]],
      createUpgradeOffer: [false],
      discountAmount: [''],
      durationType: ['', Validators.required],
      durationAmount: [''],
      durationUnit: ['', Validators.required],
      offerTitle: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerDescription: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerTerms: [''],
      bannerText: [''],
      offerBusinessOwner: [
        localStorage.email ? localStorage.email : '',
        [Validators.pattern(VALID_TEXT_FIELD_REGEXP)],
      ],
    });
  }

  determineCustomize(data) {
    if (
      data.durationType === DurationType.SINGLE_USE ||
      data.durationType === DurationType.FOREVER
    ) {
      return data.durationType;
    }
    let durationType = data.durationAmount + '-' + data.durationUnit;
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
    this.extensionForm.patchValue({
      eligibleCharges: data.eligibleCharges,
      usersOnPlans:
        data.usersOnPlans && data.usersOnPlans.length > 0
          ? data.usersOnPlans
          : ['-'],
      createUpgradeOffer: data.createUpgradeOffer || !!data.upgradeOfferCode,
      upgradePlan: data.switchToPlan,
      discountAmount: data.discountAmount,
      durationType: this.determineCustomize(data),
      durationAmount: data.durationAmount,
      durationUnit: data.durationUnit,
      offerTitle: data.offerTitle,
      offerDescription: data.offerDescription,
      offerTerms: data.offerTerms,
      bannerText: data.bannerText,
      offerBusinessOwner: data.offerBusinessOwner,
    });

    const currentPlan = this.plans.filter((plan) => {
      return data.eligibleCharges.includes(plan.planCode);
    })[0];

    this.planPrice = !!currentPlan.price ? currentPlan.price : 0;
    this.planBillingCycleDuration = !!currentPlan.billingCycleDuration
      ? currentPlan.billingCycleDuration
      : 0;

    this.setControlValidators('discountAmount', [
      Validators.required,
      Validators.pattern('[0-9]+(.[0-9][0-9]?)?'),
      validatePromoPrice(this.planPrice),
    ]);

    this.setControlValidators('durationAmount', [
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
  setDiscountDurationList(plan) {
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
      (this.extensionForm.get(control) as FormControl).reset();
    });
  }

  setControlValidators(
    control: string,
    validators: ValidatorFn[] | null,
  ): void {
    (this.extensionForm.get(control) as FormControl).setValidators(validators);
    (this.extensionForm.get(control) as FormControl).updateValueAndValidity({
      onlySelf: true,
    });
  }

  planValueChanges(): void {
    (this.extensionForm.get('eligibleCharges') as FormControl).valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((planCodes: string[]) => {
        if (planCodes.length) {
          const currentPlan: any = this.plans.filter((plan) => {
            return planCodes.includes(plan.planCode);
          });

          if (currentPlan.length) {
            this.upgradeUsersPlan = this.plans.filter(
              (plan: any) =>
                plan.billingCycleDuration < currentPlan[0].billingCycleDuration,
            );

            this.showCreateUpgradeOffer =
              currentPlan[0].billingCycleDuration >= 1;

            this.planPrice = currentPlan[0] ? currentPlan[0]['price'] : 0;

            this.planBillingCycleDuration = currentPlan[0]
              ? currentPlan[0]['billingCycleDuration']
              : 0;
            this.planBillingCycleUnit = currentPlan[0]
              ? currentPlan[0]['billingCycleUnit']
              : '';
            this.setDiscountDurationList(currentPlan[0]);
          } else {
            (this.extensionForm.get(
              'createUpgradeOffer',
            ) as FormControl).reset();
            (this.extensionForm.get('usersOnPlans') as FormControl).reset([
              '-',
            ]);
          }

          this.resetControls([
            'discountAmount',
            'durationType',
            'durationAmount',
            'durationUnit',
          ]);

          this.setControlValidators('discountAmount', [
            Validators.required,
            Validators.pattern('[0-9]+(.[0-9][0-9]?)?'),
            validatePromoPrice(this.planPrice),
          ]);

          this.setControlValidators('durationAmount', [
            Validators.required,
            Validators.min(1),
            Validators.max(24),
            validateDiscountDurationValue(this.planBillingCycleDuration),
          ]);

          this.offersService.currentOfferType$
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
              if (res === OfferType.EXTENSION) {
                this.offersService.currentPlanDurationSubject$.next(
                  this.planBillingCycleDuration,
                );
              }
            });
        }
      });
  }

  setupDisabledFields() {
    Object.keys(this.extensionForm.controls).forEach((control) => {
      if (this.isFieldDisabled(control)) {
        (this.extensionForm.get(control) as FormControl).disable({
          emitEvent: false,
        });
      }
    });
  }

  isFieldDisabled(formField: string) {
    return !!FIELDS_LOOKUP[formField].includes(this.offersService.statusId);
  }

  getPlanDetails(plan, addTrialInfo = true): string {
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

  formatPlanDetails(plan) {
    plan.billingCycleUnit = pluralize(
      plan.billingCycleUnit,
      plan.billingCycleDuration,
    );
    plan['planDetails'] = this.getPlanDetails(plan);
  }

  findPlanByCode(code: string) {
    for (const plan of this.plans) {
      if (plan.planCode === code) {
        return plan;
      }
    }
  }

  isPlanAvailable(code: string): boolean {
    const control = this.extensionForm.controls.eligibleCharges;
    if (control.value.length === 0) {
      return true;
    } else {
      const selectedCode = control.value[0];
      const selectedPlan: any = this.findPlanByCode(selectedCode);
      const plan: any = this.findPlanByCode(code);

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
      const plan: any = this.findPlanByCode(selectedPlans[0]);
      return `${plan.planCode} - ${plan['planDetails']}`;
    } else {
      const firstPlan: any = this.findPlanByCode(selectedPlans[0]);
      let sameTermAndPrice = true;
      // display price / term information only if all selected plans have the same plan / term values
      for (let i = 1; i < selectedPlans.length; i++) {
        const anotherPlan: any = this.findPlanByCode(selectedPlans[i]);
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

  keyPressNumbersIntOnly(event: KeyboardEvent): void {
    this.offersService.keyPressOnlyNumbers(event);
  }

  keyPressNumbersWithDecimal(event: KeyboardEvent): void {
    this.offersService.keyPressOnlyNumbers(event, true);
  }

  getControlValue(control: string): string {
    return (this.extensionForm.get(control) as FormControl).value;
  }

  checkControlValue(control: string, value: string): boolean {
    return (this.extensionForm.get(control) as FormControl).value === value;
  }

  enableControls(controls: string[]): void {
    controls.forEach((control) => {
      (this.extensionForm.get(control) as FormControl).enable();
    });
  }

  disableAndResetControls(controls: string[]): void {
    controls.forEach((control) => {
      (this.extensionForm.get(control) as FormControl).disable();
      (this.extensionForm.get(control) as FormControl).reset();
    });
  }

  durationTypeValueChanges(): void {
    (this.extensionForm.get('durationType') as FormControl).valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.updateTemplates();
        if (result === DurationType.CUSTOMIZE) {
          this.enableControls(['durationAmount', 'durationUnit']);
        } else {
          this.disableAndResetControls(['durationAmount', 'durationUnit']);
        }

        if (result !== DurationType.CUSTOMIZE) {
          this.offersService.currentOfferType$
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
              if (res === OfferType.EXTENSION) {
                this.offersService.currentDiscountDurationSubject$.next(result);
              }
            });
        }
      });
  }

  durationAmountChanges() {
    (this.extensionForm.get('durationAmount') as FormControl).valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.updateTemplates();
        if (
          result &&
          this.getControlValue('durationType') === DurationType.CUSTOMIZE
        ) {
          this.offersService.currentOfferType$
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
              if (res === OfferType.EXTENSION) {
                this.offersService.currentDiscountDurationSubject$.next(
                  result + '-',
                );
              }
            });
        }
      });
  }

  // discountTypeValueChanges(): void {
  //   this.extensionForm
  //     .get('discountType')
  //     .valueChanges.pipe(takeUntil(this.destroy$))
  //     .subscribe((result) => {
  //       this.resetControls([
  //         'discountAmount',
  //         'durationType',
  //         'durationAmount',
  //         'durationUnit',
  //       ]);

  //       this.offersService.currentOfferType$
  //         .pipe(takeUntil(this.destroy$))
  //         .subscribe((res) => {
  //           if (res === OfferType.EXTENSION) {
  //             this.offersService.currentDiscountTypeSubject$.next(result);
  //           }
  //         });
  //     });
  // }

  discountAmountValueChanges(): void {
    (this.extensionForm.get('discountAmount') as FormControl).valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.updateTemplates();
        this.offersService.currentOfferType$
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (res === OfferType.EXTENSION && result <= 99.99) {
              this.offersService.currentDiscountAmountSubject$.next(result);
            }
          });
      });
  }

  updateTemplates(): void {
    const templates = this.configureTemplates();
    const bannerText = this.getControlValue('bannerText');
    if (bannerText == this.generatedBanner) {
      if (
        templates &&
        templates.isValid(Template.BANNER)
      ) {
        this.generatedBanner = templates.render(Template.BANNER);
      } else {
        this.generatedBanner = '';
      }
      this.extensionForm
        .get('bannerText')?.setValue(this.generatedBanner);
    }
  }

  configureTemplates(): OfferTemplates {
    const templates = new OfferTemplates();
    templates.country = 'US';
    templates.planPrice = this.planPrice;
    templates.planTerm = this.planBillingCycleDuration;
    if (!templates.planPrice || !templates.planPrice) {
      return null;
    }

    let discountDurationValue;

    if (this.checkControlValue('durationType', DurationType.CUSTOMIZE)) {
      discountDurationValue = this.getControlValue('durationAmount');
    } else if (this.checkControlValue('durationType', DurationType.SINGLE_USE)) {
      discountDurationValue = templates.planTerm;
    } else {
      const defaultValue = this.getControlValue('durationType');
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


}
