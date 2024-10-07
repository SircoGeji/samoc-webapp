import {
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  forwardRef,
  ViewContainerRef,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validator,
  Validators,
  ValidationErrors,
  ValidatorFn,
  FormControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { MatDialog } from '@angular/material/dialog';

import { Observable, Subject, Subscription } from 'rxjs';
import { delay, filter, takeUntil } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

import { BaseComponent } from '../base/base.component';

import { LoaderService } from '../../service/loader.service';
import { OffersService } from '../../service/offers.service';
import { PlansService } from '../../service/plans.service';
import { ConfigurationService } from '../../service/configuration.service';

import { OpenErrorDialogOptions } from '../../types/OpenErrorDialogOptions';

import {
  DEFAULT_TIMEZONE,
  FIELDS_LOOKUP,
  PROCEED_MESSAGE,
} from '../../constants';
import {
  CodeType,
  DiscountType,
  DurationType,
  OfferType,
  StatusEnum,
} from '../../types/enum';
import * as moment from 'moment-timezone';
import * as pluralize from 'pluralize';
import {
  Dropdown,
  PlanResponsePayload,
  RegionsInterface,
  InterFormRegion,
  InterFormLanguage,
} from '../../../app/types/payload';
import { ImageValidator } from '../../../app/validators/image-validator';
import { ImageLoaderService } from '../../../app/service/image-loader.service';
import { ShareInterOfferService } from '../../../app/service/inter-offer-share.service';
import {
  validateEndDate,
  validateLaunchDate,
} from '../../../app/validators/custom-datetime-validators';
import { validateDiscountDurationValue } from '../../../app/validators/custom-discount-duration-value-validators';
import { validatePromoPrice } from '../../../app/validators/promo-price-validator';
import { InfoModalComponent } from '../info-modal/info-modal.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { PageEvent } from '@angular/material/paginator';
import { RegionsService } from '../../service/i18n.service';
import * as textMask from 'vanilla-text-mask/dist/vanillaTextMask.js';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatSelect } from '@angular/material/select';
import { formatDateTime, getTimeZoneDateTime } from '../../helpers/date-utils';
import { removeXid } from '../../helpers/string-utils';
import { WebOffersUtils } from '../../utils/web-offers.utils';

export const ROUTE_UPDATE_INTER_OFFER_NAME =
  'inter-offers/inter-update/:offerType/:campaign';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

let VALID_TEXT_FIELD_REGEXP: RegExp;

