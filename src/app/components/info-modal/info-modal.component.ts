import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { elementAt, filter, takeUntil } from 'rxjs/operators';
import { Observable, Subject, Subscription } from 'rxjs';
import { OffersService } from '../../service/offers.service';
import * as moment from 'moment';
import { removeXid } from '../../helpers/string-utils';

export interface DialogData {
  assetPath: string;
  infoText?: string;
  offerHistory?: any;
}

@Component({
  selector: 'info-modal',
  templateUrl: 'info-modal.component.html',
  styleUrls: ['info-modal.component.scss'],
})
export class InfoModalComponent implements OnInit {
  public showLoader: boolean = false;
  public offerHistory: any[] | null = [];
  public errorMessage: string = '';
  private destroy$ = new Subject<void>();
  constructor(
    public dialogRef: MatDialogRef<InfoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private offersService: OffersService,
  ) {}

  ngOnInit(): void {
    if (
      this.data.offerHistory?.storeCode &&
      this.data.offerHistory?.offerCode
    ) {
      const { storeCode, offerCode } = this.data.offerHistory;
      this.loadOfferHistory(storeCode, offerCode);
    }
  }

  private loadOfferHistory(storeCode: string, offerCode: string): void {
    this.showLoader = true;
    this.offersService
      .getOfferHistory(storeCode, offerCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res) => {
          if (res.data) {
            this.errorMessage = '';
            this.offerHistory = res.data.reverse();
            this.showLoader = false;
          } else {
            this.errorMessage = 'NO DATA';
            this.offerHistory = null;
            this.showLoader = false;
          }
        },
        (err) => {
          this.errorMessage = removeXid(err.error.message);
          this.offerHistory = null;
          this.showLoader = false;
        },
      );
  }

  public getOfferHistoryFieldsNames(recordObj: any): string {
    return recordObj.changedFields && recordObj.changedFields.length
      ? ' ' + recordObj.changedFields.join(', ')
      : '';
  }

  public getOfferHistoryActionName(recordObj: any): string {
    return recordObj.action === 'updated'
      ? recordObj.changedFields && recordObj.changedFields.length > 1
        ? 'are ' + recordObj.action
        : 'is ' + recordObj.action
      : recordObj.action;
  }

  public getProperDate(actionDate: string): string {
    return moment(actionDate).format('MM/DD/YYYY');
  }

  public isElementLast(recordIndex: number): boolean {
    if (this.offerHistory && this.offerHistory.length) {
      return recordIndex === this.offerHistory.length - 1;
    } else {
      return true;
    }
  }
}
