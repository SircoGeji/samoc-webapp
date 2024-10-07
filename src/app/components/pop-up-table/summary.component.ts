import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  OnDestroy,
  ViewChild,
  ElementRef,
  ViewEncapsulation,
  Inject,
} from '@angular/core';
import { LoaderService } from '../../../app/service/loader.service';
import {
  OfferResponsePayload,
  RetentionOfferFilterRule,
  UserEligibilityStatus,
} from '../../types/payload';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

import { Subject } from 'rxjs';
import { ShareService } from '../../../app/service/share.service';
import { OffersService } from '../../service/offers.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as moment from 'moment';
import jspdf from 'jspdf';
import 'jspdf-autotable';

export interface SummaryData {
  exportedData: any[];
}

@Component({
  selector: 'summary-table',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SummaryComponent implements OnInit, OnDestroy {
  // @Input() plans: any[];
  // @Output() changeWeightListDataEvent = new EventEmitter<any>();

  public hardcodedData: any[] = [
    { campaign: 'USA' }
  ];
  public summaryData: any[] = [];
  public summaryTableData: MatTableDataSource<any>;
  public summaryTableHeaders: string[] = [
    'Campaign',
    // 'Cancellation Offers',
    'Countries',
    'Primary Offer',
    'Pop-up Offer',
  ];
  public summaryTableDataKeys: string[] = [
    'campaign',
    // 'offers',
    'countries',
    'primary',
    'secondary',
  ];
  public currentDate: any;

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<SummaryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SummaryData,
    public loaderService: LoaderService,
    private offersService: OffersService,
    ) {}

  ngOnInit(): void {
    this.summaryTableData = new MatTableDataSource(this.data.exportedData);
    this.currentDate = moment().format('DD.MM.YYYY');
    console.log('fetchedData: ', this.data.exportedData)
  }

  exportSummaryTable(): void {
    let doc = new jspdf();

    doc.setFontSize(18);
    doc.text(`Cancellation Offer Summary | Campaign name | ${this.currentDate}`, 11, 8);
    doc.setFontSize(11);
    doc.setTextColor(100);

    const tempData = this.data.exportedData.map((elem) => {
      return Object.values(elem);
    });

    (doc as any).autoTable({
      head: [this.summaryTableHeaders],
      body: tempData,
      theme: 'plain',
      didDrawCell: data => {
        console.log(data.column.index)
      }
    });

    // Open PDF document in new tab
    doc.output('dataurlnewwindow');

    // Download PDF document
    // doc.save('summary_table.pdf');
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
