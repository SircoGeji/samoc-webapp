import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../base/base.component';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PlansService } from '../../service/plans.service';
import { LoaderService } from '../../service/loader.service';
import { ConfigurationService } from '../../service/configuration.service';
import { FIELDS_LOOKUP, PROCEED_MESSAGE } from '../../constants';
import { Dropdown, PlanRequestPayload, Store } from '../../types/payload';
import { planCodeValidator } from '../../validators/plan-code-validator';
import { specialPlanCodeValidator } from '../../validators/special-plan-code-validator';
import { HttpClient } from '@angular/common/http';
import * as pluralize from 'pluralize';
import { DurationType } from '../../types/enum';

export const VALID_PLAN_CODE_REGEXP = /^[a-z0-9+_-]{1,50}$/;

@Component({
  selector: 'app-plan-form',
  templateUrl: './plan-form.component.html',
  styleUrls: ['./plan-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PlanFormComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  planCode: string;
  planForm: FormGroup;
  planDetails: string;
  heading: string;
  requestType: string;
  status: number;
  publishButtonText: string;
  store: Store;
  dialogResponseSubscription: Subscription;
  dialogActionSubscription: Subscription;
  dialogSubscription: Subscription;
  routerSubscription: Subscription;
  billingCycleSubscription: Subscription;
  trialOfferSubscription: Subscription;
  storeSubscription: Subscription;
  billingCycleSelector: string;
  trialOffer: string;

  billingCycleTypes: Dropdown[] = [
    { value: '1-months', viewValue: '1 Month' },
    { value: '3-months', viewValue: '3 Months' },
    { value: '6-months', viewValue: '6 Months' },
    { value: '1-year', viewValue: '1 Year' },
    { value: DurationType.CUSTOMIZE, viewValue: 'Customize' },
  ];
  trialOfferTypes: Dropdown[] = [
    { value: 'none', viewValue: 'No Trial' },
    { value: '7-days', viewValue: '7 Days' },
    { value: '14-days', viewValue: '14 Days' },
    { value: DurationType.CUSTOMIZE, viewValue: 'Customize' },
  ];

  billingCycleUnits: Dropdown[] = [
    { value: 'days', viewValue: 'Days' },
    { value: 'months', viewValue: 'Months' },
  ];

  constructor(
    private formBuilder: FormBuilder,
    public dialog: MatDialog,
    public router: Router,
    private route: ActivatedRoute,
    private plansService: PlansService,
    private configurationService: ConfigurationService,
    public loaderService: LoaderService,
    private http: HttpClient,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.planForm = this.formBuilder.group({
      planCode: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern(VALID_PLAN_CODE_REGEXP),
          specialPlanCodeValidator(),
        ],
        [
          planCodeValidator(
            this.http,
            this.configurationService.store.value.storeCode,
            this.formatPlanDetails.bind(this),
          ),
        ],
      ],
      // samoc-272 - commented out for phase 2
      // planPrice: [
      //   '',
      //   [
      //     Validators.required,
      //     Validators.pattern('[0-9]+(.[0-9][0-9]?)?'),
      //     Validators.min(0),
      //   ],
      // ],
      // billingCycle: ['', Validators.required],
      // billingCycleDuration: [''],
      // billingCycleUnit: [''],
      // trialOffer: ['', Validators.required],
      // trialDuration: [''],
      // trialUnit: [''],
    });
    // samoc-272 - commented out for phase 2
    // this.setupFormValidators();
    if (this.route.routeConfig.path === 'plans/update/:planCode') {
      this.heading = 'EDIT PLAN';

      this.routerSubscription = this.route.paramMap.subscribe(
        (params: ParamMap) => {
          this.requestType = 'put';
          this.planCode = params.get('planCode');
          this.fetchPlan();
        },
      );
    } else {
      this.heading = 'NEW PLAN';
      this.requestType = 'post';
      this.publishButtonText = 'CREATE';
    }
    this.storeSubscription = this.configurationService.store.subscribe(
      (value) => {
        if (value !== null) {
          this.store = value;
        }
      },
    );
  }

  // setupFormValidators() {
  //   const billingCycleDurationValidator = this.planForm.get(
  //     'billingCycleDuration',
  //   );
  //   const billingCycleUnitValidator = this.planForm.get('billingCycleUnit');
  //   const trialDurationValidator = this.planForm.get('trialDuration');
  //   const trialUnitValidator = this.planForm.get('trialUnit');
  //   this.billingCycleSubscription = this.planForm
  //     .get('billingCycle')
  //     .valueChanges.subscribe((type) => {
  //       if (type === DurationType.CUSTOMIZE) {
  //         this.planForm
  //           .get('billingCycleDuration')
  //           .setValue('', { emitEvent: false });
  //         this.planForm
  //           .get('billingCycleUnit')
  //           .setValue('', { emitEvent: false });
  //         billingCycleDurationValidator.setValidators([
  //           Validators.required,
  //           Validators.pattern('^(0|[1-9][0-9]*)$'),
  //           Validators.min(1),
  //         ]);
  //         billingCycleUnitValidator.setValidators([Validators.required]);
  //       } else {
  //         billingCycleDurationValidator.setValidators(null);
  //         billingCycleUnitValidator.setValidators(null);
  //       }
  //       billingCycleDurationValidator.updateValueAndValidity();
  //       billingCycleUnitValidator.updateValueAndValidity();
  //     });
  //
  //   this.trialOfferSubscription = this.planForm
  //     .get('trialOffer')
  //     .valueChanges.subscribe((type) => {
  //       if (type === DurationType.CUSTOMIZE) {
  //         this.planForm.get('trialDuration').setValue('', { emitEvent: false });
  //         this.planForm.get('trialUnit').setValue('', { emitEvent: false });
  //         trialDurationValidator.setValidators([
  //           Validators.required,
  //           Validators.pattern('^(0|[1-9][0-9]*)$'),
  //           Validators.min(1),
  //         ]);
  //         trialUnitValidator.setValidators([Validators.required]);
  //       } else {
  //         trialDurationValidator.setValidators(null);
  //         trialUnitValidator.setValidators(null);
  //       }
  //       trialDurationValidator.updateValueAndValidity();
  //       trialUnitValidator.updateValueAndValidity();
  //     });
  // }

  async fetchPlan() {
    try {
      const data = await this.plansService.getPlan(this.planCode).toPromise();
      this.status = data.statusId;
      this.publishButtonText = 'UPDATE';
      this.patchValues(data);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  patchValues(data) {
    this.planForm.patchValue({
      planCode: data.planCode,
      planPrice: data.price,
      billingCycle: this.checkCustomize(data, 'billing'),
      billingCycleDuration: data.billingCycleDuration,
      billingCycleUnit: data.billingCycleUnit,
      trialOffer: this.checkCustomize(data, 'trial'),
      trialDuration: data.trialDuration,
      trialUnit: data.trialUnit,
    });
    this.planForm.get('planCode').disable();
    this.setupDisabledFields();
  }

  setupDisabledFields() {
    Object.keys(this.planForm.controls).forEach((key) => {
      if (this.disable(key)) {
        this.planForm.get(key).disable({ emitEvent: false });
      }
    });
  }

  disable(key) {
    const array = FIELDS_LOOKUP[key];
    return !!array.includes(this.status);
  }

  createPlan() {
    const plan: PlanRequestPayload = {
      planCode: this.planForm.controls.planCode.value,
      // samoc-272 - commented out for phase 2
      // price: +this.planForm.controls.planPrice.value,
    };
    // samoc-272 - commented out for phase 2
    // if (this.billingCycleSelector === DurationType.CUSTOMIZE) {
    //   plan.billingCycleDuration = +this.planForm.controls.billingCycleDuration
    //     .value;
    //   plan.billingCycleUnit = this.planForm.controls.billingCycleUnit.value;
    // } else {
    //   const defaultValue = this.planForm.controls.billingCycle.value;
    //   const array = defaultValue.split('-');
    //   plan.billingCycleDuration = +array[0];
    //   plan.billingCycleUnit = array[1];
    // }
    //
    // if (this.trialOffer === DurationType.CUSTOMIZE) {
    //   plan.trialDuration = +this.planForm.controls.trialDuration.value;
    //   plan.trialUnit = this.planForm.controls.trialUnit.value;
    // } else if (this.trialOffer !== 'none') {
    //   const defaultValue = this.planForm.controls.trialOffer.value;
    //   const array = defaultValue.split('-');
    //   plan.trialDuration = +array[0];
    //   plan.trialUnit = array[1];
    // }
    this.planCode = this.planForm.controls.planCode.value;
    return plan;
  }

  onSubmit(type) {
    const action: { message?: string; action?: string } = {};
    if (
      (this.requestType === 'post' && type === 'save') ||
      (this.requestType === 'put' && type === 'save')
    ) {
      action.message = PROCEED_MESSAGE + 'SAVE ?';
    } else if (this.requestType === 'post' && type === 'publish') {
      action.message = PROCEED_MESSAGE + 'CREATE ?';
    } else {
      action.message = PROCEED_MESSAGE + 'UPDATE ?';
    }
    action.action = 'prompt';
    this.openActionDialog(action, type);
  }

  processAction(type) {
    const plan = this.createPlan();
    if (this.requestType === 'post' && type === 'save') {
      this.addDraft(plan);
    } else if (this.requestType === 'post' && type === 'publish') {
      this.addPlan(plan);
    } else if (this.requestType === 'put') {
      this.updatePlan(plan);
    }
  }

  async addDraft(plan) {
    try {
      this.loaderService.show();
      const response = await this.plansService
        .addDraft(plan, this.store)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    } finally {
      this.loaderService.hide();
    }
  }

  async addPlan(plan) {
    try {
      this.loaderService.show();
      const response = await this.plansService
        .addPlan(plan, this.store)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    } finally {
      this.loaderService.hide();
    }
  }

  async updatePlan(plan) {
    try {
      this.loaderService.show();
      const response = await this.plansService
        .updatePlan(plan, this.planCode)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    } finally {
      this.loaderService.hide();
    }
  }

  openBackDialog() {
    if (this.planForm.dirty) {
      const dialogRef = super.openBack();
      this.dialogSubscription = dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.planForm.reset();
          this.router.navigate(['/plans']);
        }
      });
    } else {
      this.router.navigate(['/plans']);
    }
  }

  openResponseDialog(response) {
    const dialogResponseRef = super.openResponse(response);
    this.dialogResponseSubscription = dialogResponseRef
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.router.navigate(['/plans/detail', this.planCode]);
        }
      });
  }

  openActionDialog(action, type) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogActionSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            this.processAction(type);
          }
        });
    }
  }

  checkCustomize(data, selector) {
    let durationType = '';
    let type = [];
    if (selector === 'billing') {
      durationType = data.billingCycleDuration + '-' + data.billingCycleUnit;
      type = this.billingCycleTypes.filter((obj) => {
        return obj['value'] === durationType;
      });
    } else {
      if (data.trialDuration == null && data.trialUnit == null) {
        durationType = 'none';
      } else {
        durationType = data.trialDuration + '-' + data.trialUnit;
        type = this.trialOfferTypes.filter((obj) => {
          return obj['value'] === durationType;
        });
      }
    }
    if (type.length === 0 && durationType !== 'none') {
      durationType = DurationType.CUSTOMIZE;
    }
    return durationType;
  }

  formatPlanDetails(plan) {
    plan.billingCycleUnit = pluralize(
      plan.billingCycleUnit,
      plan.billingCycleDuration,
    );
    if (plan.trialDuration == null || plan.trialDuration === 0) {
      this.planDetails = `$${plan.price}/${pluralize(
        plan.billingCycleUnit,
        plan.billingCycleDuration,
        plan.billingCycleDuration > 1,
      )}, no trial.`;
    } else {
      plan.trialUnit = plan.trialUnit.endsWith('s')
        ? plan.trialUnit.slice(0, -1)
        : plan.trialUnit;
      this.planDetails = `$${plan.price}/${pluralize(
        plan.billingCycleUnit,
        plan.billingCycleDuration,
        plan.billingCycleDuration > 1,
      )}, ${plan.trialDuration} ${plan.trialUnit} trial.`;
    }
  }

  ngOnDestroy() {
    if (this.routerSubscription !== undefined) {
      this.routerSubscription.unsubscribe();
    }
    if (this.dialogSubscription !== undefined) {
      this.dialogSubscription.unsubscribe();
    }
    if (this.dialogActionSubscription !== undefined) {
      this.dialogActionSubscription.unsubscribe();
    }
    if (this.dialogResponseSubscription !== undefined) {
      this.dialogResponseSubscription.unsubscribe();
    }
    if (this.billingCycleSubscription !== undefined) {
      this.billingCycleSubscription.unsubscribe();
    }
    if (this.trialOfferSubscription !== undefined) {
      this.trialOfferSubscription.unsubscribe();
    }
    if (this.storeSubscription !== undefined) {
      this.storeSubscription.unsubscribe();
    }
  }
}
