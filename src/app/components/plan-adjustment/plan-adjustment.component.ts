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
import { OffersService } from '../../../app/service/offers.service';
import { PlansService } from '../../../app/service/plans.service';
import { LoaderService } from '../../../app/service/loader.service';
import { ConfigurationService } from '../../../app/service/configuration.service';
import {
  OfferResponsePayload,
  RetentionOfferFilterRule,
  UserEligibilityStatus,
} from '../../types/payload';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { BaseComponent } from '../../components/base/base.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { InfoModalComponent } from '../info-modal/info-modal.component';
import { DurationType } from '../../types/enum';

@Component({
  selector: 'app-plan-adjustment',
  templateUrl: './plan-adjustment.component.html',
  styleUrls: ['./plan-adjustment.component.scss'],
})
export class PlanAdjustmentComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  dialogResponseSubscription: Subscription;
  @Input() status: number;
  @Input() rule: RetentionOfferFilterRule;
  @Input() plans: any[];
  @Input() createdOffers: any[];
  @Input() isDefault: boolean;
  @Input() index: number;
  @Input() statesList: any[];
  @Input() currentRegion: string;
  @Output() selectedOffersEvent = new EventEmitter<any>();

  public searchText = '';
  public name: string | undefined = '';
  public term: number | null = null;
  public isFreeTrial: boolean | string;
  public activeOffers: string;
  public inactiveOffers: string;
  public allOffers: any[];

  public primaryLists: any = [];
  public secondaryLists: any = [];
  public primaryString: string = 'primary';
  public secondaryString: string = 'secondary';
  // public absentOffersArray1: any[] = [];
  // public absentOffersArray2: any[] = [];

  public weightSumError1;
  public weightSumError2;
  public weightSumError1Handle = false;
  public weightSumError2Handle = false;
  public exclusiveState: string | null = null;
  public exclusiveOffersList: any[] = [];
  public exclusiveOffer: string | null = null;
  // public absentOffersError1;
  // public absentOffersError2;
  // public absentOffersError1Handle = false;
  // public absentOffersError2Handle = false;

  private destroy$ = new Subject<void>();

  public allOffersSet = new Set<string>();
  public errorsSet = new Set<string>();

  public legendExampleStringCode: string = '{offer_code}';
  public legendExampleStringName: string = '{offer_name}';

  constructor(
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public router: Router,
    private offersService: OffersService,
  ) {
    super(dialog, loaderService, router);
  }

  @ViewChild('autosize') autosize: CdkTextareaAutosize;

  ngOnInit(): void {
    this.name = this.rule.name;
    this.term = this.rule.planLengthInMonths ?? 0;
    this.isFreeTrial = this.rule.isInFreeTrial ?? '';
    this.activeOffers = (this.rule.activeCoupons ?? []).join('\n');
    this.inactiveOffers = (this.rule.inactiveCoupons ?? []).join('\n');
    this.primaryLists = [...this.rule.primaryLists];
    this.secondaryLists = [...this.rule.secondaryLists];
    this.getAllEligibleOffers();
    this.setComponentErrors();
    this.emitListInfo(true);
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

  setInitialExclusiveOffersList() {
    if (this.rule.exclusiveOfferOverrides) {
      this.exclusiveState = this.rule.exclusiveOfferOverrides[0].state;
      this.exclusiveOffer = this.rule.exclusiveOfferOverrides[0].offerId;
    }
  }

  getAllEligibleOffers(): void {
    const fetchedOffers = this.offersService.retentionOffersForTerms;
    this.allOffers = this.rule.planLengthInMonths
      ? fetchedOffers.get(this.rule.planLengthInMonths)
      : fetchedOffers.get(0);
    this.allOffers = this.getNotExpiredOffers(this.allOffers);
    this.setOffersListsSets();
  }

  getNotExpiredOffers(offers: any[]): any[] {
    return !!offers && !!offers.length
      ? offers.filter((offer) => offer.couponState !== 'expired')
      : [];
  }

  setOffersListsSets(): void {
    this.allOffersSet.clear();
    this.sortAllOffersListByCreationDate();
    this.allOffers.forEach((offer) => {
      this.allOffersSet.add(offer.offerCode);
    });
    this.setExclusiveOffersList();
  }

  sortAllOffersListByCreationDate(): void {
    this.allOffers.sort((a, b) => {
      const keyA = new Date(a.couponCreatedAt),
        keyB = new Date(b.couponCreatedAt);
      if (keyA < keyB) return 1;
      if (keyA > keyB) return -1;
      return 0;
    });
  }

  setComponentErrors(): void {
    this.weightSumError1 = `big-weight-sum-1`;
    this.weightSumError2 = `big-weight-sum-2`;
    // this.absentOffersError1 = `absent-offer-1`;
    // this.absentOffersError2 = `absent-offer-2`;
  }

  emitListInfo(isInitial?: boolean) {
    this.checkWeightsSum();
    // this.checkAbsentOffers();
    this.checkExclusiveFieldsEmptiness();

    let errorsArray = [];
    if (this.weightSumError1Handle) {
      errorsArray.push(this.weightSumError1);
    }
    if (this.weightSumError2Handle) {
      errorsArray.push(this.weightSumError2);
    }
    // if (this.absentOffersError1Handle) {
    //   errorsArray.push(this.absentOffersError1)
    // }
    // if (this.absentOffersError2Handle) {
    //   errorsArray.push(this.absentOffersError2)
    // }

    let emitData: any = {
      rule: this.rule,
      primaryLists: [...this.primaryLists],
      secondaryLists: [...this.secondaryLists],
      index: this.index,
      errors: [...errorsArray],
      exclusiveOfferOverrides: null,
      isInitial,
    };
    if (
      this.currentRegion === 'US'
        ? this.exclusiveState &&
          this.exclusiveOffer &&
          this.exclusiveState !== '-' &&
          this.exclusiveOffer !== '-'
        : this.exclusiveOffer && this.exclusiveOffer !== '-'
    ) {
      emitData.exclusiveOfferOverrides = this.getExclusiveOfferOverridesData();
    }
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

  getExclusiveOfferOverridesData(): any[] {
    return [
      {
        country: this.currentRegion,
        state: this.exclusiveState,
        offerId: this.exclusiveOffer,
      },
    ];
  }

  resetSearch() {
    this.searchText = null;
  }

  getTooltipText(offer: OfferResponsePayload): string {
    if (!this.plans?.length) {
      return '... / ...';
    }
    let tooltipAmountWithSymbol = '';
    let tooltipAmount = 0.0;
    let tooltipDuration = '';
    let currentPlan = null;

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

  updateRule() {
    this.rule.name = this.name;
    this.rule.planLengthInMonths = this.term ? this.term : null;
    this.rule.isInFreeTrial =
      this.isFreeTrial === '' ? null : this.isFreeTrial === true;
    this.rule.activeCoupons = this.activeOffers
      .split('\n')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    this.rule.inactiveCoupons = this.inactiveOffers
      .split('\n')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    this.getAllEligibleOffers();
    this.emitListInfo();
  }

  canChangeRules() {
    return true;
  }

  addWeightList(listName: string) {
    const weightList = {
      name: '',
      weight: 100,
      offers: [],
    };
    this[listName + 'Lists'].push(weightList);
    this.emitListInfo();
  }

  removeWeightList(listType: string, index: number, listName: string) {
    const type = 'REMOVE';
    const action = {};
    action['message'] = `Do you wish to ${type} "${listName}" list?`;
    action['action'] = 'prompt';
    this.openActionDialog(action, type, listType, index);
  }

  changeWeightListData(listName: string, index: number, data) {
    this[listName + 'Lists'][index] = data;
    this.emitListInfo();
  }

  changeAnotherWeightListData(data) {
    this[data.listName + 'Lists'][data.index] = {
      name: data.name,
      weight: data.weight,
      offers: data.offers,
    };
    this.emitListInfo();
  }

  openActionDialog(action, type, listType, index) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            if (type === 'REMOVE') {
              this[listType + 'Lists'].splice(index, 1);
              this.emitListInfo();
            }
          }
        });
    }
  }

  checkWeightsSum() {
    let sum1: number = 0;
    let sum2: number = 0;

    this.primaryLists.forEach((offer) => {
      sum1 += offer['weight'];
    });
    this.secondaryLists.forEach((offer) => {
      sum2 += offer['weight'];
    });

    if (sum1 > 100) {
      this.weightSumError1Handle = true;
    } else {
      this.weightSumError1Handle = false;
    }
    if (sum2 > 100) {
      this.weightSumError2Handle = true;
    } else {
      this.weightSumError2Handle = false;
    }
  }

  openInfoModal(fieldName: string, event?: any): void {
    if (event) {
      event.stopPropagation();
    }
    let infoString: string;
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
    let exclusiveOffersListSet = new Set<string>();
    if (this.rule.primaryLists.length) {
      this.rule.primaryLists.forEach((list) => {
        if (list.offers.length) {
          list.offers.forEach((offer) => exclusiveOffersListSet.add(offer));
        }
      });
    }
    if (this.rule.secondaryLists.length) {
      this.rule.secondaryLists.forEach((list) => {
        if (list.offers.length) {
          list.offers.forEach((offer) => exclusiveOffersListSet.add(offer));
        }
      });
    }
    this.exclusiveOffersList = ['-', ...Array.from(exclusiveOffersListSet)];
  }

  // checkAbsentOffers() {
  //   this.absentOffersArray1 = [];
  //   this.absentOffersArray2 = [];

  //   this.primaryLists.forEach(listOffer => {
  //     listOffer.offers.forEach(offer => {
  //       if (!this.allOffersSet.has(offer)) {
  //         this.absentOffersArray1.push(offer);
  //       }
  //     });
  //   });

  //   this.secondaryLists.forEach(listOffer => {
  //     listOffer.offers.forEach(offer => {
  //       if (!this.allOffersSet.has(offer)) {
  //         this.absentOffersArray2.push(offer);
  //       }
  //     });
  //   });

  //   if (this.absentOffersArray1.length !== 0) {
  //     this.absentOffersError1Handle = true;
  //   } else {
  //     this.absentOffersError1Handle = false;
  //   }
  //   if (this.absentOffersArray2.length !== 0) {
  //     this.absentOffersError2Handle = true;
  //   } else {
  //     this.absentOffersError2Handle = false;
  //   }
  // }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
