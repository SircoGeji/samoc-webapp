import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { LoaderService } from '../../service/loader.service';
import {
  OfferResponsePayload,
  RetentionOfferFilterRule,
  UserEligibilityStatus,
} from '../../types/payload';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

import { Subject } from 'rxjs';
import { ShareService } from '../../service/share.service';
import { OffersService } from '../../service/offers.service';
import { DurationType } from '../../types/enum';
import { CancelFlowService } from '../../service/cancel-flow.service';
import { takeUntil } from 'rxjs/operators';
import { BaseComponent } from '../base/base.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-weight-list-2',
  templateUrl: './weight-list-2.component.html',
  styleUrls: ['./weight-list-2.component.scss'],
})
export class WeightListComponent2
  extends BaseComponent
  implements OnInit, OnDestroy {
  @Input() list: any[];
  @Input() storefrontIndex: number;
  @Input() storefrontName: string;
  @Input() listIndex: number;
  @Input() status: number;
  @Input() listName: string;
  @Input() rule: any;
  @Input() allOffers: any[];
  @Input() plans: any[];
  @Input() isDefault: boolean;
  @Output() changeWeightListDataEvent = new EventEmitter<any>();
  @Output() changeAnotherWeightListDataEvent = new EventEmitter<any>();
  @Output() weightListRemoveEvent = new EventEmitter<any>();

  public name: string = '';
  public weightValue: number = 1;
  public offers: any[] = [];

  private destroy$ = new Subject<void>();
  private draggedContainerId: string | null = null;
  private price: number | null = null;
  private duration: string = '';

  constructor(
    public dialog: MatDialog,
    public router: Router,
    public loaderService: LoaderService,
    private ss: ShareService,
    private offersService: OffersService,
    private cancelFlowService: CancelFlowService,
  ) {
    super(dialog, loaderService, router);
  }

  @ViewChild('autosize') autosize: CdkTextareaAutosize;

  ngOnInit(): void {
    // this.subscribeToDraggedElement();
    this.setWeightListData();
  }

  // samoc-2046:
  // subscribeToDraggedElement() {
  //   this.cancelFlowService.currentDraggedContainerId$
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe((value) => {
  //       if (!!value) {
  //         this.draggedContainerId = value;
  //       } else if (value === null) {
  //         this.draggedContainerId = null;
  //       }
  //       this.setWeightListData();
  //     });
  // }

  setWeightListData() {
    if (this.list['weight']) {
      this.weightValue = this.list['weight'];
    } else {
      this.weightValue = 100;
    }
    if (this.list['name']) {
      this.name = this.list['name'];
      this.duration = this.name.split('/')[1];
    } else {
      this.name = this.getListFormattedName();
    }
    if (this.list['price']) {
      this.price = this.list['price'];
    }
    if (!this.isDefault && this.list['offers']) {
      this.offers = [...this.list['offers']];
    } else if (!!this.isDefault) {
      this.offers = this.list;
    } else {
      this.offers = [];
    }
  }

  canChangeRules() {
    return true;
  }

  setValidOffersArray() {
    this.offers = this.offers.map((offer) => {
      if (!offer.offerCode) {
        return offer;
      } else {
        return offer.offerCode;
      }
    });
  }

  setNonDuplicateOffers() {
    let result = new Set<string>();
    this.offers.forEach((offer) => {
      result.add(offer);
    });
    this.offers = [...result];
  }

  setValidWeight() {
    if (
      this.weightValue === null ||
      this.weightValue === undefined ||
      this.weightValue > 100
    ) {
      this.weightValue = 100;
    } else if (this.weightValue < 1) {
      this.weightValue = 1;
    }
  }

  deleteFromList(checkOffer) {
    this.offers.forEach((offer, i) => {
      if (offer === checkOffer) {
        this.offers.splice(i, 1);
      }
    });
    if (!this.offers.length) {
      this.price = 0;
      this.duration = '';
      this.name = '';
    }
    this.emitListData();
  }

  emitListData() {
    this.setValidOffersArray();
    this.setNonDuplicateOffers();
    this.setValidWeight();
    if (!this.isDefault) {
      this.changeWeightListDataEvent.emit({
        name: this.name,
        weight: this.weightValue,
        offers: [...this.offers],
        price: this.price,
        currency: 'USD',
      });
    } else {
      this.changeWeightListDataEvent.emit([...this.offers]);
    }
  }

  deleteWeightList() {
    this.weightListRemoveEvent.emit(this.listIndex);
  }

  getDropListID() {
    return `${this.storefrontName}-${this.listName}-offers-list-${
      this.listIndex + 1
    }`;
  }

  onDrop(event: CdkDragDrop<string[]>) {
    if (this.canDropElement(event)) {
      this.ss.drop2(event);
      this.name = this.getListFormattedName();
      this.emitListData();
      this.emitAnotherListData(event);
    } else {
      this.openErrorDialog(
        {
          message: 'Offer price differs from other offers prices on the list',
        },
        { reload: false },
      );
    }
  }

  canDropElement(event): boolean {
    const droppedElem = event.previousContainer.data[event.previousIndex];
    if (!this.price) {
      return true;
    }
    switch (this.storefrontName) {
      case 'apple':
        return true;
      case 'google':
        return !!droppedElem
          ? Number(droppedElem.priceAmount) === this.price
          : true;
      case 'recurly':
        let foundRecurlyOffer: any = null;
        if (!droppedElem.discountAmount || !droppedElem.eligiblePlans) {
          foundRecurlyOffer = this.allOffers.find(
            (offer) =>
              offer.offerCode === this.offers[0].offerCode ||
              offer.offerCode === this.offers[0],
          );
        } else {
          foundRecurlyOffer = droppedElem;
        }
        const foundPlan = this.plans.find(
          (plan) => plan.planCode === droppedElem.eligiblePlans[0],
        );
        const droppedElementPrice =
          Number(foundPlan.price) - Number(droppedElem.discountAmount);
        return !!droppedElementPrice
          ? Number(droppedElementPrice.toFixed(2)) === this.price
          : true;
      default:
        return true;
    }
  }

  emitAnotherListData(event) {
    const previousContainerId: string = event.previousContainer.id as string;
    const currentContainerId: string = event.container.id as string;
    if (
      (!previousContainerId.includes('all') &&
        !currentContainerId.includes('all')) ||
      previousContainerId !== currentContainerId
    ) {
      const listIndex = parseInt(event.previousContainer.id.slice(-1)) - 1;

      let prevName: string = '';
      let prevWeight: number | null = null;
      let listTypeIndex: number | null = null;
      if (!!previousContainerId.includes('primary')) {
        const offerList = this.rule.storeFront[this.storefrontIndex]
          .primaryLists[listIndex];
        listTypeIndex = 0;
        if (!!event.previousContainer.data.length) {
          prevName = offerList['name'];
        }
        prevWeight = offerList['weight'];
      } else if (!!previousContainerId.includes('secondary')) {
        const offerList = this.rule.storeFront[this.storefrontIndex]
          .secondaryLists[listIndex];
        listTypeIndex = 1;
        if (!!event.previousContainer.data.length) {
          prevName = offerList['name'];
        }
        prevWeight = offerList['weight'];
      }
      this.changeAnotherWeightListDataEvent.emit({
        storefrontIndex: this.storefrontIndex,
        listTypeIndex,
        listIndex,
        name: prevName,
        weight: prevWeight,
        offers: [...event.previousContainer.data],
        price: this.getWeightListPrice(),
        currency: 'USD',
      });
    }
  }

  getOfferName(offerCode: string): string {
    const result: any = this.offersService.allGlRetentionOffers.get(offerCode);
    if (result) {
      return result.offerName;
    } else {
      return offerCode;
    }
  }

  isAbsentOffer(checkingOffer: string) {
    return !!this.allOffers && !!this.allOffers.length
      ? !this.allOffers.some((offer) => offer.offerCode === checkingOffer)
      : true;
  }

  getTooltipText(offerOrCode: string | OfferResponsePayload): string {
    let offer: OfferResponsePayload | any;
    if (typeof offerOrCode == 'string') {
      offer = this.offersService.allGlRetentionOffers.get(offerOrCode);
      if (!offer) {
        return offerOrCode;
      }
    } else {
      offer = offerOrCode;
    }
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
        tooltipDuration = 'forever';
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

  getWeightListPrice() {
    const priceSubstring = this.name.split('/')[0];
    if (!priceSubstring) {
      return null;
    }
    const priceValue = Number(priceSubstring.split('$')[1]);
    if (!priceValue) {
      return null;
    }
    return priceValue;
  }

  // samoc-2046:
  // [cdkDropListEnterPredicate]="canDrop" - suggestion to add and configure in component's html
  canDrop() {
    return true;
    return !!this.draggedContainerId
      ? this.draggedContainerId?.includes(this.storefrontName)
      : false;
  }

  getListFormattedName(): string {
    if (!!this.price && !!this.duration) {
      return `$${this.price}/${this.duration}`;
    } else {
      switch (this.storefrontName) {
        case 'apple':
          return '';
        case 'google':
          if (!this.offers.length) {
            return '';
          }
          const foundGoogleOffer = this.allOffers.find(
            (offer) =>
              offer.offerCode === this.offers[0].offerCode ||
              offer.offerCode === this.offers[0],
          );
          if (!foundGoogleOffer) {
            return '';
          }
          this.price = !!foundGoogleOffer.priceAmount
            ? Number(foundGoogleOffer.priceAmount)
            : null;
          this.duration = !!foundGoogleOffer.termDuration
            ? `${foundGoogleOffer.termDuration}mo`
            : '';
          return !!this.price && this.duration
            ? `$${this.price}/${this.duration}`
            : '';
        case 'recurly':
          if (!this.offers.length) {
            return '';
          }
          const foundRecurlyOffer = this.allOffers.find(
            (offer) =>
              offer.offerCode === this.offers[0].offerCode ||
              offer.offerCode === this.offers[0],
          );
          if (!foundRecurlyOffer) {
            return '';
          }
          const foundPlan = this.plans.find(
            (plan) => plan.planCode === foundRecurlyOffer.eligiblePlans[0],
          );
          if (!foundPlan) {
            return '';
          }
          const foundPrice =
            Number(foundPlan.price) - Number(foundRecurlyOffer.discountAmount);
          this.price = !!foundRecurlyOffer.discountAmount
            ? Number(foundPrice.toFixed(2))
            : null;
          this.duration = !!foundRecurlyOffer.discountDurationValue
            ? `${foundRecurlyOffer.discountDurationValue}mo`
            : '';
          return !!this.price && this.duration
            ? `$${this.price}/${this.duration}`
            : '';
        default:
          return '';
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
