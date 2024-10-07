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

@Component({
  selector: 'app-weight-list',
  templateUrl: './weight-list.component.html',
  styleUrls: ['./weight-list.component.scss'],
})
export class WeightListComponent implements OnInit, OnDestroy {
  @Input() list: any[];
  @Input() index: number;
  @Input() status: number;
  @Input() listName: string;
  @Input() rule: RetentionOfferFilterRule;
  @Input() allOffers: any[];
  @Input() plans: any[];
  @Output() changeWeightListDataEvent = new EventEmitter<any>();
  @Output() changeAnotherWeightListDataEvent = new EventEmitter<any>();
  @Output() weightListRemoveEvent = new EventEmitter<any>();

  public name: string = '';
  public weightValue: number = 1;
  public offers: any[];

  private destroy$ = new Subject<void>();

  constructor(
    public loaderService: LoaderService,
    private ss: ShareService,
    private offersService: OffersService,
  ) {}

  @ViewChild('autosize') autosize: CdkTextareaAutosize;

  ngOnInit(): void {
    this.setWeightListData();
  }

  canChangeRules() {
    return true;
  }

  setWeightListData() {
    if (this.list['weight']) {
      this.weightValue = this.list['weight'];
    } else {
      this.weightValue = 100;
    }
    if (this.list['name']) {
      this.name = this.list['name'];
    }
    if (this.list['offers']) {
      this.offers = [...this.list['offers']];
    } else {
      this.offers = [];
    }
  }

  emitListData() {
    this.setValidOffersArray();
    this.setNonDuplicateOffers();
    this.setValidWeight();
    this.changeWeightListDataEvent.emit({
      name: this.name,
      weight: this.weightValue,
      offers: [...this.offers],
    });
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
    this.emitListData();
  }

  deleteWeightList() {
    this.weightListRemoveEvent.emit(this.index);
  }

  getDropListID() {
    return `${this.listName}-offers-list-${this.index + 1}`;
  }

  onDrop(event: CdkDragDrop<string[]>) {
    this.ss.drop(event);
    this.emitListData();
    this.emitAnotherListData(event);
  }

  emitAnotherListData(event) {
    if (
      event.previousContainer.id !== 'all-offers-list' &&
      event.container.id !== 'all-offers-list' &&
      event.previousContainer.id !== event.container.id
    ) {
      const list = event.previousContainer.id.slice(0, 1);
      const index = parseInt(event.previousContainer.id.slice(-1)) - 1;

      let prevName: string = '';
      let prevWeight: number | null = null;
      let listName: string = '';
      if (list === 'p') {
        const offerList = this.rule['primaryLists'][index];
        listName = 'primary';
        prevName = offerList['name'];
        prevWeight = offerList['weight'];
      } else if (list === 's') {
        const offerList = this.rule['secondaryLists'][index];
        listName = 'secondary';
        prevName = offerList['name'];
        prevWeight = offerList['weight'];
      }

      this.changeAnotherWeightListDataEvent.emit({
        listName: listName,
        index: index,
        name: prevName,
        weight: prevWeight,
        offers: [...event.previousContainer.data],
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
    return !!this.allOffers && this.allOffers.length
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