export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/DD/YYYY',
  },
  display: {
    dateInput: 'MM/DD/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'MM.DD.YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'inter-offer-form',
  templateUrl: './inter-offer-form.component.html',
  styleUrls: ['./inter-offer-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InterOfferFormComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => InterOfferFormComponent),
      multi: true,
    },
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ],
})
export class InterOfferFormComponent
  extends BaseComponent
  implements OnInit, OnDestroy, ControlValueAccessor, Validator {
  public offerForm: FormGroup;
  public offerCodeErrorMsg: string;
  public heading: string;
  public offerTypes = this.offersService.offerTypes;
  public currentOfferType: number;

  public planPrice: number;
  public planBillingCycleDuration: number;
  public planBillingCycleUnit: string;
  public isUpdateRoute: boolean;
  public statusID: number;

  public OfferTypeEnum = OfferType;
  public offerCodeLength = 50;
  public upgradeOfferCodeLength = 42;
  public showForm = false;
  public showOfferCodeLoader: boolean;

  dialogResponseSubscription: Subscription;
  @ViewChild('regionsTablePaginator') regionsPaginator: MatPaginator;
  @ViewChild('regionsSelect') regionsSelectElement: MatSelect;
  @ViewChild('languagesSelect') languagesSelectElement: MatSelect;
  @ViewChild('endDateRef', { read: ViewContainerRef }) public endDateRef;

  public settingsTabMasterTitle = 'Master';
  public settingsTabMasterDescr = 'For populating all region-level settings';
  public settingsTabRegionsTitle = 'Regions for this offer';
  public settingsTabRegionsDescr =
    'Selected offers for push will be displayed here';
  public settingsTabRegionsPlaceholderText =
    'Please select regions to display in the "PUSH TO SELECTED" dropdown above';
  public contentTabMasterTitle = 'Master';
  public contentTabMasterDescr =
    'For overriding selected regional languages and background image. Default language is managed in contentful';
  public contentTabLanguagesTitle = 'Select languages';
  public contentTabLanguagesDescr =
    'System supports {{price}} {{duration}} values in edit mode. Default language is managed in contentful.';
  public contentTabLanguagesPlaceholderText =
    'Please select languages to display in the "PUSH TO SELECTED" dropdown above';
  public regionsOptions: any[] = [];
  public regionsLanguagesBinding: any[];
  public languagesOptions: any[];
  public regionsData: any[] = [];
  public fetchedSelectedRegionsSet = new Set<string>();
  public regionsTableData: MatTableDataSource<any>;
  public languagesData: any[] = [];
  public fetchedSelectedLanguagesSet = new Set<string>();
  public regionsTableHeaders: string[] = [];
  public regionsTableDataKeys: string[] = [];

  public offerCodeTypes = this.offersService.offerCodeTypes;

  public typesHolder: Dropdown[];
  public durationTypes: Dropdown[];
  public regionDurationTypes: Dropdown[];
  public tzName = DEFAULT_TIMEZONE;

  public generalTextFieldPatternErrMsg =
    'Text must start and only contain letters of English, French, German, Swedish, Spanish, Portuguese, Italian or Dutch languages; numbers or special symbols';

  public bgImgUrl: string;
  public durationValueError: string;
  public plans: any; // PlanResponsePayload[];
  public masterPlans: any[]; // PlanResponsePayload[];
  public discountTypeEnum = DiscountType;
  public offerBoldedTextMsg: string;

  public offerNameLength = 255;
  public campaignNameLength = 255;
  public offerBusinessOwnerLength = 50;
  public marketingHeadlineLength = 150;
  public offerHeadlineLength = 500;
  public subheadLength = 150;
  public offerAppliedBannerLength = 150;
  public offerTermsLength = 500;
  public bgImageUrlLength = 255;
  public dptrmLinkLength = 255;
  public welcomeEmailTextLength = 255;
  public claimOfferTermsLength = 50000;
  public globalFilter: string;
  public regionFilter = '';
  public pageEvent: PageEvent;
  public regionsLength: number;
  public regionsTablePageSize = 20;
  public offerCodeSuffix = '';
  public selectedIndex: number;
  public savedOffer: object = {};
  public regionsSelectModel: any;
  public upgradeUsersPlan: PlanResponsePayload[];
  public showCreateUpgradeOffer = false;
  public isRetention: boolean;
  public discountTypes;
  public showInfoModalCheck = true;

  public discountTypesDropdowns: Dropdown[] = [
    { value: DiscountType.FIXED, viewValue: 'Fixed Amount' },
    { value: DiscountType.TRIAL, viewValue: 'Free Trial' },
    { value: DiscountType.PERCENT, viewValue: 'Percentage' },
  ];

  mask = [/\d/, /\d/, '/', /\d/, /\d/, '/', /\d/, /\d/, /\d/, /\d/];
  maskedInputController;

  private destroy$ = new Subject<void>();
  private duplicateCampaign: string;
  private campaign: string | null;
  private offerName: string;

  constructor(
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public shareInterOfferService: ShareInterOfferService,
    public regionsService: RegionsService,

    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private offersService: OffersService,
    private plansService: PlansService,
    private configurationService: ConfigurationService,
    private imgLoader: ImageLoaderService,
    private webOffersUtils: WebOffersUtils,
  ) {
    super(dialog, loaderService, router);
    this.regionsTableData = new MatTableDataSource();
  }

  public onTouched: () => void = () => {};

  writeValue(val: any): void {
    val && this.setFormData(val);
  }

  registerOnChange(fn: any): void {
    this.offerForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      fn(this.offerForm.getRawValue());
    });
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  validate(c: AbstractControl): ValidationErrors | null {
    return this.offerForm.valid
      ? null
      : {
          invalidForm: { valid: false, message: 'Inter offer form is invalid' },
        };
  }

  ngOnInit(): void {
    this.setUpdateRoute();
    this.setDuplicateOfferCode();
    this.setCurrentOfferType();
    this.setCommonErrorMessages();
    this.getAllplans();
    this.getValidTextFieldRegExp();
  }

  setUpdateRoute(): void {
    this.isUpdateRoute =
      this.route.routeConfig?.path === ROUTE_UPDATE_INTER_OFFER_NAME;
  }

  setDuplicateOfferCode(): void {
    this.duplicateCampaign =
      this.route.snapshot.queryParamMap.get('prefill') || '';
    this.offersService.duplicateCampaign = this.duplicateCampaign;
  }

  setCurrentOfferType(): void {
    this.currentOfferType = Number(
      this.route.snapshot.paramMap.get('offerType'),
    );
    this.isRetention = this.currentOfferType === OfferType.RETENTION;
  }

  setCommonErrorMessages(): void {
    this.offerCodeErrorMsg = environment.production
      ? 'Valid characters are "a-z", "0-9", or "_".'
      : 'Must start with "samocqa_" and only contain these valid characters: "a-z", "0-9", or "_".';
  }

  getAllplans() {
    this.loaderService.show('Getting existing plans...');
    this.plansService
      .getAllPlans()
      .pipe(delay(500), takeUntil(this.destroy$))
      .subscribe((allPlans) => {
        const newAllPlans = allPlans.map((plan) => {
          return {
            ...plan,
            region: plan['storeCode'].slice(-2),
          };
        });
        this.offersService.allPlans = newAllPlans;
        this.setRegionsAvailableLanguages();
      });
  }

  getValidTextFieldRegExp() {
    VALID_TEXT_FIELD_REGEXP = this.offersService.getValidTextFieldRegExp();
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
                  languages,
                  currencyPrefix: region.currency.prefix,
                  currencyRatio: region.currency.ratio,
                };
              },
            );
            this.regionsLanguagesBinding = regions;
            this.createForm();
            this.setPlans();
            if (!this.isRetention) {
              this.planValueChanges();
            } else {
              this.eligiblePlansValueChanges();
              this.createUpgradeOfferValueChanges();
              this.upgradePlanValueChanges();
              this.usersOnPlansValueChanges();
            }

            if (
              this.currentOfferType === OfferType.WINBACK ||
              this.currentOfferType === OfferType.RETENTION
            ) {
              this.offerForm.controls.offerCodeType.setValue(
                CodeType.SINGLE_CODE,
              );
            } else {
              this.offerCodeTypeValueChanges();
            }
            this.setDiscountTypes();
            this.discountTypeValueChanges();
            this.discountDurationTypeValueChanges();
            this.offerNameValueChanges();
            this.offerBgImageUrlStatusChanges();
            this.endDateValueChanges();
            this.setupFilter();

            if (this.isUpdateRoute) {
              this.editOffer();
            } else {
              this.createOffer();
            }
          } catch (err) {
            this.openErrorDialog(err, {
              navigateTo: '/inter-offers',
            } as OpenErrorDialogOptions);
          } finally {
            if (!this.isUpdateRoute && !this.duplicateCampaign) {
              this.showForm = true;
              this.loaderService.hide();
            }
          }
        },
        (err) => this.openErrorDialog(err),
      );
  }

  setDiscountTypes(): void {
    if (!this.isRetention) {
      this.discountTypes = this.discountTypesDropdowns.filter((dropdown) => {
        return (
          dropdown.value === DiscountType.FIXED ||
          dropdown.value === DiscountType.TRIAL
        );
      });
    } else {
      this.discountTypes = this.discountTypesDropdowns.filter((dropdown) => {
        return (
          dropdown.value === DiscountType.FIXED ||
          dropdown.value === DiscountType.PERCENT
        );
      });
    }
  }

  updateRegionsOptions(): void {
    this.regionsOptions = [];
    this.regionsLanguagesBinding.forEach((region) => {
      const regionOption = { code: region.code, name: region.name };
      this.regionsOptions.push(regionOption);
    });
  }

  createForm() {
    this.offerForm = this.fb.group({
      regionFilter: [''],
      offerType: [this.currentOfferType, Validators.required],
      plan: ['', Validators.required],
      eligiblePlans: [[]],
      offerCodeType: [''],
      usersOnPlans: [['-']],
      createUpgradeOffer: [false],
      upgradePlan: [''],
      totalUniqueCodes: [
        '',
        [Validators.required, Validators.min(1), Validators.max(99999)],
      ],
      discountType: [''],
      discountAmount: [''],
      discountPercents: [''],
      discountDurationType: ['', Validators.required],
      discountDurationValue: [''],
      discountDurationUnit: ['', Validators.required],
      offerName: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerBusinessOwner: [
        localStorage.email ? localStorage.email : '',
        [Validators.pattern(VALID_TEXT_FIELD_REGEXP)],
      ],
      endDate: ['', validateEndDate()],
      endTime: [{ value: '', disabled: true }],
      noEndDate: [false],
      marketingHeadline: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerHeadline: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      subhead: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerAppliedBanner: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerTerms: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      welcomeEmailText: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      offerBgImageUrl: [
        '',
        {
          asyncValidators: [
            ImageValidator.dimsValidator(this.imgLoader),
            ImageValidator.validateUrlPattern(),
          ],
        },
      ],
      regionsSelectControl: [[]],
      languagesSelectControl: [[]],
      dptrmLink: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      campaignName: ['', [Validators.pattern(VALID_TEXT_FIELD_REGEXP)]],
      targetLaunchDate: ['', validateLaunchDate()],
      claimOfferTerms: [
        this.offersService.getRegionClaimOfferTermsPlaceholder('en'),
      ],
    });

    this.disableControls([
      'offerCodeType',
      'totalUniqueCodes',
      'discountType',
      'discountAmount',
      'discountDurationType',
      'discountDurationValue',
      'discountDurationUnit',
    ]);

    if (this.isRetention) {
      this.disableControls(['plan', 'offerBgImageUrl']);
    } else {
      this.disableControls([
        'eligiblePlans',
        'usersOnPlans',
        'createUpgradeOffer',
        'upgradePlan',
        'discountPercents',
        'claimOfferTerms',
      ]);
    }
  }

  setPlans() {
    this.plans = this.offersService.allPlans.filter((plan) => {
      this.formatPlanDetails(plan);
      return plan.statusId !== StatusEnum.DFT;
    });

    this.masterPlans = this.plansService.masterPlans;
  }

  getRegionPlans(regionCode: string): any[] {
    const regionPlans = this.plans.filter((plan) => {
      return regionCode.toLowerCase() === plan.region;
    });
    regionPlans.sort(
      (a, b) =>
        a.billingCycleDuration - b.billingCycleDuration || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || a.price - b.price,
    );
    return regionPlans;
  }

  getRegionAppropriateToMasterPlan(
    regionCode: string,
    masterPlanCode: any,
    singlePlan?: boolean,
  ): any {
    const regionPlans = this.getRegionPlans(regionCode);
    if (singlePlan || !this.isRetention) {
      if (regionCode === 'US') {
        return this.offerForm.controls.upgradePlan.value;
      }
      const masterPlan = this.masterPlans.filter((plan) => {
        return plan.planCode === masterPlanCode;
      });
      const appropriatePlans: any[] = regionPlans.filter((plan) => {
        const properBillingCycleDuration: boolean =
          plan.billingCycleDuration === masterPlan[0].billingCycleDuration;
        const properTrialDuration: boolean =
          (plan.trialDuration === 0 && masterPlan[0].trialDuration === 0) ||
          (plan.trialDuration !== 0 && masterPlan[0].trialDuration !== 0);
        const properPrice: boolean =
          this.offerForm.get('discountType')?.value === DiscountType.FIXED
            ? plan.price === Number(this.offerForm.get('discountAmount')?.value)
            : true;
        return (
          (properBillingCycleDuration && properTrialDuration && properPrice) ||
          (properBillingCycleDuration && properTrialDuration)
        );
      });
      return appropriatePlans[0];
    } else if (!singlePlan && this.isRetention) {
      const masterPlan = this.masterPlans.filter((plan) => {
        return masterPlanCode.some((planCode) => planCode === plan.planCode);
      });

      const appropriatePlans: any[] = regionPlans.filter((plan) => {
        let properBillingCycleDuration: boolean;
        let properTrialDuration: boolean;
        let properPrice: boolean = true;
        if (masterPlan.length === 1) {
          properBillingCycleDuration =
            plan.billingCycleDuration === masterPlan[0].billingCycleDuration;
          properTrialDuration =
            (plan.trialDuration === 0 && masterPlan[0].trialDuration === 0) ||
            (plan.trialDuration !== 0 && masterPlan[0].trialDuration !== 0);
          properPrice =
            plan.region === 'us' ? plan.price === masterPlan[0].price : true;
        } else if (masterPlan.length > 1) {
          properBillingCycleDuration =
            plan.billingCycleDuration === masterPlan[0].billingCycleDuration ||
            plan.billingCycleDuration === masterPlan[1].billingCycleDuration;
          properTrialDuration =
            (plan.trialDuration === 0 && masterPlan[0].trialDuration === 0) ||
            (plan.trialDuration !== 0 && masterPlan[0].trialDuration !== 0) ||
            (plan.trialDuration === 0 && masterPlan[1].trialDuration === 0) ||
            (plan.trialDuration !== 0 && masterPlan[1].trialDuration !== 0);
          properPrice =
            plan.region === 'us'
              ? plan.price === masterPlan[0].price ||
                plan.price === masterPlan[1].price
              : true;
        } else {
          properBillingCycleDuration = false;
          properTrialDuration = false;
        }
        return properBillingCycleDuration && properTrialDuration && properPrice;
      });

      return appropriatePlans;
    }
  }

  filterRegionsOptions(): void {
    const selectedPlan = !this.isRetention
      ? this.offerForm.controls.plan.value
      : this.offerForm.controls.eligiblePlans.value;
    this.regionsOptions = this.regionsOptions.filter((option) => {
      return !this.isRetention
        ? this.getRegionAppropriateToMasterPlan(option.code, selectedPlan, true)
        : this.getRegionAppropriateToMasterPlan(option.code, selectedPlan)
            ?.length !== 0;
    });
  }

  planValueChanges(regionCode?: string) {
    const planFormControlsName = regionCode ? `${regionCode}-plan` : 'plan';
    this.offerForm
      .get(planFormControlsName)
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((planCode) => {
        if (!regionCode) {
          const currentPlan = this.masterPlans.filter((plan) => {
            return plan.planCode === planCode;
          });

          if (currentPlan) {
            if (this.currentOfferType !== OfferType.WINBACK) {
              this.enableControls(['offerCodeType']);
            } else {
              this.enableControls(['discountType']);
            }
          }

          this.planPrice = currentPlan[0] ? currentPlan[0]['price'] : 0;

          this.planBillingCycleDuration = currentPlan[0]
            ? currentPlan[0]['billingCycleDuration']
            : 0;

          this.setDiscountDurationList(currentPlan[0]);

          if (!this.isUpdateRoute || this.statusID === StatusEnum.DFT) {
            this.resetControls([
              'discountAmount',
              'discountDurationType',
              'discountDurationValue',
              'discountDurationUnit',
            ]);
          }

          this.setDiscountOptions(this.offerForm.get('discountType')?.value);
          this.updateRegionsOptions();
          this.filterRegionsOptions();

          this.regionsData = [];
          this.languagesData = [];
          this.resetControls([
            'regionsSelectControl',
            'languagesSelectControl',
          ]);
        } else {
          this.resetControls([`${regionCode}-price`]);
          const regionPlan = this.findPlanByCode(planCode, regionCode);
          const priceMaxValue = regionPlan ? regionPlan['price'] : 0;
          this.setControlValidators(`${regionCode}-price`, [
            Validators.required,
            Validators.pattern('[0-9]+(.[0-9][0-9]?)?'),
            validatePromoPrice(priceMaxValue as number),
          ]);
          if (
            this.getControlValue('discountDurationType') ===
            DurationType.CUSTOMIZE
          ) {
            this.resetControls([`${regionCode}-durationValue`]);
          } else {
            this.resetControls([`${regionCode}-duration`]);
          }
        }
        if (!regionCode) {
          this.clearLocalizedData();
        }
      });
  }

  eligiblePlansValueChanges(regionCode?: string) {
    const planFormControlsName = regionCode
      ? `${regionCode}-eligiblePlans`
      : 'eligiblePlans';
    this.offerForm
      .get(planFormControlsName)
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((planCodes: string[]) => {
        if (planCodes) {
          if (!regionCode) {
            const currentPlan = this.masterPlans.filter((plan) => {
              return planCodes.includes(plan.planCode);
            });

            if (currentPlan && currentPlan.length) {
              this.upgradeUsersPlan = this.masterPlans.filter(
                (plan) =>
                  plan.billingCycleDuration <
                  currentPlan[0].billingCycleDuration,
              );
              this.showCreateUpgradeOffer =
                currentPlan[0].billingCycleDuration > 1;
            } else {
              this.showCreateUpgradeOffer = false;
              this.offerForm.get('createUpgradeOffer')?.reset();
              this.offerForm.get('usersOnPlans')?.reset(['-']);
            }

            if (currentPlan) {
              this.enableControls(['discountType']);
            }

            this.planPrice = currentPlan[0] ? currentPlan[0]['price'] : 0;
            this.planBillingCycleDuration = currentPlan[0]
              ? currentPlan[0]['billingCycleDuration']
              : 0;
            this.planBillingCycleUnit = currentPlan[0]
              ? currentPlan[0]['billingCycleUnit']
              : '';

            this.setDiscountDurationList(currentPlan[0]);

            if (!this.isUpdateRoute || this.statusID === StatusEnum.DFT) {
              this.resetControls([
                'discountDurationType',
                'discountDurationValue',
                'discountDurationUnit',
              ]);
              if (
                this.getControlValue('discountType') !== DiscountType.PERCENT
              ) {
                this.resetControls(['discountAmount']);
              } else {
                this.resetControls(['discountPercents']);
              }
            }

            this.setDiscountOptions(this.offerForm.get('discountType')?.value);
            this.updateRegionsOptions();
            this.filterRegionsOptions();

            this.regionsData = [];
            this.languagesData = [];
            this.resetControls([
              'regionsSelectControl',
              'languagesSelectControl',
            ]);
          } else {
            this.resetControls([`${regionCode}-price`]);
            const regionPlan = this.findPlanByCode(planCodes[0], regionCode);
            const priceMaxValue = regionPlan ? regionPlan['price'] : 0;
            if (this.getControlValue('discountType') !== DiscountType.PERCENT) {
              this.setControlValidators(`${regionCode}-price`, [
                Validators.required,
                Validators.pattern('[0-9]+(.[0-9][0-9]?)?'),
                validatePromoPrice(priceMaxValue as number),
              ]);
            } else {
              this.setControlValidators(`${regionCode}-price`, [
                Validators.required,
                Validators.min(1),
                Validators.max(100),
              ]);
            }
            if (this.getControlValue(`${regionCode}-createUpgradeOffer`)) {
              this.resetControls([
                `${regionCode}-upgradePlan`,
                `${regionCode}-usersOnPlans`,
              ]);
            }
            if (
              this.getControlValue('discountDurationType') ===
              DurationType.CUSTOMIZE
            ) {
              this.resetControls([`${regionCode}-durationValue`]);
            } else {
              this.resetControls([`${regionCode}-duration`]);
            }
          }
        }
        if (!regionCode) {
          this.clearLocalizedData();
        }
      });
  }

  createUpgradeOfferValueChanges(): void {
    this.offerForm
      .get('createUpgradeOffer')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.clearLocalizedData();
      });
  }

  upgradePlanValueChanges(): void {
    this.offerForm
      .get('upgradePlan')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.clearLocalizedData();
      });
  }

  usersOnPlansValueChanges(): void {
    this.offerForm
      .get('usersOnPlans')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.clearLocalizedData();
      });
  }

  offerCodeTypeValueChanges(): void {
    this.offerForm
      .get('offerCodeType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result === CodeType.BULK_UNIQUE_CODE) {
          this.enableControls(['totalUniqueCodes']);
          this.totalUniqueCodesValueChanges();
        } else {
          this.disableAndResetControls(['totalUniqueCodes']);
        }
        if (result) {
          this.enableControls(['discountType']);
        }
        this.clearLocalizedData();
      });
  }

  totalUniqueCodesValueChanges(): void {
    this.offerForm
      .get('totalUniqueCodes')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.clearLocalizedData();
      });
  }

  discountTypeValueChanges(): void {
    this.offerForm
      .get('discountType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        // if (!this.isUpdateRoute) {
        this.resetControls([
          'discountAmount',
          'discountDurationType',
          'discountDurationValue',
          'discountDurationUnit',
          'welcomeEmailText',
        ]);
        // }

        if (result) {
          switch (result) {
            case DiscountType.FIXED:
              this.enableControls([
                'discountAmount',
                'discountDurationType',
                'discountDurationValue',
                'discountDurationUnit',
                'welcomeEmailText',
              ]);
              this.offerForm.controls.welcomeEmailText.setValue('');
              this.discountAmountValueChanges();
              this.disableAndResetControls(['discountPercents']);
              break;
            case DiscountType.TRIAL:
              this.enableControls([
                'discountDurationType',
                'discountDurationValue',
                'discountDurationUnit',
              ]);
              this.discountAmountValueChanges();
              this.disableAndResetControls([
                'discountPercents',
                'welcomeEmailText',
              ]);
              break;
            case DiscountType.PERCENT:
              this.enableControls([
                'discountPercents',
                'discountDurationType',
                'discountDurationValue',
                'discountDurationUnit',
                'welcomeEmailText',
              ]);
              this.offerForm.controls.welcomeEmailText.setValue('');
              this.discountPercentsValueChanges();
              this.disableAndResetControls(['discountAmount']);
              break;
          }
        }
        this.setDiscountOptions(result);
        this.clearLocalizedData();
      });
  }

  discountDurationTypeValueChanges(): void {
    this.offerForm
      .get('discountDurationType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result === DurationType.CUSTOMIZE) {
          this.enableControls([
            'discountDurationValue',
            'discountDurationUnit',
          ]);
          this.discountDurationValueValueChanges();
        } else {
          this.disableAndResetControls(['discountDurationValue']);
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
        this.setDiscountOptions(this.getControlValue('discountType'));
        this.clearLocalizedData();
      });
  }

  discountPercentsValueChanges(): void {
    this.offerForm
      .get('discountPercents')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.clearLocalizedData();
      });
  }

  discountAmountValueChanges(): void {
    this.offerForm
      .get('discountAmount')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.clearLocalizedData();
      });
  }

  discountDurationValueValueChanges(): void {
    this.offerForm
      .get('discountDurationValue')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.clearLocalizedData();
      });
  }

  offerNameValueChanges(): void {
    this.offerForm
      .get('offerName')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.clearLocalizedData();
      });
  }

  replaceComma(formControlName: string, event: KeyboardEvent): boolean {
    const result = this.offerForm.controls[formControlName].value;
    if (event.key === ',') {
      this.offerForm.controls[formControlName].setValue(result + '.');
      return false;
    } else {
      return true;
    }
  }

  offerBgImageUrlStatusChanges(): void {
    this.offerForm
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
        this.offerForm.updateValueAndValidity({ onlySelf: true });
      });
  }

  endDateValueChanges(): void {
    const endDate = this.offerForm.get('endDate');
    const endTime = this.offerForm.get('endTime');

    endDate?.valueChanges
      .pipe(
        filter(() => endDate.valid),
        takeUntil(this.destroy$),
      )
      .subscribe((val) => {
        if (this.endDateRef) {
          this.maskedInputController = textMask.maskInput({
            inputElement: this.endDateRef.element.nativeElement,
            mask: this.mask,
            guide: true,
            keepCharPositions: true,
          });
        }

        if (val != null) {
          endTime?.setValue('11:59 PM');
        } else {
          endTime?.reset();
        }
      });
  }

  removeNewlines(event, control: AbstractControl, str: string | null = null) {
    if (!str) {
      str = event.clipboardData.getData('text/plain');
    }
    if (str !== str?.trim()) {
      const newData: string = control.value + str;
      control.setValue(newData);
      event.preventDefault();
    }
  }

  setupFilter(): void {
    this.regionsTableData.filterPredicate = (data: Element, filter: string) => {
      const columns: RegionsInterface[] = [];
      const results: any[] = [];

      if (this.regionFilter === '') {
        results.push(true);
      } else if (this.regionFilter !== '') {
        results.push(this.includesSearch(columns, data, this.regionFilter));
      }
      return results.includes(true);
    };
  }

  editOffer(): void {
    this.heading = 'EDIT OFFER';
    this.campaign = this.route.snapshot.paramMap.get('campaign');
    this.loaderService.show('Retrieving offer details...');
    this.fetchInterOffer();
  }

  createOffer(): void {
    this.heading = 'NEW OFFER';
    this.statusID = 0;
    this.offersService.statusId = this.statusID;
    if (this.duplicateCampaign) {
      this.duplicateOffer();
    }
  }

  updateLanguagesOptions() {
    const selectedRegions = this.offerForm.controls.regionsSelectControl;
    const selectedRegionsSet: Set<string> = new Set(selectedRegions.value);
    selectedRegionsSet.delete('-');
    if (selectedRegionsSet.size === 0) {
      this.languagesOptions = [];
    } else {
      this.languagesOptions = [];
      selectedRegionsSet.forEach((region) => {
        const bindedRegion = this.regionsLanguagesBinding.find(
          (bindedRegion) => {
            return bindedRegion.code === region;
          },
        );
        bindedRegion['languages'].forEach((language) => {
          const bindedLanguage = {
            code: bindedRegion.code + '-' + language.code,
            name: bindedRegion.name + ' - ' + language.name,
          };
          this.languagesOptions.push(bindedLanguage);
        });
      });
    }
  }

  onNextTabClick(): void {
    this.selectedIndex = 1;
  }

  onPreviousTabClick(): void {
    this.selectedIndex = 0;
  }

  getOfferTypeViewValue(): string {
    const result: any = this.offerTypes.find((type) => {
      return type.value === this.currentOfferType;
    });
    return result.viewValue;
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

  formatRawPlanDetails(plan) {
    plan.billingCycleUnit = pluralize(
      plan.billingCycleUnit,
      plan.billingCycleDuration,
    );
    if (plan.trialDuration == null || plan.trialDuration === 0) {
      plan['planDetails'] = `${pluralize(
        plan.billingCycleUnit,
        plan.billingCycleDuration,
        plan.billingCycleDuration > 1,
      )}, no trial`;
    } else {
      plan.trialUnit = plan.trialUnit.endsWith('s')
        ? plan.trialUnit.slice(0, -1)
        : plan.trialUnit;
      plan['planDetails'] = `${pluralize(
        plan.billingCycleUnit,
        plan.billingCycleDuration,
        plan.billingCycleDuration > 1,
      )}, ${pluralize(plan.trialUnit, plan.trialDuration, true)} trial`;
    }
  }

  setDiscountDurationList(plan) {
    const result: Dropdown[] = this.isRetention
      ? [{ value: DurationType.SINGLE_USE, viewValue: 'Single Use' }]
      : [];
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

  keyPressNumbersIntOnly(event: KeyboardEvent): void {
    this.offersService.keyPressOnlyNumbers(event);
  }

  keyPressNumbersWithDecimal(event: KeyboardEvent): void {
    this.offersService.keyPressOnlyNumbers(event, true);
  }

  resetControls(controls: string[]): void {
    controls.forEach((control) => {
      this.offerForm.get(control)?.reset();
    });
  }

  setDiscountOptions(type: string): void {
    switch (type) {
      case this.discountTypeEnum.TRIAL:
        this.durationTypes = this.offersService.freeTrialDurationTypes;
        this.regionDurationTypes = this.durationTypes.filter((option) => {
          return option.value !== DurationType.CUSTOMIZE;
        });
        this.offerForm.controls.discountDurationUnit.setValue(
          this.offersService.freeTrialDurationUnits[0].value,
        );
        this.durationValueError = 'Please enter an integer from 1 to 365';
        this.setControlValidators('discountDurationValue', [
          Validators.required,
          Validators.min(1),
          Validators.max(365),
        ]);

        this.disableAndResetControls(['discountAmount']);
        break;
      case this.discountTypeEnum.FIXED:
      case this.discountTypeEnum.PERCENT:
        this.durationTypes = this.typesHolder;
        this.regionDurationTypes = this.typesHolder.filter((option) => {
          return option.value !== DurationType.CUSTOMIZE;
        });
        this.offerForm.controls.discountDurationUnit.setValue(
          this.offersService.priceDurationUnits[0].value,
        );
        this.durationValueError = 'Please enter an integer from 1 to 24';
        this.setControlValidators('discountDurationValue', [
          Validators.required,
          Validators.min(1),
          Validators.max(24),
          validateDiscountDurationValue(this.planBillingCycleDuration),
        ]);

        if (type === this.discountTypeEnum.FIXED) {
          this.enableControls(['discountAmount']);
          this.setControlValidators('discountAmount', [
            Validators.required,
            Validators.pattern('[0-9]+(.[0-9][0-9]?)?'),
            validatePromoPrice(this.planPrice),
          ]);
        } else {
          this.enableControls(['discountPercents']);
          this.setControlValidators('discountPercents', [
            Validators.required,
            Validators.min(1),
            Validators.max(100),
          ]);
        }
        break;
    }
  }

  setControlValidators(
    control: string,
    validators: ValidatorFn[] | null,
  ): void {
    this.offerForm.get(control)?.setValidators(validators);
    this.offerForm.get(control)?.updateValueAndValidity({ onlySelf: true });
  }

  checkControlValue(control: string, value: string): boolean {
    return this.offerForm.get(control)?.value === value;
  }

  enableControls(controls: string[]): void {
    controls.forEach((control) => {
      this.offerForm.get(control)?.enable({ emitEvent: false });
    });
  }

  getRegionCode(viewValue: string): string {
    const region = this.regionsOptions.find((regionOption) => {
      return regionOption.name === viewValue;
    });
    return region.code;
  }

  // Returns language code from hardcoded list
  getLanguageCode(viewValue: string): string {
    const language = this.languagesOptions.find((languageOption) => {
      return languageOption.name === viewValue;
    });
    return language.code;
  }

  // Returns language code from hardcoded list
  getLanguageName(languageCode: string): string {
    const language = this.languagesOptions.find((languageOption) => {
      return languageOption.code === languageCode;
    });
    return language.name;
  }

  getFormattedPlan(selectedPlan: string): string {
    const plan = this.plans.filter((plan) => {
      return plan.planCode === selectedPlan;
    });
    return `${plan[0].planCode} - ${plan[0].planDetails}`;
  }

  getPriceInPercentage(): number {
    const currentPlan = this.masterPlans.find((plan) => {
      return !this.isRetention
        ? plan.planCode === this.getControlValue('plan')
        : plan.planCode === this.getControlValue('eligiblePlans')[0];
    });
    const planPrice: number = currentPlan.price;
    const result: number =
      (100 -
        (100 * (planPrice - Number(this.getControlValue('discountAmount')))) /
          planPrice) /
      100;
    return Number(result.toFixed(2));
  }

  // --- --- ---
  updateRegionsTableData(): void {
    this.updateOfferCodeSuffix();
    const selectedRegions = this.offerForm.controls.regionsSelectControl;
    const selectedRegionsSet: Set<string> = new Set(selectedRegions.value);
    selectedRegionsSet.delete('-');

    if (selectedRegionsSet.size > this.regionsData.length) {
      this.regionsData.forEach((region) => {
        selectedRegionsSet.delete(region.code);
      });
      this.updateSelectedRegionsSet(selectedRegionsSet);
    } else if (selectedRegionsSet.size < this.regionsData.length) {
      const regionsDataStringsSet = new Set<string>();
      this.regionsData.forEach((region) => {
        if (selectedRegionsSet.has(region.code)) {
          regionsDataStringsSet.add(JSON.stringify(region));
        }
      });
      this.regionsData = [];
      regionsDataStringsSet.forEach((regionString: string) => {
        this.regionsData.push(JSON.parse(regionString));
      });
    } else {
      if (
        !this.fetchedSelectedRegionsSet ||
        this.fetchedSelectedRegionsSet.size === 0
      ) {
        this.regionsData = [];
        this.updateSelectedRegionsSet(selectedRegionsSet);
      } else {
        this.fetchedSelectedRegionsSet.forEach((regionCode) => {
          const foundRegion = this.regionsData.find((region) => {
            return region.code === regionCode;
          });
          if (!foundRegion || this.isRegionsOptionDisabled(foundRegion)) {
            selectedRegionsSet.delete(regionCode);
          }
        });
        const regionsDataStringsSet = new Set<string>();
        this.regionsData.forEach((region) => {
          if (this.isRegionsOptionDisabled(region)) {
            regionsDataStringsSet.add(JSON.stringify(region));
          }
        });
        this.regionsData = [];
        regionsDataStringsSet.forEach((regionString: string) => {
          this.regionsData.push(JSON.parse(regionString));
        });
        this.updateSelectedRegionsSet(selectedRegionsSet);
      }
    }

    this.setRegionsTableColumns();

    this.regionsTableData = new MatTableDataSource(this.regionsData);
    this.regionsLength = Number(selectedRegionsSet.size);
    this.regionsTableData.paginator = this.regionsPaginator;
  }

  updateSelectedRegionsSet(selectedRegionsSet: any): void {
    selectedRegionsSet.forEach((selectedRegion) => {
      let duration = '';
      if (
        this.getControlValue('discountDurationType') === DurationType.CUSTOMIZE
      ) {
        duration =
          this.getControlValue('discountDurationValue') +
          '-' +
          this.getControlValue('discountDurationUnit');
      } else {
        duration = this.getControlValue('discountDurationType');
      }

      let price: number | null = 0;
      if (Number(this.getControlValue('discountAmount'))) {
        price =
          selectedRegion === 'US'
            ? Number(this.getControlValue('discountAmount'))
            : Number(
                (
                  this.getPriceInPercentage() *
                  (!this.isRetention
                    ? (this.getRegionAppropriateToMasterPlan(
                        selectedRegion,
                        this.getControlValue('plan'),
                      ) as any)['price']
                    : (this.getRegionAppropriateToMasterPlan(
                        selectedRegion,
                        this.getControlValue('eligiblePlans'),
                      ) as any)[0]['price'])
                ).toFixed(2),
              );
      } else if (this.getControlValue('discountPercents')) {
        price = Number(this.getControlValue('discountPercents'));
      } else {
        price = null;
      }
      const arrayValue = this.getControlValue('discountDurationType')
        ? this.getControlValue('discountDurationType').split('-')
        : null;

      let appropriatePlanCode: any;
      if (!this.isRetention) {
        appropriatePlanCode = this.getRegionAppropriateToMasterPlan(
          selectedRegion,
          this.getControlValue('plan'),
        )['planCode'];
      } else {
        const regionAppropriateEligiblePlans:
          | any[]
          | undefined = this.getRegionAppropriateToMasterPlan(
          selectedRegion,
          this.getControlValue('eligiblePlans'),
        );
        const regionAppropriateEligiblePlanCodes:
          | string[]
          | undefined = regionAppropriateEligiblePlans?.map(
          (plan) => plan.planCode,
        );
        appropriatePlanCode = regionAppropriateEligiblePlanCodes;
      }
      let createUpgradeOffer: any;
      let upgradePlan: any;
      let usersOnPlans: any;
      if (this.getControlValue('createUpgradeOffer')) {
        createUpgradeOffer = this.getControlValue('createUpgradeOffer');
        upgradePlan = this.getRegionAppropriateToMasterPlan(
          selectedRegion,
          this.getControlValue('upgradePlan'),
          true,
        )
          ? this.getRegionAppropriateToMasterPlan(
              selectedRegion,
              this.getControlValue('upgradePlan'),
              true,
            )['planCode']
          : null;
        const usersOnPlansArr: any[] = [];
        if (this.getControlValue('usersOnPlans')[0] !== '-') {
          this.getControlValue('usersOnPlans').forEach((plan) => {
            const regionPlan = this.getRegionAppropriateToMasterPlan(
              selectedRegion,
              plan,
              true,
            );
            if (regionPlan) {
              usersOnPlansArr.push(regionPlan['planCode']);
            }
          });
        }
        usersOnPlans =
          this.getControlValue('usersOnPlans')[0] === '-'
            ? ['-']
            : usersOnPlansArr;
      } else {
        createUpgradeOffer = false;
        upgradePlan = null;
        usersOnPlans = null;
      }
      const durationValue =
        this.getControlValue('discountDurationType') === DurationType.CUSTOMIZE
          ? this.getControlValue('discountDurationValue')
          : arrayValue
          ? Number(arrayValue[0])
          : null;
      const durationUnit =
        this.getControlValue('discountDurationType') === DurationType.CUSTOMIZE
          ? this.getControlValue('discountDurationUnit')
          : arrayValue
          ? arrayValue[1]
          : null;

      const newSelectedRegion: InterFormRegion = {
        code: selectedRegion,
        name: this.getRegionProperty(selectedRegion, 'name'),
        price,
        duration,
        durationValue,
        durationUnit,
        planCode: appropriatePlanCode,
        planViewValue: !this.isRetention
          ? this.getFormattedPlan(appropriatePlanCode)
          : appropriatePlanCode.map((planCode) =>
              this.getFormattedPlan(planCode),
            ),
        offerCode: this.getOfferCode(),
        offerName: this.getControlValue('offerName'),
        editting: false,
        offerCodeStatus: null,
        currencyPrefix: this.getRegionProperty(
          selectedRegion,
          'currencyPrefix',
        ),
        currencyRatio: this.getRegionProperty(selectedRegion, 'currencyRatio'),
        createUpgradeOffer,
        upgradePlan,
        usersOnPlans,
        statusId: 1,
      };

      this.regionsData.push(newSelectedRegion);

      if (
        (this.isRetention &&
          newSelectedRegion.createUpgradeOffer &&
          !newSelectedRegion.upgradePlan) ||
        (this.getControlValue('discountType') !== DiscountType.PERCENT &&
          this.isRegionPriceInvalid(
            newSelectedRegion.planCode as string,
            newSelectedRegion.price as number,
          ))
      ) {
        this.editRegionToggle(newSelectedRegion);
      } else {
        this.validateRegionOfferCode(newSelectedRegion, false);
      }
    });
  }

  isRegionPriceInvalid(planCode: string, controlPrice: number): boolean {
    const planPrice: number = !this.isRetention
      ? this.plans.filter((plan) => plan.planCode === planCode)[0]['price']
      : this.plans.filter((plan) => plan.planCode === planCode[0])[0]['price'];
    if (planPrice !== 0) {
      if (planPrice < Number(controlPrice)) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  setRegionsTableColumns(): void {
    const regionsTableHeadersArr: any[] = [];
    const regionsTableDataKeysArr: any[] = [];
    regionsTableHeadersArr.push('REGION');
    regionsTableDataKeysArr.push('region');
    switch (this.getControlValue('discountType')) {
      case DiscountType.FIXED:
        regionsTableHeadersArr.push('PRICE (LOCAL ENGLISH)');
        regionsTableHeadersArr.push('PRICE (TRANSLATION)');
        regionsTableDataKeysArr.push('price');
        regionsTableDataKeysArr.push('price-translation');
        break;
      case DiscountType.TRIAL:
        break;
      case DiscountType.PERCENT:
        regionsTableHeadersArr.push('PERCENTAGE');
        regionsTableDataKeysArr.push('price');
        break;
    }
    regionsTableHeadersArr.push(
      'DURATION',
      'PLAN',
      'OFFER CODE',
      'OFFER NAME',
      'ACTIONS',
    );
    regionsTableDataKeysArr.push(
      'duration',
      'plan',
      'offerCode',
      'offerName',
      'actions',
    );
    this.regionsTableHeaders = regionsTableHeadersArr;
    this.regionsTableDataKeys = regionsTableDataKeysArr;
  }

  getRegionProperty(regionCode: string, property: string) {
    const selectedRegion = this.regionsLanguagesBinding.find((bindedRegion) => {
      return regionCode === bindedRegion.code;
    });
    return selectedRegion[property];
  }

  getPriceInLocalEnglishFormat(region): string | undefined {
    const regionCode = region.code;
    const currencyPrefix = region.currencyPrefix;
    const price = region.price.toString();

    if (this.getControlValue('discountType') !== 'percent') {
      if (region.editting) {
        return currencyPrefix;
      } else {
        if (['GB', 'BR', 'EC', 'MX', 'UY'].includes(regionCode)) {
          return currencyPrefix + price;
        } else {
          return currencyPrefix + ' ' + price;
        }
      }
    } else {
      if (!region.editting) {
        return price;
      }
    }
  }

  getPriceInTranslationFormat(region): string {
    const regionCode = region.code;
    const currencyPrefix = region.currencyPrefix;
    let price = region.price.toString();

    if (region.editting && this.offerForm.get(regionCode + '-price')?.value) {
      price = this.offerForm.get(regionCode + '-price')?.value.toString();
    }

    const changedPriceFormat = price.split('.').join(',');

    if (['DE', 'ES', 'IT', 'FR', 'BE', 'FI', 'SE'].includes(regionCode)) {
      return changedPriceFormat + ' ' + currencyPrefix;
    } else if (['EC,', 'UY'].includes(regionCode)) {
      return 'USD ' + changedPriceFormat;
    }

    switch (regionCode) {
      case 'AR':
      case 'CO':
        return '$' + ' ' + changedPriceFormat;
      case 'CL':
        return '$' + price;
      case 'DK':
        return changedPriceFormat + ' kr.';
      case 'GB':
        return currencyPrefix + price;
      case 'MX':
        return '$' + price;
      case 'NL':
        return currencyPrefix + ' ' + changedPriceFormat;
      case 'NO':
        return changedPriceFormat + ' kr';
      case 'PE':
        return 'S/ ' + changedPriceFormat;
      default:
        return currencyPrefix + ' ' + price;
    }
  }

  // --- --- ---
  applyRegionFilter(filterValue): void {
    if (filterValue === '') {
      this.regionFilter = '';
      this.regionsTableData.filter = '';
    } else {
      this.regionFilter = filterValue.toLowerCase();
      this.regionsTableData.filter = filterValue.toLowerCase();
    }
  }

  // --- --- ---
  includesSearch(columns, data, filter): boolean | undefined {
    for (const key of columns) {
      if (data[key]) {
        if (key === 'region') {
          if (
            data[key]['viewValue'].toString().toLowerCase().indexOf(filter) !==
            -1
          ) {
            return true;
          }
        } else {
          if (data[key].toString().toLowerCase().indexOf(filter) !== -1) {
            return true;
          }
        }
      }
    }
  }

  // --- --- ---
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

  // Updates languages block with new data from languages formControl value
  updateLanguagesData(): void {
    const selectedLanguages = this.offerForm.controls.languagesSelectControl;
    const selectedLanguagesSet: Set<string> = new Set(selectedLanguages.value);
    selectedLanguagesSet.delete('-');

    if (selectedLanguagesSet.size > this.languagesData.length) {
      this.languagesData.forEach((language) => {
        selectedLanguagesSet.delete(language.code);
      });
      this.updateLanguagesDataFromSet(selectedLanguagesSet);
    } else if (selectedLanguagesSet.size < this.languagesData.length) {
      const tempLangSet = new Set<string>();
      this.languagesData.forEach((lang) => {
        tempLangSet.add(JSON.stringify(lang));
      });
      this.languagesData.forEach((language) => {
        if (!selectedLanguagesSet.has(language.code)) {
          tempLangSet.delete(JSON.stringify(language));
        }
      });
      this.languagesData = [];
      tempLangSet.forEach((lang) => {
        this.languagesData.push(JSON.parse(lang));
      });
    } else if (selectedLanguagesSet.size === this.languagesData.length) {
    } else {
      this.languagesData = [];
      this.updateLanguagesDataFromSet(selectedLanguagesSet);
    }
  }

  updateLanguagesDataFromSet(selectedLanguagesSet: Set<string>): void {
    selectedLanguagesSet.forEach((selectedLanguage) => {
      const newSelectedLanguage: InterFormLanguage = {
        code: selectedLanguage,
        name: this.getLanguageName(selectedLanguage),
        marketingHeadline: this.getControlValue('marketingHeadline'),
        offerHeadline: this.getControlValue('offerHeadline'),
        subhead: this.getControlValue('subhead'),
        offerAppliedBanner: this.getControlValue('offerAppliedBanner'),
        offerTerms: this.getControlValue('offerTerms'),
        editting: false,
      };
      if (this.hasWelcomeEmailText()) {
        newSelectedLanguage.welcomeEmailText = this.getControlValue(
          'welcomeEmailText',
        );
      }
      if (!this.isRetention) {
        newSelectedLanguage.offerBgImageUrl = this.getControlValue(
          'offerBgImageUrl',
        );
      } else {
        if (
          this.getControlValue('claimOfferTerms') ===
          this.offersService.getRegionClaimOfferTermsPlaceholder('us')
        ) {
          const selectedLanguageCode: string = selectedLanguage.substring(
            selectedLanguage.indexOf('-') + 1,
            selectedLanguage.length,
          );
          newSelectedLanguage.claimOfferTerms = this.offersService.getRegionClaimOfferTermsPlaceholder(
            selectedLanguageCode,
          );
        } else {
          newSelectedLanguage.claimOfferTerms = this.getControlValue(
            'claimOfferTerms',
          );
        }
      }
      this.languagesData.push(newSelectedLanguage);
    });
  }

  revertAllLanguagesToDefault(): void {
    const action: DialogAction = {
      message:
        PROCEED_MESSAGE +
        `revert all languages data to default data? \nAll current languages content data will be lost.`,
      action: 'prompt',
    };
    this.openActionDialog(action).subscribe(() => {
      this.languagesData.forEach((language) => {
        language.marketingHeadline = this.getControlValue('marketingHeadline');
        language.offerHeadline = this.getControlValue('offerHeadline');
        language.subhead = this.getControlValue('subhead');
        language.offerAppliedBanner = this.getControlValue(
          'offerAppliedBanner',
        );
        language.offerTerms = this.getControlValue('offerTerms');
        if (this.hasWelcomeEmailText()) {
          language.welcomeEmailText = this.getControlValue('welcomeEmailText');
        }
        if (!this.isRetention) {
          language.offerBgImageUrl = this.getControlValue('offerBgImageUrl');
        }
        language.editting = false;
      });
    });
  }

  // Toggle of language row in languages block edit/default mode
  // (adds/deletes FormControls for columns of language row data)
  editLanguageToggle(elem): void {
    const languageCode = elem.code;
    if (elem.editting) {
      elem.marketingHeadline = this.getControlValue(
        languageCode + '-marketingHeadline',
      );
      elem.offerHeadline = this.getControlValue(
        languageCode + '-offerHeadline',
      );
      elem.subhead = this.getControlValue(languageCode + '-subhead');
      elem.offerAppliedBanner = this.getControlValue(
        languageCode + '-offerAppliedBanner',
      );
      elem.offerTerms = this.getControlValue(languageCode + '-offerTerms');
      if (this.hasWelcomeEmailText()) {
        elem.welcomeEmailText = this.getControlValue(
          languageCode + '-welcomeEmailText',
        );
      } else {
        this.offerForm.removeControl(languageCode + '-welcomeEmailText');
      }
      if (!this.isRetention) {
        elem.offerBgImageUrl = this.getControlValue(
          languageCode + '-offerBgImageUrl',
        );
        this.offerForm.removeControl(languageCode + '-offerBgImageUrl');
      } else {
        elem.claimOfferTerms = this.getControlValue(
          languageCode + '-claimOfferTerms',
        );
        this.offerForm.removeControl(languageCode + '-claimOfferTerms');
      }
      this.offerForm.removeControl(languageCode + '-marketingHeadline');
      this.offerForm.removeControl(languageCode + '-offerHeadline');
      this.offerForm.removeControl(languageCode + '-subhead');
      this.offerForm.removeControl(languageCode + '-offerAppliedBanner');
      this.offerForm.removeControl(languageCode + '-offerTerms');
      this.offerForm.removeControl(languageCode + '-welcomeEmailText');
      elem.editting = false;
    } else {
      this.offerForm.addControl(
        languageCode + '-marketingHeadline',
        new FormControl(elem.marketingHeadline, [
          Validators.required,
          Validators.pattern(VALID_TEXT_FIELD_REGEXP),
        ]),
      );
      this.offerForm.addControl(
        languageCode + '-offerHeadline',
        new FormControl(elem.offerHeadline, [
          Validators.required,
          Validators.pattern(VALID_TEXT_FIELD_REGEXP),
        ]),
      );
      this.offerForm.addControl(
        languageCode + '-subhead',
        new FormControl(elem.subhead, [
          Validators.required,
          Validators.pattern(VALID_TEXT_FIELD_REGEXP),
        ]),
      );
      this.offerForm.addControl(
        languageCode + '-offerAppliedBanner',
        new FormControl(elem.offerAppliedBanner, [
          Validators.required,
          Validators.pattern(VALID_TEXT_FIELD_REGEXP),
        ]),
      );
      this.offerForm.addControl(
        languageCode + '-offerTerms',
        new FormControl(elem.offerTerms, [
          Validators.required,
          Validators.pattern(VALID_TEXT_FIELD_REGEXP),
        ]),
      );
      if (this.hasWelcomeEmailText()) {
        this.offerForm.addControl(
          languageCode + '-welcomeEmailText',
          new FormControl(elem.welcomeEmailText, [
            Validators.required,
            Validators.pattern(VALID_TEXT_FIELD_REGEXP),
          ]),
        );
      }
      if (!this.isRetention) {
        this.offerForm.addControl(
          languageCode + '-offerBgImageUrl',
          new FormControl(elem.offerBgImageUrl, {
            asyncValidators: [
              ImageValidator.dimsValidator(this.imgLoader),
              ImageValidator.validateUrlPattern(),
            ],
          }),
        );
      } else {
        this.offerForm.addControl(
          languageCode + '-claimOfferTerms',
          new FormControl(elem.claimOfferTerms),
        );
      }
      elem.editting = true;
    }
  }

  isRegionHasInvalidFields(regionCode: string): boolean {
    const invalidPrice =
      this.offerForm.controls.discountAmount.enabled ||
      this.offerForm.controls.discountPercents.enabled
        ? this.offerForm.controls[regionCode + '-price'].invalid
        : false;
    const durationFormControl =
      this.offerForm.controls.discountDurationType.value ===
      DurationType.CUSTOMIZE
        ? this.offerForm.controls[regionCode + '-durationValue'].invalid
        : this.offerForm.controls[regionCode + '-duration'].invalid;
    const invalidPlan = !this.isRetention
      ? this.offerForm.controls[regionCode + '-plan'].invalid
      : this.offerForm.controls[regionCode + '-eligiblePlans'].invalid;
    let invalidUpgradePlan: boolean;
    let invalidUsersOnPlans: boolean;
    if (
      this.offerForm.controls[regionCode + '-createUpgradeOffer'] &&
      this.offerForm.controls[regionCode + '-createUpgradeOffer'].value
    ) {
      invalidUpgradePlan = this.offerForm.controls[regionCode + '-upgradePlan']
        .invalid;
      invalidUsersOnPlans = this.offerForm.controls[
        regionCode + '-usersOnPlans'
      ].invalid;
    } else {
      invalidUpgradePlan = false;
      invalidUsersOnPlans = false;
    }
    return (
      invalidPrice ||
      durationFormControl ||
      invalidPlan ||
      this.offerForm.controls[regionCode + '-offerCode'].invalid ||
      this.offerForm.controls[regionCode + '-offerName'].invalid ||
      invalidUpgradePlan ||
      invalidUsersOnPlans
    );
  }

  isAnyRegionOfferCodeInvalid(): boolean {
    const resultSet = new Set<boolean>();
    if (this.regionsData.length !== 0) {
      this.regionsData.forEach((region) => {
        if (region.offerCodeStatus !== 'valid') {
          resultSet.add(false);
        }
      });
      return resultSet.size !== 0;
    } else {
      return false;
    }
  }

  hasWelcomeEmailText(): boolean {
    return !this.checkControlValue('discountType', this.discountTypeEnum.TRIAL);
  }

  isLanguageHasInvalidFields(languageCode: string): boolean {
    const offerBgImageUrlInvalid = !this.isRetention
      ? this.offerForm.controls[languageCode + '-offerBgImageUrl'].invalid
      : false;
    const claimOfferTermsInvalid = this.isRetention
      ? this.offerForm.controls[languageCode + '-claimOfferTerms'].invalid
      : false;
    const welcomeEmailTextInvalid = this.hasWelcomeEmailText()
      ? this.offerForm.controls[languageCode + '-welcomeEmailText'].invalid
      : false;
    return (
      this.offerForm.controls[languageCode + '-marketingHeadline'].invalid ||
      this.offerForm.controls[languageCode + '-offerHeadline'].invalid ||
      this.offerForm.controls[languageCode + '-subhead'].invalid ||
      this.offerForm.controls[languageCode + '-offerAppliedBanner'].invalid ||
      this.offerForm.controls[languageCode + '-offerTerms'].invalid ||
      offerBgImageUrlInvalid ||
      claimOfferTermsInvalid ||
      welcomeEmailTextInvalid
    );
  }

  // --- --- ---
  openInfoModal(fieldName: string, event?: any): void {
    if (event) {
      event.stopPropagation();
    }
    if (fieldName === 'offerExample' || fieldName === 'bannerExample') {
      const offerType: string = this.getOfferTypeViewValue()
        .toLowerCase()
        .replace(/\s/g, '');
      const width: string =
        fieldName === 'offerExample' ||
        this.currentOfferType === OfferType.RETENTION
          ? '80vw'
          : '40vw';
      this.dialog.open(InfoModalComponent, {
        width,
        data: { assetPath: `../../assets/${offerType}_${fieldName}.png` },
      });
    } else {
      this.dialog.open(InfoModalComponent, {
        width: '50vw',
        data: { assetPath: `../../assets/${fieldName}.png` },
      });
    }
  }

  // --- --- ---
  getControlValue(control: string) {
    return this.offerForm.get(control)?.value;
  }

  // --- --- ---
  showBoldedText(): boolean | undefined {
    if (
      !this.plans ||
      (!this.isRetention
        ? !this.getControlValue('plan')
        : !this.getControlValue('eligiblePlan')) ||
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

  // --- --- ---
  generateBoldedTextMsg(): void {
    const DEFAULT_TO = 'If left blank, the Bolded Text would appear as: ';
    const currentPlan = this.plans.filter((plan) => {
      return plan.planCode === this.getControlValue('plan');
    })[0];

    let discountDurationUnit;
    let discountDurationValue;

    if (
      this.checkControlValue('discountDurationType', DurationType.CUSTOMIZE)
    ) {
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
          this.offerBoldedTextMsg = `${DEFAULT_TO} ONLY $${Number(
            this.getControlValue('discountAmount'),
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
          this.offerBoldedTextMsg = `${DEFAULT_TO} $${Number(
            this.getControlValue('discountAmount'),
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

  // --- --- ---
  setBgImgUrl(url: string): void {
    this.offerForm.get('offerBgImageUrl')?.setValue(url);
  }

  // --- --- ---
  getRegionPriceId(regionCode: string): HTMLInputElement {
    return document.getElementById(
      regionCode + 'PriceInput',
    ) as HTMLInputElement;
  }

  // --- --- ---
  stepUp(inputName: string, inputStep: number): void {
    const inputControl = this.offerForm.controls[inputName];
    if (inputControl.disabled) {
      return;
    }
    try {
      const prevValue: number = Number(inputControl.value);
      let newValue = 0;
      if (prevValue) {
        if (prevValue >= 0) {
          newValue = Number(prevValue + inputStep);
        }
      } else {
        newValue = Number(0 + inputStep);
      }
      if (inputStep < 1) {
        newValue = Number(newValue.toFixed(2));
      }
      inputControl.setValue(newValue);
    } catch (err) {
      console.error('stepUp: ', err);
    }
  }

  // --- --- ---
  stepDown(inputName: string, inputStep: number): void {
    const inputControl = this.offerForm.controls[inputName];
    if (inputControl.disabled) {
      return;
    }
    try {
      const prevValue: number = Number(inputControl.value);
      let newValue = 0;
      if (prevValue) {
        if (prevValue >= 0) {
          newValue = Number(prevValue - inputStep);
        }
      } else {
        newValue = Number(0);
      }
      if (inputStep < 1) {
        newValue = Number(newValue.toFixed(2));
      }
      inputControl.setValue(newValue);
    } catch (err) {
      console.error('stepDown: ', err);
    }
  }

  // --- --- ---
  showBgImg(): void {
    this.bgImgUrl = this.offerForm.get('offerBgImageUrl')?.value;
  }

  // --- --- ---
  getOfferCodePattern(): RegExp {
    return environment.production ? /^[a-z0-9_]+$/ : /^samocqa_[a-z0-9_]+$/;
  }

  // --- --- ---
  async checkInterOfferCodeValidation(region): Promise<any> {
    const offerCode = region.offerCode;
    try {
      // TODO: use actual store code
      const storeCode = `twlght-web-${region.code.toLowerCase()}`;
      const response = await this.offersService
        .getOfferCodeValidationResult(offerCode, storeCode, this.currentOfferType)
        .toPromise();
      return response;
    } catch (err) {
      return err;
    }
  }

  // --- --- ---
  getOfferCode(): string {
    const discountType = this.offerForm.controls.discountType;
    return discountType.value === DiscountType.TRIAL
      ? this.getOfferCodePrefix()
      : this.getOfferCodePrefix() + this.offerCodeSuffix;
  }

  // --- --- ---
  getUpgradeOfferCode(): string {
    return this.getOfferCode() + '_upgrade';
  }

  // --- --- ---
  updateOfferCodeSuffix(): void {
    const discountDurationValue = this.getControlValue('discountDurationValue');
    const discountDurationUnit = this.getControlValue('discountDurationUnit');
    const discountDurationType = this.getControlValue('discountDurationType');
    const discountAmount = Math.round(
      Number(this.getControlValue('discountAmount')) * 100,
    );
    if (discountAmount) {
      if (
        this.getControlValue('discountDurationType') === DurationType.CUSTOMIZE
      ) {
        if (discountDurationValue && discountDurationUnit) {
          this.offerCodeSuffix =
            discountAmount + '_for_' + discountDurationValue + 'mo';
        }
      } else {
        if (discountDurationType) {
          let duration: number;
          if (discountDurationType === DurationType.SINGLE_USE) {
            const currentPlanCode = this.getControlValue('eligiblePlans')[0];
            const currentPlan = this.masterPlans.find(
              (plan) => plan.planCode === currentPlanCode,
            );
            duration = currentPlan.billingCycleDuration;
          } else {
            duration = Number(
              discountDurationType.substring(
                0,
                discountDurationType.indexOf('-'),
              ),
            );
          }
          this.offerCodeSuffix = discountAmount + '_for_' + duration + 'mo';
        }
      }
    }
  }

  // --- --- ---
  updateOfferCodeDuration(): void {
    this.offersService.currentDiscountType$
      .pipe(delay(500), takeUntil(this.destroy$))
      .subscribe((type) => {
        if (type && type === DiscountType.FIXED) {
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
                        this.offerCodeSuffix =
                          discountAmount + '_for_' + discountDuration + 'mo';
                      } else if (duration === 'single_use') {
                        this.offersService.currentPlanDuration$
                          .pipe(delay(500), takeUntil(this.destroy$))
                          .subscribe((planDuration) => {
                            this.offerCodeSuffix =
                              discountAmount + '_for_' + planDuration + 'mo';
                          });
                      }
                    } else {
                      this.offerCodeSuffix = '';
                    }
                  });
              } else {
                this.offerCodeSuffix = '';
              }
            });
        } else if (type && type !== DiscountType.FIXED) {
          this.offerCodeSuffix = '';
        }
      });
  }

  // --- --- ---
  getOfferCodePrefix(): string {
    let offerCodePrefix = environment.production ? '' : 'samocqa_';
    let dateString: string = '';
    if (this.regionsData.length === 0) {
      const targetLaunchDate = this.getControlValue('targetLaunchDate');
      dateString = !targetLaunchDate
        ? moment().format('YYMMDD')
        : moment(targetLaunchDate).format('YYMMDD');
    } else {
      const prevOfferCode = this.regionsData[0].offerCode;
      switch (this.currentOfferType) {
        case OfferType.ACQUISITION:
          dateString = prevOfferCode.substring(
            prevOfferCode.indexOf('acq_') + 4,
            prevOfferCode.indexOf('acq_') + 10,
          );
          break;
        case OfferType.WINBACK:
          dateString = prevOfferCode.substring(
            prevOfferCode.indexOf('win_') + 4,
            prevOfferCode.indexOf('win_') + 10,
          );
          break;
        case OfferType.RETENTION:
          dateString = prevOfferCode.substring(
            prevOfferCode.indexOf('ret_') + 4,
            prevOfferCode.indexOf('ret_') + 10,
          );
          break;
      }
    }
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
    }

    return offerCodePrefix;
  }

  // --- --- ---
  disableAndResetControls(controls: string[]): void {
    controls.forEach((control) => {
      this.offerForm.get(control)?.disable();
      this.offerForm.get(control)?.reset();
    });
  }

  // --- --- ---
  disableControls(controls: string[]): void {
    controls.forEach((control) => {
      this.offerForm.get(control)?.disable();
    });
  }

  // --- --- ---
  async duplicateOffer(): Promise<any> {
    this.loaderService.show('Duplicating offer data...');
    try {
      const campaign = await this.offersService
        .getInterOffer(this.duplicateCampaign)
        .toPromise();

      this.currentOfferType = Number(campaign.offerTypeId);
      this.statusID = campaign.statusId;
      this.setFormData(campaign);
      this.setValidRegionsOfferCodes().then(() => {
        this.showForm = true;
        this.loaderService.hide();
      });
    } catch (err) {
      this.openErrorDialog(err, {
        navigateTo: '/inter-offers',
      } as OpenErrorDialogOptions);
    }
  }

  async setValidRegionsOfferCodes(): Promise<any> {
    this.loaderService.show('Validating regions offer codes...');
    const result: any = [];
    try {
      this.regionsData.forEach((region) => {
        result.push(
          this.validateRegionOfferCode(region, true).then((res) => {
            if (res.success) {
              region.offerCodeStatus = 'valid';
            } else {
              region.offerCodeStatus = 'invalid';
            }
            return res.success;
          }),
        );
      });
      return Promise.all(result);
    } catch (err) {
      this.openErrorDialog(err as OpenErrorDialogOptions);
    }
  }

  async validateRegionOfferCode(
    currentRegion,
    updateOfferCode: boolean,
  ): Promise<any> {
    try {
      currentRegion.offerCodeStatus = 'pending';
      let isValidOfferCode = false;
      let result: any = {};
      if (updateOfferCode) {
        while (!isValidOfferCode) {
          currentRegion.offerCode = this.webOffersUtils.getNewOfferCode(
            currentRegion.offerCode,
          );
          result = await this.checkInterOfferCodeValidation(currentRegion);
          if (result.success) {
            isValidOfferCode = true;
          }
        }
      } else {
        result = await this.checkInterOfferCodeValidation(currentRegion);
      }
      const foundRegionForUpdate = this.regionsData.find((region) => {
        return JSON.stringify(region) === JSON.stringify(currentRegion);
      });
      if (foundRegionForUpdate) {
        foundRegionForUpdate.offerCodeStatus = result.success
          ? 'valid'
          : 'invalid';
        if (result.error) {
          foundRegionForUpdate.offerCodeErrorMessage = removeXid(
            result.error.message,
          );
        }
      }
      return result;
    } catch (err) {
      this.openErrorDialog(err as OpenErrorDialogOptions);
    }
  }

  // --- --- ---
  openBackDialog(): void {
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

  // --- --- ---
  navigateBack(): void {
    if (this.isUpdateRoute || this.duplicateCampaign) {
      this.router.navigate([
        `/inter-offers/inter-detail/${this.campaign || this.duplicateCampaign}`,
      ]);
    } else {
      this.router.navigate(['/inter-offers']);
    }
  }

  // --- --- ---
  async fetchInterOffer(): Promise<any> {
    try {
      const campaign: any = await this.offersService
        .getInterOffer(this.campaign)
        .toPromise();
      this.savedOffer = campaign;
      this.currentOfferType = Number(campaign.offerTypeId);
      this.statusID = campaign.statusId;
      this.offersService.statusId = this.statusID;

      this.setFormData(campaign);
    } catch (err) {
      super.openErrorDialog(err);
    } finally {
      this.showForm = true;
      this.loaderService.hide();
    }
  }

  // --- --- ---
  checkOfferCode(): void {
    const offerCodeInput = document.querySelectorAll(
      '[formcontrolname="offerCode"]',
    )[0] as HTMLInputElement;
    (offerCodeInput as HTMLInputElement).focus();
    (offerCodeInput as HTMLInputElement).blur();
  }

  // Sets offer data from previously saved offer
  setFormData(data: any): void {
    const patchData: any = {
      regionFilter: null,
      offerType: data.offerTypeId,
      plan: data.Plan?.planCode,
      eligiblePlans: data.eligiblePlans,
      offerCodeType: data.offerCodeType,
      usersOnPlans: data.usersOnPlans,
      createUpgradeOffer: data.createUpgradeOffer,
      upgradePlan: data.upgradePlan,
      totalUniqueCodes: data.totalUniqueCodes,
      discountType: data.discountType,
      discountAmount:
        data.discountType !== DiscountType.PERCENT
          ? Number(data.discountAmount)
          : null,
      discountPercents:
        data.discountType === DiscountType.PERCENT
          ? Number(data.discountAmount)
          : null,
      discountDurationType:
        this.isRetention &&
        data.discountDurationType === DurationType.SINGLE_USE
          ? DurationType.SINGLE_USE
          : data.discountDurationType === DurationType.CUSTOMIZE
          ? DurationType.CUSTOMIZE
          : data.discountDurationValue + '-' + data.discountDurationUnit,
      discountDurationValue: data.discountDurationValue,
      discountDurationUnit: data.discountDurationUnit,
      campaign: data.campaign,
      offerName: data.offerName,
      offerBusinessOwner: data.offerBusinessOwner,
      endDate: data.endDateTime
        ? moment(data.endDateTime).tz(DEFAULT_TIMEZONE)
        : null,
      endTime: data.endDateTime || null,
      noEndDate: data.noEndDate,
      marketingHeadline: data.marketingHeadline,
      offerHeadline: data.offerHeadline,
      subhead: data.subhead,
      offerAppliedBanner: data.offerAppliedBanner,
      offerTerms: data.offerTerms,
      welcomeEmailText: data.welcomeEmailText,
      offerBgImageUrl: data.offerBgImageUrl,
      claimOfferTerms: data.claimOfferTerms || null,
      dptrmLink: data.dptrmLink,
      campaignName: data.campaignName,
      targetLaunchDate:
        data.targetLaunchDate && data.targetLaunchDate !== 'Invalid date'
          ? moment(data.targetLaunchDate, 'MM/DD/YYYY')
          : null,
      regionsSelectControl: data.regions.map((reg) => reg.code),
      languagesSelectControl: data.languages.map((lang) => lang.code),
    };
    this.bgImgUrl = data.offerBgImageUrl;

    this.offerForm.patchValue(patchData);

    const selectedRegions = this.offerForm.controls.regionsSelectControl;
    const selectedRegionsSet: Set<string> = new Set(selectedRegions.value);
    const selectedLanguages = this.offerForm.controls.languagesSelectControl;
    const selectedLanguagesSet: Set<string> = new Set(selectedLanguages.value);

    this.fetchedSelectedRegionsSet = new Set(patchData.regionsSelectControl);
    this.fetchedSelectedLanguagesSet = new Set(
      patchData.languagesSelectControl,
    );

    this.updateLanguagesOptions();

    const tempRegionsData = data.regions.map((region) => {
      const regionData: InterFormRegion = {
        code: region.code,
        name: this.getRegionProperty(region.code, 'name'),
        price: region.price,
        duration:
          this.isRetention && region.durationType === DurationType.SINGLE_USE
            ? DurationType.SINGLE_USE
            : region.durationValue + '-' + region.durationUnit,
        durationValue: region.durationValue,
        durationUnit: region.durationUnit,
        planCode: !this.isRetention
          ? region.planCode
          : region.eligiblePlanCodes,
        planViewValue: !this.isRetention
          ? this.getFormattedPlan(region.planCode)
          : region.eligiblePlanCodes.map((planCode) =>
              this.getFormattedPlan(planCode),
            ),
        offerCode: region.offerCode,
        offerName: region.offerName,
        offerCodeStatus: this.duplicateCampaign
          ? 'invalid'
          : region.offerCodeStatus,
        statusId: region.statusId,
        currencyPrefix: this.getRegionProperty(region.code, 'currencyPrefix'),
        currencyRatio: this.getRegionProperty(region.code, 'currencyRatio'),
        fetchedOfferCode: region.offerCode,
        usersOnPlans: region.usersOnPlans,
        createUpgradeOffer: region.createUpgradeOffer,
        upgradePlan: region.upgradePlan,
      };
      return regionData;
    });

    this.regionsData = tempRegionsData;

    this.setRegionsTableColumns();

    this.regionsTableData = new MatTableDataSource(this.regionsData);
    this.regionsLength = Number(this.fetchedSelectedRegionsSet.size);
    this.regionsTableData.paginator = this.regionsPaginator;

    this.languagesData = data.languages.map((language) => {
      const languageData: InterFormLanguage = {
        code: language.code,
        name: this.getLanguageName(language.code),
        marketingHeadline: language.marketingHeadline,
        offerHeadline: language.offerHeadline,
        subhead: language.subhead,
        offerAppliedBanner: language.offerAppliedBanner,
        offerTerms: language.offerTerms,
      };
      if (this.hasWelcomeEmailText()) {
        languageData.welcomeEmailText = language.welcomeEmailText;
      }
      if (this.isRetention) {
        languageData.claimOfferTerms = language.claimOfferTerms;
      } else {
        languageData.offerBgImageUrl = language.offerBgImageUrl;
      }
      return languageData;
    });

    selectedRegions.setValue(this.regionsData.map((region) => region.code));
    selectedLanguages.setValue(
      this.languagesData.map((language) => language.code),
    );

    if (this.regionsOptions.length === this.fetchedSelectedRegionsSet.size) {
      selectedRegionsSet.add('-');
      selectedRegions.setValue(Array.from(selectedRegionsSet));
    }
    if (
      this.languagesOptions.length === this.fetchedSelectedLanguagesSet.size
    ) {
      selectedLanguagesSet.add('-');
      selectedLanguages.setValue(Array.from(selectedLanguagesSet));
    }

    if (
      !this.duplicateCampaign &&
      !this.allRegionsStatusesAreDFT(tempRegionsData)
    ) {
      this.setupDisabledFields();
    }
  }

  setupDisabledFields() {
    Object.keys(this.offerForm.controls).forEach((control) => {
      if (this.isFieldDisabled(control)) {
        this.offerForm.get(control)?.disable({ emitEvent: false });
      }
    });
  }

  isFieldDisabled(formField: string) {
    const disabledControlNames: string[] = [
      'plan',
      'eligiblePlans',
      'offerCodeType',
      'usersOnPlans',
      'createUpgradeOffer',
      'upgradePlan',
      'totalUniqueCodes',
      'discountType',
      'discountAmount',
      'discountPercents',
      'discountDurationType',
      'discountDurationValue',
      'discountDurationUnit',
      'offerName',
      'endDate',
      'endTime',
      'noEndDate',
      'offerBusinessOwner',
      'dptrmLink',
      'campaignName',
      'targetLaunchDate',
    ];
    return disabledControlNames.includes(formField);
  }

  allRegionsStatusesAreDFT(tempRegionsData?: any[]): boolean {
    const result: boolean[] = [];
    if (tempRegionsData) {
      tempRegionsData.forEach((region) => {
        if (region.statusId !== StatusEnum.DFT) {
          result.push(false);
        }
      });
    } else {
      this.regionsData.forEach((region) => {
        if (region.statusId !== StatusEnum.DFT) {
          result.push(false);
        }
      });
    }
    return result.length === 0;
  }

  isAllRegionsChecked(): boolean {
    const selectedRegions = this.offerForm.controls.regionsSelectControl;
    const selectedRegionsSet = new Set(selectedRegions.value);
    return (
      selectedRegionsSet.has('-') &&
      selectedRegionsSet.size === this.regionsOptions.length + 1
    );
  }

  // Opens dialog window of removing selected offer from selected regions list
  askUserOfRemovingRegion(region: any, buttonClick: boolean): void {
    if (!this.isRegionsOptionDisabled(region)) {
      const selectedRegions = this.offerForm.controls.regionsSelectControl;

      if (region === '-') {
        const action: DialogAction = {
          message:
            PROCEED_MESSAGE +
            `remove all selected regions ? \nAll binded languages content data with that region will be lost.`,
          action: 'prompt',
        };
        this.openActionDialog(action).subscribe(() => {
          if (buttonClick) {
            selectedRegions.setValue([]);
            this.updateRegionsTableData();
            if (this.regionsData.length !== this.regionsOptions.length) {
              this.removeUnavailableLanguage();
            }
            this.updateLanguagesOptions();
            this.updateLanguagesData();
          } else {
            selectedRegions.setValue([]);
          }
        });
      } else {
        this.checkAllRegionsSelected();
        const action: DialogAction = {
          message:
            PROCEED_MESSAGE +
            `remove ${region.name} region ? \nAll binded languages content data with that region will be lost.`,
          action: 'prompt',
        };
        this.openActionDialog(action).subscribe(() => {
          if (buttonClick) {
            this.removeAndSubmitRegion(region);
          } else {
            this.removeRegion(region);
          }
        });
      }
    }
  }

  // wrapper of two inner functions for template use
  removeAndSubmitRegion(region: any): void {
    this.removeRegion(region);
    this.checkAllRegionsSelected();
    this.updateRegionsTableData();
    if (this.regionsData.length !== this.regionsOptions.length) {
      this.removeUnavailableLanguage();
    }
    this.updateLanguagesOptions();
    this.updateLanguagesData();
  }

  // Removes selected region row from region MatTable
  // (unselects it from regions select list)
  removeRegion(region: any): void {
    if (!this.isRegionsOptionDisabled(region)) {
      const regionsSelectControl = this.offerForm.controls.regionsSelectControl;
      const tempSet = new Set(regionsSelectControl.value);
      tempSet.delete(region.code);
      regionsSelectControl.setValue(Array.from(tempSet));
      this.checkAllRegionsSelected();

      if (region.editting) {
        this.offerForm.removeControl(region.code + '-createUpgradeOffer');
        this.offerForm.removeControl(region.code + '-duration');
        this.offerForm.removeControl(region.code + '-eligiblePlans');
        this.offerForm.removeControl(region.code + '-plan');
        this.offerForm.removeControl(region.code + '-offerCode');
        this.offerForm.removeControl(region.code + '-offerName');
        this.offerForm.removeControl(region.code + '-price');
        this.offerForm.removeControl(region.code + '-upgradePlan');
        this.offerForm.removeControl(region.code + '-usersOnPlans');
      }
    }
  }

  // Toggle of region row in region MatTable edit/default mode
  // (adds/deletes FormControls for columns of region row data)
  editRegionToggle(elem): void {
    const regionCode = elem.code;
    if (!this.isRegionsOptionDisabled(elem)) {
      if (elem.editting) {
        elem.price = Number(this.getControlValue(regionCode + '-price'));
        if (
          this.getControlValue('discountDurationType') ===
          DurationType.CUSTOMIZE
        ) {
          elem.durationValue = this.getControlValue(
            regionCode + '-durationValue',
          );
          elem.duration =
            this.getControlValue(regionCode + '-durationValue') +
            '-' +
            this.getControlValue('discountDurationUnit');
          this.offerForm.removeControl(regionCode + '-durationValue');
        } else {
          const arrayValue = this.getControlValue(
            regionCode + '-duration',
          ).split('-');
          elem.duration = this.getControlValue(regionCode + '-duration');
          elem.durationValue = Number(arrayValue[0]);
          elem.durationUnit = arrayValue[1];
          this.offerForm.removeControl(regionCode + '-duration');
        }
        elem.planCode = !this.isRetention
          ? this.getControlValue(regionCode + '-plan')
          : this.getControlValue(regionCode + '-eligiblePlans');
        elem.planViewValue = !this.isRetention
          ? this.getFormattedPlan(elem.planCode)
          : this.offerForm.controls[
              regionCode + '-eligiblePlans'
            ].value.map((planCode) => this.getFormattedPlan(planCode));
        elem.offerCode = this.getControlValue(regionCode + '-offerCode');
        elem.offerName = this.getControlValue(regionCode + '-offerName');
        this.offerForm.removeControl(regionCode + '-price');
        if (!this.isRetention) {
          this.offerForm.removeControl(regionCode + '-plan');
        } else {
          this.offerForm.removeControl(regionCode + '-eligiblePlans');
          elem.createUpgradeOffer =
            this.getControlValue(regionCode + '-createUpgradeOffer') || false;
          this.offerForm.removeControl(regionCode + '-createUpgradeOffer');
          elem.upgradePlan = elem.createUpgradeOffer
            ? this.getControlValue(regionCode + '-upgradePlan')
            : null;
          this.offerForm.removeControl(regionCode + '-upgradePlan');
          elem.usersOnPlans = elem.createUpgradeOffer
            ? this.getControlValue(regionCode + '-usersOnPlans')
            : null;
          this.offerForm.removeControl(regionCode + '-usersOnPlans');
        }
        this.offerForm.removeControl(regionCode + '-offerCode');
        this.offerForm.removeControl(regionCode + '-offerName');
        elem.editting = false;
        if (elem.offerCode !== elem.fetchedOfferCode) {
          this.validateRegionOfferCode(elem, false).then((res) => {
            if (res.success) {
              elem.offerCodeStatus = 'valid';
            } else {
              elem.offerCodeStatus = 'invalid';
            }
          });
        } else {
          elem.offerCodeStatus = 'valid';
        }
      } else {
        if (this.getControlValue('discountType') !== DiscountType.PERCENT) {
          this.offerForm.addControl(
            regionCode + '-price',
            new FormControl(Number(elem.price), [
              Validators.required,
              Validators.pattern('[0-9]+(.[0-9][0-9]?)?'),
              validatePromoPrice(
                !this.isRetention
                  ? this.plans.filter(
                      (plan) => plan.planCode === elem.planCode,
                    )[0]['price']
                  : this.plans.filter(
                      (plan) => plan.planCode === elem.planCode[0],
                    )[0]['price'],
              ),
            ]),
          );
        } else {
          this.offerForm.addControl(
            regionCode + '-price',
            new FormControl(Number(elem.price), [
              Validators.required,
              Validators.min(1),
              Validators.max(100),
            ]),
          );
        }
        if (
          this.getControlValue('discountDurationType') ===
          DurationType.CUSTOMIZE
        ) {
          switch (this.getControlValue('discountType')) {
            case this.discountTypeEnum.TRIAL:
              this.offerForm.addControl(
                regionCode + '-durationValue',
                new FormControl(elem.durationValue, [
                  Validators.required,
                  Validators.min(1),
                  Validators.max(365),
                ]),
              );
              break;
            case this.discountTypeEnum.FIXED:
            case this.discountTypeEnum.PERCENT:
              this.offerForm.addControl(
                regionCode + '-durationValue',
                new FormControl(elem.durationValue, [
                  Validators.required,
                  Validators.min(1),
                  Validators.max(24),
                  validateDiscountDurationValue(this.planBillingCycleDuration),
                ]),
              );
              break;
          }
        } else {
          this.offerForm.addControl(
            regionCode + '-duration',
            new FormControl(elem.duration, Validators.required),
          );
        }
        if (!this.isRetention) {
          this.offerForm.addControl(
            regionCode + '-plan',
            new FormControl(elem.planCode, Validators.required),
          );
        } else {
          this.offerForm.addControl(
            regionCode + '-eligiblePlans',
            new FormControl(elem.planCode, Validators.required),
          );
          this.offerForm.addControl(
            regionCode + '-createUpgradeOffer',
            new FormControl(elem.createUpgradeOffer || null),
          );
          this.offerForm.addControl(
            regionCode + '-upgradePlan',
            new FormControl(elem.upgradePlan || null, Validators.required),
          );
          this.offerForm.addControl(
            regionCode + '-usersOnPlans',
            new FormControl(elem.usersOnPlans || null, Validators.required),
          );
        }
        this.offerForm.addControl(
          regionCode + '-offerCode',
          new FormControl(elem.offerCode, [
            Validators.required,
            Validators.pattern(this.getOfferCodePattern()),
          ]),
        );
        this.offerForm.addControl(
          regionCode + '-offerName',
          new FormControl(elem.offerName, [
            Validators.required,
            Validators.pattern(VALID_TEXT_FIELD_REGEXP),
          ]),
        );
        !this.isRetention
          ? this.planValueChanges(regionCode)
          : this.eligiblePlansValueChanges(regionCode);
        elem.editting = true;
      }
    }
  }

  clearSearchInput(ref): void {
    ref.value = '';
    this.applyRegionFilter('');
  }

  // Checks if clicked region has selected binded languages
  // (returns true/false)
  isRegionHasActiveLanguages(regionCode: string): boolean {
    const selectedLanguages = this.offerForm.controls.languagesSelectControl;
    const selectedLanguagesSet: Set<string> = new Set(selectedLanguages.value);
    selectedLanguagesSet.delete('-');
    const checkBindedLanguagesArr: boolean[] = [];
    selectedLanguagesSet.forEach((selectedLanguage) => {
      if (selectedLanguage.startsWith(regionCode)) {
        checkBindedLanguagesArr.push(true);
      } else {
        checkBindedLanguagesArr.push(false);
      }
    });
    const checkBindedLanguagesResult = checkBindedLanguagesArr.reduce(
      (out: boolean[], bool) => (bool ? out.concat(bool) : out),
      [],
    );
    return checkBindedLanguagesResult.length !== 0;
  }

  // Checks if any language is selected, accept for earlier saved offer selected languages
  // (returns true/false)
  isAnySelectedLanguageIsActive(): boolean {
    const selectedRegions = this.offerForm.controls.regionsSelectControl;
    const selectedRegionsSet: Set<string> = new Set(selectedRegions.value);
    selectedRegionsSet.delete('-');
    const resultArr: boolean[] = [];
    selectedRegionsSet.forEach((region) => {
      if (this.isRegionHasActiveLanguages(region)) {
        resultArr.push(true);
      }
    });

    return resultArr.length !== 0;
  }

  // Removes unavailable language from formControl value
  // (searches for each region if a language doesn't start with any region name)
  removeUnavailableLanguage(): void {
    const selectedRegions = this.offerForm.controls.regionsSelectControl;
    const selectedRegionsSet: Set<string> = new Set(selectedRegions.value);
    selectedRegionsSet.delete('-');
    const selectedLanguages = this.offerForm.controls.languagesSelectControl;
    const selectedLanguagesSet: Set<string> = new Set(selectedLanguages.value);
    selectedLanguagesSet.delete('-');
    selectedLanguagesSet.forEach((selectedLanguage) => {
      const checkBindedLanguagesArr: boolean[] = [];
      selectedRegionsSet.forEach((selectedRegion) => {
        if (selectedLanguage.startsWith(selectedRegion)) {
          checkBindedLanguagesArr.push(true);
        } else {
          checkBindedLanguagesArr.push(false);
        }
      });
      const checkBindedLanguagesResult = checkBindedLanguagesArr.reduce(
        (out: boolean[], bool) => (bool ? out.concat(bool) : out),
        [],
      );
      if (checkBindedLanguagesResult.length === 0) {
        selectedLanguagesSet.delete(selectedLanguage);
        selectedLanguages.setValue(Array.from(selectedLanguagesSet));
      }
    });
  }

  // Checks if region option in PUSH TO SELECT regions list needs to be disabled
  // (if offer is in Edit Mode AND region option was saved in that offer earlier)
  isRegionsOptionDisabled(region: any): boolean {
    let resultRegion: any;
    if (region.statusId) {
      resultRegion = region;
    } else {
      const foundRegion = this.regionsData.find((reg) => {
        return reg.code === region.code;
      });
      resultRegion = foundRegion;
    }
    return resultRegion
      ? !this.duplicateCampaign && resultRegion.statusId !== StatusEnum.DFT
      : false;
  }

  // Checks if language option in PUSH TO SELECT languages list needs to be disabled
  // (if offer is in Edit Mode AND language option was saved in that offer earlier)
  isLanguagesOptionDisabled(optionValue: string): boolean {
    return (
      this.isUpdateRoute &&
      this.statusID !== StatusEnum.DFT &&
      this.fetchedSelectedLanguagesSet.has(optionValue)
    );
  }

  // Opens detail page of offer by redirecting to "/offers/detail/" page
  openResponseDialog(response): void {
    super
      .openResponse(response)
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          // TODO: get campaign code from response...
          const campaign = response.data?.campaign
            ? response.data.campaign
            : this.campaign
            ? this.campaign
            : this.getOfferCode(); // ???
          if (!campaign) {
            this.router.navigate(['/inter-offers']);
          } else {
            this.router.navigate(['/inter-offers/inter-detail', campaign]);
          }
        }
      });
  }

  // If offer is NOT in Edit Mode AND NO selected region is checked,
  // returns an info string that regions table will not be updated if Master values will be changed
  changeRegionsMasterValues(formControl?: string): void {
    const selectedRegions = this.offerForm.controls.regionsSelectControl;
    const selectedRegionsSet: Set<string> = new Set(selectedRegions.value);
    selectedRegionsSet.delete('-');
    if (
      this.showInfoModalCheck &&
      selectedRegionsSet.size !== 0 &&
      (this.duplicateCampaign || this.allRegionsStatusesAreDFT())
    ) {
      if (formControl === 'createUpgradeOffer') {
        this.offerForm.controls.createUpgradeOffer.setValue(
          !this.getControlValue('createUpgradeOffer'),
        );
      }
      this.showInfoModalCheck = false;
      const message =
        'When changing the settings master data, the regions table and content block will be cleared.';
      const action: DialogAction = {
        message,
        action: 'complete',
      };
      this.openActionDialog(action);
    }
  }

  // calls back functions based on condition to show regions table clearing message
  arrowUpChangeRegionsMasterValues(
    formControlName: string,
    stepAmount: number,
  ): void {
    this.showInfoModalCheck && this.isRegionsMasterBlockValid()
      ? this.changeRegionsMasterValues()
      : this.stepUp(formControlName, stepAmount);
  }

  // calls back functions based on condition to show regions table clearing message
  arrowDownChangeRegionsMasterValues(
    formControlName: string,
    stepAmount: number,
  ): void {
    this.showInfoModalCheck && this.isRegionsMasterBlockValid()
      ? this.changeRegionsMasterValues()
      : this.stepDown(formControlName, stepAmount);
  }

  isRegionsMasterBlockValid(): boolean | undefined {
    const offerFormValid: boolean | undefined =
      (this.offerForm.get('plan')?.disabled ||
        this.offerForm.get('plan')?.valid) &&
      (this.offerForm.get('offerCodeType')?.disabled ||
        this.offerForm.get('offerCodeType')?.valid) &&
      (this.offerForm.get('totalUniqueCodes')?.disabled ||
        this.offerForm.get('totalUniqueCodes')?.valid) &&
      (this.offerForm.get('discountType')?.disabled ||
        this.offerForm.get('discountType')?.valid) &&
      (this.offerForm.get('discountAmount')?.disabled ||
        this.offerForm.get('discountAmount')?.valid) &&
      (this.offerForm.get('discountPercents')?.disabled ||
        this.offerForm.get('discountPercents')?.valid) &&
      (this.offerForm.get('discountDurationType')?.disabled ||
        this.offerForm.get('discountDurationType')?.valid) &&
      (this.offerForm.get('discountDurationValue')?.disabled ||
        this.offerForm.get('discountDurationValue')?.valid) &&
      (this.offerForm.get('discountDurationUnit')?.disabled ||
        this.offerForm.get('discountDurationUnit')?.valid) &&
      (this.offerForm.get('offerName')?.disabled ||
        this.offerForm.get('offerName')?.valid) &&
      (this.offerForm.get('endDate')?.disabled ||
        this.offerForm.get('endDate')?.valid) &&
      (this.offerForm.get('noEndDate')?.disabled ||
        this.offerForm.get('noEndDate')?.valid) &&
      (this.offerForm.get('offerBusinessOwner')?.disabled ||
        this.offerForm.get('offerBusinessOwner')?.valid) &&
      (this.offerForm.get('dptrmLink')?.disabled ||
        this.offerForm.get('dptrmLink')?.valid) &&
      (this.offerForm.get('campaignName')?.disabled ||
        this.offerForm.get('campaignName')?.valid) &&
      (this.offerForm.get('targetLaunchDate')?.disabled ||
        this.offerForm.get('targetLaunchDate')?.valid) &&
      (this.offerForm.get('eligiblePlans')?.disabled ||
        this.offerForm.get('eligiblePlans')?.valid) &&
      (this.offerForm.get('createUpgradeOffer')?.disabled ||
        this.offerForm.get('createUpgradeOffer')?.valid) &&
      (this.offerForm.get('upgradePlan')?.disabled ||
        this.offerForm.get('upgradePlan')?.valid) &&
      (this.offerForm.get('usersOnPlans')?.disabled ||
        this.offerForm.get('usersOnPlans')?.valid);
    if (this.showForm) {
      return offerFormValid;
    } else {
      return true;
    }
  }

  isLanguagesMasterBlockValid(): boolean | undefined {
    const validOfferBgImageUrl: boolean | undefined = !this.isRetention
      ? this.offerForm.get('offerBgImageUrl')?.valid
      : true;
    const validClaimOfferTerms: boolean | undefined = this.isRetention
      ? this.offerForm.get('claimOfferTerms')?.valid
      : true;
    const validWelcomeEmailText:
      | boolean
      | undefined = this.hasWelcomeEmailText()
      ? this.offerForm.get('welcomeEmailText')?.valid
      : true;
    return (
      this.offerForm.get('marketingHeadline')?.valid &&
      this.offerForm.get('offerHeadline')?.valid &&
      this.offerForm.get('subhead')?.valid &&
      this.offerForm.get('offerAppliedBanner')?.valid &&
      this.offerForm.get('offerTerms')?.valid &&
      validOfferBgImageUrl &&
      validClaimOfferTerms &&
      validWelcomeEmailText
    );
  }

  // If offer is NOT in Edit Mode AND NO selected language is checked,
  // returns an info string that languages block will not be updated if Master values will be changed
  changeLanguagesMasterValues(): void {
    const selectedLanguages = this.offerForm.controls.languagesSelectControl;
    const selectedLanguagesSet: Set<string> = new Set(selectedLanguages.value);
    selectedLanguagesSet.delete('-');
    if (selectedLanguagesSet.size !== 0) {
      const message =
        'When changing the content master data, the localized content block will not be updated.';
      const action: DialogAction = {
        message,
        action: 'complete',
      };
      this.openActionDialog(action);
    }
  }

  // --- --- ---
  clearLocalizedData(): void {
    this.regionsData = [];
    this.regionsTableData = new MatTableDataSource(this.regionsData);
    this.offerForm.controls.regionsSelectControl.setValue([]);
    this.languagesData = [];
    this.offerForm.controls.languagesSelectControl.setValue([]);
  }

  // Returns hardcoded offer data similar to server response data
  buildInterOffer(): object {
    if (this.currentOfferType === OfferType.WINBACK || this.isRetention) {
      this.enableControls(['offerCodeType']);
    }
    const offer = this.offerForm.value;
    const regions = this.regionsData.map((region) => {
      const regionData: InterFormRegion = {
        code: region.code,
        price: region.price,
        durationType:
          region.duration === DurationType.SINGLE_USE
            ? DurationType.SINGLE_USE
            : DurationType.TEMPORAL,
        durationValue: Number(region.durationValue) || null,
        durationUnit: region.durationUnit || null,
        offerCode: region.offerCode,
        offerName: region.offerName,
        offerCodeStatus: region.offerCodeStatus,
        statusId: region.statusId ? region.statusId : 0,
      };
      if (this.isRetention) {
        regionData.eligiblePlans = region.planCode;
        regionData.eligiblePlanCodes = region.planCode;
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
      if (this.isOfferCodeTypeBulk()) {
        regionData.totalUniqueCodes = offer.totalUniqueCodes;
        regionData.origTotalUniqueCodes = offer.totalUniqueCodes;
      }
      return regionData;
    });
    const languages = this.languagesData.map((language) => {
      let regionalClaimOfferTerms = '';
      if (this.isRetention) {
        const selectedLanguageCode: string = language.code.substring(
          language.code.indexOf('-') + 1,
          language.code.length,
        );
        const languageRegionsData = this.regionsData.find(
          (region) => region.code === language.code.substring(0, 2),
        );
        const regionalOfferCode: string = languageRegionsData.offerCode;
        regionalClaimOfferTerms =
          language.claimOfferTerms ===
          this.offersService.getRegionClaimOfferTermsPlaceholder(
            selectedLanguageCode,
          )
            ? this.offersService.getRegionClaimOfferTermsPlaceholder(
                selectedLanguageCode,
                regionalOfferCode,
              )
            : language.claimOfferTerms;
      }
      const languageData: InterFormLanguage = {
        code: language.code,
        marketingHeadline: language.marketingHeadline,
        offerHeadline: language.offerHeadline,
        subhead: language.subhead,
        offerAppliedBanner: language.offerAppliedBanner,
        offerTerms: language.offerTerms,
      };
      if (this.hasWelcomeEmailText()) {
        languageData.welcomeEmailText = language.welcomeEmailText;
      }
      if (this.isRetention) {
        languageData.claimOfferTerms = regionalClaimOfferTerms;
      } else {
        languageData.offerBgImageUrl = language.offerBgImageUrl;
      }
      return languageData;
    });
    const result = {
      OfferType: {
        id: this.currentOfferType,
        title: this.getOfferTypeViewValue(),
      },
      Plan: {
        billingCycleDuration: 1,
        billingCycleUnit: 'months',
        planCode: offer.plan,
        planId: 'n8nxe5xe53sc',
        planName: offer.plan,
        price: 8.99,
        state: 'active',
        totalBillingCycles: 1,
        trialDuration: 7,
        trialUnit: 'days',
      },
      Status: {
        id: 1,
        title: 'DFT',
        description: 'Saved to Draft',
      },
      couponExpiredAt: null,
      couponState: 'None',
      csvFileName: null,
      discountAmount:
        this.getControlValue('discountType') !== DiscountType.PERCENT
          ? Number(offer.discountAmount)
          : Number(offer.discountPercents),
      discountDurationUnit:
        offer.discountDurationUnit ||
        offer.discountDurationType.substring(
          offer.discountDurationType.indexOf('-') + 1,
          offer.discountDurationType.length,
        ),
      discountDurationValue:
        offer.discountDurationValue ||
        Number(
          offer.discountDurationType.substring(
            0,
            offer.discountDurationType.indexOf('-'),
          ),
        ),
      discountDurationType:
        offer.discountDurationType ===
          `${offer.discountDurationValue}` + '-' + offer.discountDurationUnit ||
        offer.discountDurationType ===
          offer.discountDurationType.substring(
            0,
            offer.discountDurationType.indexOf('-'),
          ) +
            '-' +
            offer.discountDurationType.substring(
              offer.discountDurationType.indexOf('-') + 1,
              offer.discountDurationType.length,
            )
          ? DurationType.TEMPORAL
          : offer.discountDurationType,
      discountType: offer.discountType,
      endDateTime: offer.endDate ? formatDateTime(offer.endDate, null) : null,
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
      offerTypeId: offer.offerType,
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
      targetLaunchDate: offer.targetLaunchDate
        ? moment(offer.targetLaunchDate).format('MM/DD/YYYY')
        : null,
      regions,
      languages,
      createdBy: localStorage.getItem('username'),
      updatedBy: localStorage.getItem('username'),
    };
    if (!this.isRetention) {
      result['planCode'] = offer.plan;
    } else {
      result['eligiblePlans'] = offer.eligiblePlans;
      result['eligiblePlanCodes'] = offer.eligiblePlans;
    }
    return result;
  }

  // --- --- ---
  showSaveBtn(): boolean {
    return (
      this.route.routeConfig?.path === 'inter-offers/inter-create/:offerType'
    );
  }

  // --- --- ---
  showUpdateBtn(): boolean {
    return (
      (this.route.routeConfig?.path === ROUTE_UPDATE_INTER_OFFER_NAME &&
        this.statusID !== StatusEnum.STG_ERR_CRT &&
        this.statusID <= StatusEnum.STG_VALDN_PASS &&
        this.statusID !== StatusEnum.STG_VALDN_PEND) ||
      (this.route.routeConfig?.path === ROUTE_UPDATE_INTER_OFFER_NAME &&
        this.statusID > StatusEnum.PROD_PEND &&
        this.statusID !== StatusEnum.PROD_ERR_PUB &&
        this.statusID <= StatusEnum.PROD_VALDN_PASS &&
        this.statusID !== StatusEnum.PROD_VALDN_PEND)
    );
  }

  // --- --- ---
  showCreateBtn(): boolean {
    return (
      (this.route.routeConfig?.path ===
        'inter-offers/inter-create/:offerType' &&
        this.statusID <= StatusEnum.STG_VALDN_PASS &&
        this.statusID !== StatusEnum.STG_VALDN_PEND) ||
      (this.route.routeConfig?.path === ROUTE_UPDATE_INTER_OFFER_NAME &&
        this.statusID === StatusEnum.STG_ERR_CRT)
    );
  }

  // --- --- ---
  showPublishBtn(): boolean {
    return (
      this.route.routeConfig?.path === ROUTE_UPDATE_INTER_OFFER_NAME &&
      this.statusID === StatusEnum.PROD_ERR_PUB
    );
  }

  // --- --- ---
  save(): void {
    const action: DialogAction = {
      message: PROCEED_MESSAGE + 'SAVE ?',
      action: 'prompt',
    };
    this.openActionDialog(action).subscribe(() => {
      this.addInterOffer(this.buildInterOffer());
    });
  }

  // --- --- ---
  update(): void {
    const action: DialogAction = {
      message: PROCEED_MESSAGE + 'UPDATE ?',
      action: 'prompt',
    };
    this.openActionDialog(action).subscribe(() => {
      this.enableControls([
        'plan',
        'eligiblePlans',
        'offerCodeType',
        'usersOnPlans',
        'createUpgradeOffer',
        'upgradePlan',
        'totalUniqueCodes',
        'discountType',
        'discountAmount',
        'discountPercents',
        'discountDurationType',
        'discountDurationValue',
        'discountDurationUnit',
        'offerName',
        'endDate',
        'endTime',
        'noEndDate',
        'offerBusinessOwner',
        'dptrmLink',
        'campaignName',
        'targetLaunchDate',
      ]);

      this.updateInterOffer(this.buildInterOffer());
    });
  }

  // Opens dialog window with hardcoded response of properly saved offer
  async addInterOffer(offer: any): Promise<any> {
    try {
      this.loaderService.show();
      const response = await this.offersService
        .addInterDraft(offer)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  // --- --- ---
  async addDraft(offer: any): Promise<any> {
    try {
      this.loaderService.show();
      const response = await this.offersService.addDraft(offer).toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  // --- --- ---
  create(): void {
    const action: DialogAction = {
      message: PROCEED_MESSAGE + 'CREATE ?',
      action: 'prompt',
    };

    this.openActionDialog(action).subscribe(() => {
      this.createInterOffer(this.buildInterOffer());
    });
  }

  // --- --- ---
  async addOffer(offer): Promise<any> {
    try {
      this.loaderService.show();
      const response = await this.offersService.createOffer(offer).toPromise();
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

  // --- --- ---
  async createInterOffer(offer): Promise<any> {
    try {
      this.loaderService.show();
      const response = await this.offersService
        .createInterOffer(offer)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      if (
        err.status === 422 &&
        err.error?.message?.toLowerCase().includes('validation failed') &&
        err.error?.errors?.length > 0
      ) {
        this.openErrorDialog(err, {
          navigateTo: '/inter-offers',
          reload: false,
        } as OpenErrorDialogOptions);
      } else {
        this.openErrorDialog(err, {
          navigateTo: `/inter-offers/inter-detail/${offer.campaign}`,
          errorMessage: `The offer is saved as Draft`,
        } as OpenErrorDialogOptions);
      }
    }
  }

  // --- --- ---
  publish(): void {
    const action: DialogAction = {
      message: PROCEED_MESSAGE + 'PUBLISH ?',
      action: 'prompt',
    };

    this.openActionDialog(action).subscribe(() => {
      this.publishOffer(this.campaign);
    });
  }

  // --- --- ---
  async publishOffer(campaign: string | null): Promise<any> {
    try {
      this.loaderService.show();
      const updatedBy = localStorage.getItem('username');
      const response = await this.offersService
        .publishInterOffer(campaign, updatedBy)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err, {
        navigateTo: `/inter-offers/inter-detail/${campaign}`,
        errorMessage: `The offer failed to publish to PROD`,
      } as OpenErrorDialogOptions);
    }
  }

  // --- --- ---
  async updateInterOffer(offer): Promise<any> {
    const campaignId = this.campaign;
    try {
      this.loaderService.show();
      const response = await this.offersService
        .updateInterOffer(offer, campaignId)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err, {
        navigateTo: `/inter-offers/inter-detail/${campaignId}`,
      } as OpenErrorDialogOptions);
    }
  }

  // --- --- ---
  openActionDialog(action: DialogAction): Observable<boolean> {
    const dialogActionRef = super.openAction(action);
    return dialogActionRef.afterClosed().pipe(
      filter((res) => Boolean(res)),
      takeUntil(this.destroy$),
    );
  }

  // --- --- ---
  listOfUpgradePlans(): PlanResponsePayload[] {
    const eligiblePlans: string[] = this.offerForm.controls.eligiblePlans.value;
    return this.masterPlans.filter((p) => {
      return eligiblePlans.includes(p.planCode);
    });
  }

  // --- --- ---
  getRegionUpgradePlansDropdown(regionCode: string): PlanResponsePayload[] {
    const regionEligiblePlans: string[] = this.getControlValue(
      regionCode + '-eligiblePlans',
    );
    return regionEligiblePlans
      ? this.getRegionPlans(regionCode).filter((p) => {
          return regionEligiblePlans.includes(p.planCode);
        })
      : [];
  }

  // --- --- ---
  getRegionUpgradeUsersPlansDropdown(
    regionCode: string,
  ): PlanResponsePayload[] | null {
    const regionEligiblePlans: string[] = this.getControlValue(
      regionCode + '-eligiblePlans',
    );
    const currentPlan = this.getRegionPlans(regionCode).filter((plan) => {
      return regionEligiblePlans.includes(plan.planCode);
    });
    if (regionEligiblePlans.length !== 0 && currentPlan.length !== 0) {
      return this.getRegionPlans(regionCode).filter((plan) => {
        return plan.billingCycleDuration < currentPlan[0].billingCycleDuration;
      });
    } else {
      return null;
    }
  }

  // --- --- ---
  selectAllUserPlans(regionCode?: string): void {
    const formControlName = regionCode
      ? regionCode + '-usersOnPlans'
      : 'usersOnPlans';
    this.offerForm.controls[formControlName].setValue(['-']);
  }

  // --- --- ---
  selectUserPlan(regionCode?: string): void {
    const formControlName = regionCode
      ? regionCode + '-usersOnPlans'
      : 'usersOnPlans';
    const control = this.offerForm.controls[formControlName];
    control.setValue(
      control.value.filter((p: string) => {
        return p !== '-';
      }),
    );
  }

  // --- --- ---
  formatSelectedPlans(control: AbstractControl, isRegionPlan: boolean): string {
    const selectedPlans = control.value;
    if (selectedPlans.length === 0) {
      return '';
    } else if (selectedPlans.length === 1) {
      if (selectedPlans[0] === '-') {
        return 'All Plans';
      }
      const plan = this.findPlanByCode(
        selectedPlans[0],
        isRegionPlan ? 'true' : null,
      );
      return isRegionPlan
        ? `${plan['planCode']} - ${plan['planDetails']}`
        : `${plan['planDetails']}`;
    } else {
      const firstPlan = this.findPlanByCode(
        selectedPlans[0],
        isRegionPlan ? 'true' : null,
      );
      let sameTermAndPrice = true;
      // display price / term information only if all selected plans have the same plan / term values
      for (let i = 1; i < selectedPlans.length; i++) {
        const anotherPlan = this.findPlanByCode(
          selectedPlans[i],
          isRegionPlan ? 'true' : null,
        );
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
      return isRegionPlan
        ? selectedPlans.join(', ') + termAndPrice
        : this.getRawPlanDetails(firstPlan, false);
    }
  }

  getSelectedPlansDetails(control: AbstractControl): string {
    const selectedPlans = control.value;
    if (selectedPlans.length === 0) {
      return '';
    } else if (selectedPlans.length === 1) {
      if (selectedPlans[0] === '-') {
        return 'All Plans';
      }
      const plan = this.findPlanByCode(selectedPlans[0]);
      return `${plan['planDetails']}`;
    } else {
      const plans = selectedPlans.map((selectedPlan) => {
        const plan = this.findPlanByCode(selectedPlan);
        return `${plan['planDetails']}`;
      });
      return plans.join('; ');
    }
  }

  // --- --- ---
  toggleAllRegions(): void {
    const selectedRegions = this.offerForm.controls.regionsSelectControl;
    const selectedRegionsSet: Set<string> = new Set(selectedRegions.value);
    selectedRegionsSet.delete('-');
    if (selectedRegionsSet.size !== this.regionsOptions.length) {
      const allRegionsArr = this.regionsOptions.map((region) => region.code);
      allRegionsArr.push('-');
      selectedRegions.setValue(allRegionsArr);
    } else {
      selectedRegions.setValue([]);
    }
  }

  // --- --- ---
  toggleAllLanguages(): void {
    const selectedLanguages = this.offerForm.controls.languagesSelectControl;
    const selectedLanguagesSet: Set<string> = new Set(selectedLanguages.value);
    selectedLanguagesSet.delete('-');
    if (selectedLanguagesSet.size !== this.languagesOptions.length) {
      const allLanguagesArr = this.languagesOptions.map(
        (language) => language.code,
      );
      allLanguagesArr.push('-');
      selectedLanguages.setValue(allLanguagesArr);
    } else {
      selectedLanguages.setValue([]);
    }
  }

  // --- --- ---
  checkAllRegionsSelected(): void {
    const selectedRegions = this.offerForm.controls.regionsSelectControl;
    const selectedRegionsSet: Set<string> = new Set(selectedRegions.value);
    selectedRegionsSet.delete('-');
    if (selectedRegionsSet.size === this.regionsOptions.length) {
      selectedRegionsSet.add('-');
    }
    selectedRegions.setValue(Array.from(selectedRegionsSet));
  }

  // --- --- ---
  checkAllLanguagesSelected(): void {
    const selectedLanguages = this.offerForm.controls.languagesSelectControl;
    const selectedLanguagesSet: Set<string> = new Set(selectedLanguages.value);
    selectedLanguagesSet.delete('-');
    if (selectedLanguagesSet.size === this.languagesOptions.length) {
      selectedLanguagesSet.add('-');
    }
    selectedLanguages.setValue(Array.from(selectedLanguagesSet));
  }

  // --- --- ---
  checkActiveLanguages(region: any): void {
    const selectedRegions = this.offerForm.controls.regionsSelectControl;
    const selectedRegionsSet: Set<string> = new Set(selectedRegions.value);
    if (
      !selectedRegionsSet.has(region.code) &&
      this.isRegionHasActiveLanguages(region.code)
    ) {
      selectedRegionsSet.add(region.code);
      selectedRegions.setValue(Array.from(selectedRegionsSet));
      this.askUserOfRemovingRegion(region, false);
    }
  }

  // --- --- ---
  onSubmit(blockName: string): void {
    switch (blockName) {
      case 'regions':
        this.updateRegionsTableData();
        if (this.regionsData.length !== this.regionsOptions.length) {
          this.removeUnavailableLanguage();
          this.removeAllCustomFormControls('languages');
        }
        this.updateLanguagesOptions();
        this.updateLanguagesData();
        this.checkAllLanguagesSelected();
        this.regionsSelectElement.close();
        break;
      case 'languages':
        this.removeAllCustomFormControls(blockName);
        this.updateLanguagesData();
        this.checkAllLanguagesSelected();
        this.languagesSelectElement.close();
        break;
    }
  }

  // --- --- ---
  onReset(blockName: string): void {
    switch (blockName) {
      case 'regions':
        const selectedRegions = this.offerForm.controls.regionsSelectControl;
        if (selectedRegions.value.length !== 0) {
          if (this.isAnySelectedLanguageIsActive()) {
            this.askUserOfRemovingRegion('-', true);
          } else {
            selectedRegions.setValue([]);
            this.removeAllCustomFormControls(blockName);
            this.removeAllCustomFormControls('languages');
            this.updateRegionsTableData();
            this.removeUnavailableLanguage();
            this.updateLanguagesOptions();
            this.updateLanguagesData();
            this.checkAllLanguagesSelected();
          }
        }
        break;
      case 'languages':
        const selectedLanguages = this.offerForm.controls
          .languagesSelectControl;
        if (selectedLanguages.value.length !== 0) {
          selectedLanguages.setValue([]);
          this.removeAllCustomFormControls(blockName);
          this.updateLanguagesData();
        }
        break;
    }
  }

  removeAllCustomFormControls(formControlType: string): void {
    Object.keys(this.offerForm.controls).forEach((controlName) => {
      this[formControlType + 'Data'].forEach((elem) => {
        if (controlName.startsWith(elem.code)) {
          this.offerForm.removeControl(controlName);
        }
      });
    });
  }

  resetButtonDisabled(): boolean {
    return this.isUpdateRoute && this.statusID !== StatusEnum.DFT;
  }

  // --- --- ---
  getPlanDetails(plan: PlanResponsePayload, addTrialInfo = true): string {
    let details = `$${plan.price}/${pluralize(
      plan.billingCycleUnit as string,
      plan.billingCycleDuration,
      (plan.billingCycleDuration as number) > 1,
    )}`;
    if (addTrialInfo) {
      if (plan.trialDuration == null || plan.trialDuration === 0) {
        details += ', no trial';
      } else {
        details += `, ${pluralize(
          plan.trialUnit as string,
          plan.trialDuration,
          true,
        )} trial`;
      }
    }
    return details;
  }

  // --- --- ---
  getRawPlanDetails(plan: PlanResponsePayload, addTrialInfo = true): string {
    let details = `${pluralize(
      plan.billingCycleUnit as string,
      plan.billingCycleDuration,
      (plan.billingCycleDuration as number) > 1,
    )}`;
    if (addTrialInfo) {
      if (plan.trialDuration == null || plan.trialDuration === 0) {
        details += ', no trial';
      } else {
        details += `, ${pluralize(
          plan.trialUnit as string,
          plan.trialDuration,
          true,
        )} trial`;
      }
    }
    return details;
  }

  // --- --- ---
  isPlanAvailable(code: string, regionCode?: string): boolean {
    const control = regionCode
      ? this.offerForm.controls[regionCode + '-eligiblePlans']
      : this.offerForm.controls.eligiblePlans;
    if (control.value.length === 0) {
      return true;
    } else {
      const selectedCode = control.value[0];
      const selectedPlan = this.findPlanByCode(selectedCode, regionCode);
      const plan = this.findPlanByCode(code, regionCode);

      return regionCode
        ? selectedPlan.price === plan.price
        : true &&
            selectedPlan.billingCycleDuration === plan.billingCycleDuration &&
            selectedPlan.billingCycleUnit === plan.billingCycleUnit;
    }
  }

  // --- --- ---
  findPlanByCode(
    code: string,
    regionCode?: string | null,
  ): PlanResponsePayload {
    const plans = regionCode ? this.plans : this.masterPlans;
    const foundPlan = plans.find((plan) => plan.planCode === code);
    return !!foundPlan ? foundPlan : null;
  }

  // --- --- ---
  isOfferCodeTypeBulk(): boolean {
    return this.getControlValue('offerCodeType') === CodeType.BULK_UNIQUE_CODE;
  }

  // --- --- ---
  getRegionOfferCodeLength(regionCode: string): number {
    return this.isRetention &&
      this.getControlValue(regionCode + '-createUpgradeOffer')
      ? this.upgradeOfferCodeLength
      : this.offerCodeLength;
  }

  // --- --- ---
  isAnyFieldNotUpdated(): boolean {
    const regionsCodes = this.regionsOptions.map((option) => option.code);
    const result: boolean[] = [];
    Object.keys(this.offerForm.controls).forEach((controlName) => {
      const controlNameStartsWithRegionCode: boolean = regionsCodes.some(
        (regionCode) => {
          return controlName.startsWith(regionCode);
        },
      );
      if (controlNameStartsWithRegionCode) {
        result.push(false);
      }
    });
    return result.length !== 0;
  }

  // --- --- ---
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
