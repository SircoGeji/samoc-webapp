import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { OffersService } from '../../service/offers.service';
import { PlansService } from '../../service/plans.service';
import { LoaderService } from '../../service/loader.service';
import { ConfigurationService } from '../../service/configuration.service';
import {
  OfferResponsePayload,
  RetentionOfferFilterRule,
  UserEligibilityStatus,
} from '../../types/payload';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { BaseComponent } from '../base/base.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { InfoModalComponent } from '../info-modal/info-modal.component';
import { DurationType } from '../../types/enum';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { CancelFlowService } from '../../service/cancel-flow.service';

export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/DD/YYYY',
  },
  display: {
    dateInput: 'MMM Do, YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'MM.DD.YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-plan-adjustment-2',
  templateUrl: './plan-adjustment-2.component.html',
  styleUrls: ['./plan-adjustment-2.component.scss'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ],
})
export class PlanAdjustmentComponent2
  extends BaseComponent
  implements OnInit, OnDestroy {
  dialogResponseSubscription: Subscription;
  @Input() status: number;
  @Input() rule: any;
  @Input() plans: any[];
  @Input() createdOffers: any[];
  @Input() isDefault: boolean;
  @Input() index: number;
  @Input() statesList: any[];
  @Input() currentRegion: string;
  @Input() originalsContentList: any[];
  @Input() allGoogleOffers: any[];
  @Output() selectedOffersEvent = new EventEmitter<any>();

  public formGroup = this.fb.group({});
  public primaryString: string = 'primary';
  public secondaryString: string = 'secondary';
  public weightSumError1;
  public weightSumError2;
  public weightSumError1Handle = false;
  public weightSumError2Handle = false;
  public exclusiveState: string | null = null;
  public exclusiveOffersList: any[] = [];
  public exclusiveOffer: string | null = null;
  public errorsSet = new Set<string>();
  public legendExampleStringCode: string = '{offer_code}';
  public legendExampleStringName: string = '{offer_name}';
  public selectedStorefront: string = '';
  public storefrontOptionsList: any[] = [
    { value: 'apple', name: 'Apple' },
    { value: 'google', name: 'Google' },
    { value: 'recurly', name: 'Recurly' },
    // { value: 'roku', name: 'Roku' },
  ];
  public lastActiveModeOptionsList: any[] = [
    { value: 'before', name: 'Before' },
    { value: 'after', name: 'After' },
  ];
  public churnOptionsList: number[] = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  public allAppleOffers: any[] = [];
  public allAppleOffersSet = new Set<string>();
  public allRecurlyOffers: any = [];
  public allRecurlyOffersSet = new Set<string>();
  public allRokuOffers: any[] = [];
  public allRokuOffersSet = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public router: Router,
    private offersService: OffersService,
    private fb: FormBuilder,
    private cancelFlowService: CancelFlowService,
  ) {
    super(dialog, loaderService, router);
  }

  @ViewChild('autosize') autosize: CdkTextareaAutosize;

  ngOnInit(): void {
    this.setFormGroup();
    this.getAllEligibleOffers();
    this.setComponentErrors();
    this.statesList = [
      {
        regionCode: this.currentRegion,
        stateCode: '-',
        stateName: '-',
      },
      ...this.statesList,
    ];
    this.setInitialExclusiveOffersList();
  }

  setFormGroup(): void {
    if (!this.isDefault) {
      // Filter Roku storefront - will be removed after Roku implementation
      this.rule.storeFront = this.rule.storeFront.filter(
        (storefront) => storefront.name !== 'Roku',
      );
      const selectedStorefronts = this.rule.storeFront.map(
        (storefront) => storefront.name,
      );
      this.formGroup = this.fb.group({
        name: [this.rule.name],
        planLengthInMonths: [this.rule.planLengthInMonths, Validators.required],
        isInFreeTrial: [this.rule.isInFreeTrial ?? ''],
        storeFront: [this.rule.storeFront],
        selectedStorefronts: [
          !!this.rule.selectedStorefronts
            ? this.rule.selectedStorefronts
            : selectedStorefronts,
        ],
        churnScore: [this.rule.churnScore],
        lastLogin: [this.rule.lastLogin],
        dateRangeDirection: [this.rule.dateRangeDirection],
        signUpDateStart: [this.rule.signUpDateStart],
        signUpDateEnd: [this.rule.signUpDateEnd],
        contentActivity: [
          !!this.rule.contentActivity && !!this.rule.contentActivity.length
            ? this.rule.contentActivity.map((v) => Number(v))
            : null,
        ],
        searchText: [''],
        exclusiveState: [''],
        exclusiveOffer: [''],
      });
      this.formGroup.get('planLengthInMonths')?.markAsTouched();
    } else {
      this.formGroup = this.fb.group({
        name: ['Default'],
        storeFront: [this.rule.storeFront],
        searchText: [''],
        exclusiveState: [''],
        exclusiveOffer: [''],
      });
    }
  }

  setInitialExclusiveOffersList() {
    if (this.rule.exclusiveOfferOverrides?.[0]) {
      this.exclusiveState = this.rule.exclusiveOfferOverrides[0].state;
      this.exclusiveOffer = this.rule.exclusiveOfferOverrides[0].offerId;
    }
  }

  getAllEligibleOffers(): void {
    const fetchedOffers = this.offersService.retentionOffersForTerms;
    this.allRecurlyOffers = this.rule.planLengthInMonths
      ? fetchedOffers.get(this.rule.planLengthInMonths)
      : fetchedOffers.get(0);
    // this.allRecurlyOffers = this.getNotExpiredOffers(this.allRecurlyOffers);
    this.setOffersListsSets();
  }

  getNotExpiredOffers(offers: any): any[] {
    return !!offers && !!offers.length
      ? offers.filter((offer) => offer.couponState !== 'expired')
      : [];
  }

  setOffersListsSets(): void {
    this.allRecurlyOffersSet.clear();
    if (!!this.allRecurlyOffers && !!this.allRecurlyOffers.length) {
      this.sortAllOffersListByCreationDate();
      this.allRecurlyOffers.forEach((offer) => {
        this.allRecurlyOffersSet.add(offer.offerCode);
      });
    }
    this.setExclusiveOffersList();
  }

  sortAllOffersListByCreationDate(): void {
    this.allRecurlyOffers.sort((a, b) => {
      const keyA = new Date(a.couponCreatedAt),
        keyB = new Date(b.couponCreatedAt);
      if (keyA < keyB) return 1;
      if (keyA > keyB) return -1;
      return 0;
    });
  }

  setComponentErrors(): void {
    this.weightSumError1 = `${this.index}-big-weight-sum-1`;
    this.weightSumError2 = `${this.index}-big-weight-sum-2`;
  }

  emitListInfo(isInitial?: boolean) {
    this.checkWeightsSum();
    this.checkExclusiveFieldsEmptiness();

    let errorsArray: any = [];
    if (this.formGroup.invalid) {
      for (const [controlName, control] of Object.entries(
        this.formGroup.controls,
      )) {
        if (!!control.errors) {
          errorsArray.push(
            `${this.index}-${controlName}-${Object.keys(control.errors)[0]}`,
          );
        }
      }
    }
    if (this.weightSumError1Handle) {
      errorsArray.push(this.weightSumError1);
    }
    if (this.weightSumError2Handle) {
      errorsArray.push(this.weightSumError2);
    }
    const rule = {
      countries: ['US'],
      exclusiveOfferOverrides: this.getExclusiveOfferOverridesData(),
      filterPriority: Number(this.index) + 1,
      ...this.formGroup.value,
    };
    if (
      !!this.formGroup.value.contentActivity &&
      !!this.formGroup.value.contentActivity.length
    ) {
      rule.contentActivity = this.formGroup.value.contentActivity.map(
        (el) => `${el}`,
      );
    }
    if (!!rule.selectedStorefronts && !!rule.selectedStorefronts.length) {
      let storeFront: any[] = [];
      rule.selectedStorefronts.forEach((storefrontName) => {
        const foundStoreFront = rule.storeFront.find(
          (storeFront) => storeFront.name === storefrontName,
        );
        if (!foundStoreFront) {
          storeFront.push({
            name: storefrontName,
            primaryLists: [],
            secondaryLists: [],
          });
        } else {
          storeFront.push(foundStoreFront);
        }
      });
      rule.storeFront = storeFront;
    }
    let emitData: any = {
      rule,
      index: Number(this.index),
      errors: [...errorsArray],
      exclusiveOfferOverrides: null,
      isInitial,
    };
    this.selectedOffersEvent.emit(emitData);
    this.setOffersListsSets();
  }

  checkExclusiveFieldsEmptiness(): void {
    if (this.exclusiveState === '-') {
      this.exclusiveOffer = '-';
    }
    if (this.exclusiveOffer === '-') {
      this.exclusiveState = '-';
    }
  }

  getExclusiveOfferOverridesData(): any[] | null {
    return !!this.currentRegion &&
      !!this.exclusiveState &&
      !!this.exclusiveOffer
      ? [
          {
            country: this.currentRegion,
            state: this.exclusiveState,
            offerId: this.exclusiveOffer,
          },
        ]
      : null;
  }

  resetSearch() {
    this.formGroup.get('searchText')?.reset();
  }

  getTooltipText(offer: any): string {
    if (!this.plans?.length) {
      return '... / ...';
    }
    let tooltipAmountWithSymbol = '';
    let tooltipAmount = 0.0;
    let tooltipDuration = '';
    let currentPlan: any = null;

    let upgradeTo = '';
    if (offer.forceUserToPlanCode) {
      currentPlan = this.plans.find((plan) => {
        upgradeTo = `(upgrade to ${offer.forceUserToPlanCode})\n`;
        return plan['planCode'] === offer.forceUserToPlanCode;
      });
    } else if (offer.eligiblePlans[0]) {
      currentPlan = this.plans.find((plan) => {
        return plan['planCode'] === offer.eligiblePlans[0];
      });
    }

    if (!currentPlan) {
      currentPlan = { price: 0.0, term: 'XX' };
    }

    const planDuration = currentPlan['term'];
    if (offer.discountDurationUnit && offer.discountDurationValue) {
      if (offer.discountDurationType === DurationType.TEMPORAL) {
        tooltipDuration = 'for ';
        tooltipDuration += `${offer.discountDurationValue} ${offer.discountDurationUnit}`;
        tooltipDuration += offer.discountDurationValue > 1 ? 's' : '';
      } else if (offer.discountDurationType === DurationType.FOREVER) {
        tooltipDuration = DurationType.FOREVER;
      }
    } else {
      tooltipDuration = 'for ' + currentPlan['term'];
    }

    if (offer.discountType === 'fixed') {
      tooltipAmount = currentPlan['price'] - offer.discountAmount;
      tooltipAmountWithSymbol = `$${tooltipAmount.toFixed(2)}`;
    } else if (offer.discountType === 'percent') {
      tooltipAmountWithSymbol = `${offer.discountAmount}%`;
    }

    return `${offer.offerCode} \n${upgradeTo}${tooltipAmountWithSymbol} / ${planDuration} ${tooltipDuration}`;
  }

  getOfferLinkUrl(offer): string {
    if (!offer) {
      return '#';
    }
    return `#/offers/detail/${offer.offerCode}`;
  }

  hasOfferDetailPage(offerCode: string): boolean {
    const result = this.createdOffers.find((offer) => {
      return offer.offerCode === offerCode;
    });
    if (!result) {
      return false;
    }
    return Boolean(Object.keys(result).length);
  }

  updateRule(input: string = '') {
    switch (input) {
      case 'plan':
        this.getAllEligibleOffers();
        this.emitListInfo();
        break;
      default:
        this.emitListInfo();
        break;
    }
  }

  canChangeRules() {
    return true;
  }

  addWeightList(storefrontIndex: number, listIndex: number) {
    const weightList = {
      name: '',
      weight: 100,
      offers: [],
    };
    let storefrontValue = this.formGroup.value.storeFront;
    switch (listIndex) {
      case 0:
        storefrontValue[storefrontIndex].primaryLists.push(weightList);
        break;
      case 1:
        storefrontValue[storefrontIndex].secondaryLists.push(weightList);
        break;
    }
    (this.formGroup.get('storeFront') as FormControl).setValue(storefrontValue);
    this.emitListInfo();
  }

  removeWeightList(
    storefrontIndex: number,
    listTypeIndex: number,
    index: number,
    listName: string,
  ) {
    const type = 'REMOVE';
    const action = {};
    action['message'] = `Do you wish to ${type} "${listName}" list?`;
    action['action'] = 'prompt';
    this.openActionDialog(action, type, storefrontIndex, listTypeIndex, index);
  }

  changeWeightListData(
    storefrontIndex: number,
    listTypeIndex: number,
    listIndex: number,
    data,
  ) {
    let storefrontValue = this.formGroup.value.storeFront;
    switch (listTypeIndex) {
      case 0:
        !this.isDefault
          ? (storefrontValue[storefrontIndex].primaryLists[listIndex] = data)
          : (storefrontValue[storefrontIndex].primaryLists = data);
        break;
      case 1:
        !this.isDefault
          ? (storefrontValue[storefrontIndex].secondaryLists[listIndex] = data)
          : (storefrontValue[storefrontIndex].secondaryLists = data);
        break;
    }
    (this.formGroup.get('storeFront') as FormControl).setValue(storefrontValue);
    this.emitListInfo();
  }

  changeAnotherWeightListData(data) {
    let storefrontValue = this.formGroup.value.storeFront;
    switch (data.listTypeIndex) {
      case 0:
        !this.isDefault
          ? (storefrontValue[data.storefrontIndex].primaryLists[
              data.listIndex
            ] = {
              name: data.name,
              weight: data.weight,
              offers: data.offers,
            })
          : (storefrontValue[data.storefrontIndex].primaryLists = data.offers);
        break;
      case 1:
        !this.isDefault
          ? (storefrontValue[data.storefrontIndex].secondaryLists[
              data.listIndex
            ] = {
              name: data.name,
              weight: data.weight,
              offers: data.offers,
            })
          : (storefrontValue[data.storefrontIndex].secondaryLists =
              data.offers);
        break;
    }
    this.emitListInfo();
  }

  openActionDialog(
    action,
    type,
    storefrontIndex: number,
    listTypeIndex: number,
    index,
  ) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            if (type === 'REMOVE') {
              let storefrontValue = this.formGroup.value.storeFront;
              switch (listTypeIndex) {
                case 0:
                  storefrontValue[storefrontIndex].primaryLists.splice(
                    index,
                    1,
                  );
                  break;
                case 1:
                  storefrontValue[storefrontIndex].secondaryLists.splice(
                    index,
                    1,
                  );
                  break;
              }
              this.emitListInfo();
            }
          }
        });
    }
  }

  checkWeightsSum() {
    if (!!this.formGroup.value && !!this.formGroup.value.storeFront) {
      let resultsArr1: boolean[] = [];
      let resultsArr2: boolean[] = [];

      this.formGroup.value.storeFront.forEach((storefront) => {
        let sum1: number = 0;
        let sum2: number = 0;

        storefront.primaryLists.forEach((offer) => {
          if (!!offer.weight) {
            sum1 += offer.weight;
          }
        });
        storefront.secondaryLists.forEach((offer) => {
          if (!!offer.weight) {
            sum2 += offer.weight;
          }
        });

        resultsArr1.push(!(sum1 > 100));
        resultsArr2.push(!(sum2 > 100));
      });

      if (resultsArr1.includes(false)) {
        this.weightSumError1Handle = true;
      } else {
        this.weightSumError1Handle = false;
      }
      if (resultsArr2.includes(false)) {
        this.weightSumError2Handle = true;
      } else {
        this.weightSumError2Handle = false;
      }
    }
  }

  isStorefrontSelected(name: string): boolean {
    return (
      !!this.formGroup.value.selectedStorefronts &&
      !!this.formGroup.value.selectedStorefronts.length &&
      this.formGroup.value.selectedStorefronts.includes(name)
    );
  }

  openInfoModal(fieldName: string, event?: any): void {
    if (event) {
      event.stopPropagation();
    }
    let infoString: string = '';
    switch (fieldName) {
      case 'freeTrialInfo':
        infoString = `If set - will apply condition to match current user Free Trial status to this value.
          I.e. if user is in free trial and this flag set to Yes this condition will succeed.
          Another successful validation would be if current user not is in Free Trial and this flag is set to No.`;
        break;

      case 'activeOffersInfo':
        infoString = `Active Offers will apply condition to match current user Active coupons with this list.
          Values in this list can be wildcards (only match any number of symbols wildcard '*' is supported) to match bulk coupons.
          (New line delimited)`;
        break;

      case 'inactiveOffersInfo':
        infoString = `Inactive Offers will apply condition to match current user Inactive coupons with this list.
          Values in this list can be wildcards (only match any number of symbols wildcard '*' is supported) to match bulk coupons.
          (New line delimited)`;
        break;
    }
    this.dialog.open(InfoModalComponent, {
      width: '50vw',
      data: {
        assetPath: null,
        infoText: infoString,
      },
    });
  }

  setExclusiveOffersList() {
    // let exclusiveOffersListSet = new Set<string>();
    // if (this.rule.primaryLists.length) {
    //   this.rule.primaryLists.forEach((list) => {
    //     if (list.offers.length) {
    //       list.offers.forEach((offer) => exclusiveOffersListSet.add(offer));
    //     }
    //   });
    // }
    // if (this.rule.secondaryLists.length) {
    //   this.rule.secondaryLists.forEach((list) => {
    //     if (list.offers.length) {
    //       list.offers.forEach((offer) => exclusiveOffersListSet.add(offer));
    //     }
    //   });
    // }
    // this.exclusiveOffersList = ['-', ...Array.from(exclusiveOffersListSet)];
  }

  getFormControlValue(formControlName: string) {
    return this.formGroup.get(formControlName)?.value;
  }

  getStorefrontAllOffers(storefrontName: string): any[] {
    switch (storefrontName) {
      case this.storefrontOptionsList[0].value:
        return this.allAppleOffers;
      case this.storefrontOptionsList[1].value:
        return this.allGoogleOffers;
      case this.storefrontOptionsList[2].value:
        return this.allRecurlyOffers;
      // case this.storefrontOptionsList[3].value:
      //   return this.allRokuOffers;
      default:
        return [];
    }
  }

  elementDragStarted(event) {
    this.cancelFlowService.currentDraggedContainerIdSubject$.next(
      event.source.dropContainer.id,
    );
  }

  elementDragFinished(event) {
    this.cancelFlowService.currentDraggedContainerIdSubject$.next(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
