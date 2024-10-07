import { Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-offers-page',
  templateUrl: './offers-page.component.html',
  styleUrls: ['./offers-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class OffersPageComponent implements OnInit {
  tableHeaders: string[] = [
    'DIT',
    'Status',
    'Created At',
    'Offer Type',
    'Offer Name',
    'Offer Code',
    'Total Unique Codes',
    'Offer Code Type',
    'Plan',
    'Promo Price (USD)',
    'Promo Duration',
    // 'Free Trial',  //samoc-348 hiding this for now as we no lnoger return Plan obj in response after data de-fed
    // 'Start Date',  //samoc-466 Remove Publish Date Time
    'Redeem By',
    'Link',
    '',
  ];
  dataKeys: string[] = [
    'DIT',
    'statusId',
    'createdAtDate',
    'offerTypeTitle',
    'offerName',
    'offerCode',
    'totalUniqueCodes',
    'offerCodeType',
    'formattedPlans',
    'discountAmount',
    'promoDurationString',
    // 'planTrial',  /samoc-348 hiding this for now as we no lnoger return Plan obj in response after data de-fed
    // 'publishDate', /samoc-466 Remove Publish Date Time
    'endDate',
    'link',
    'actions',
  ];
  component = 'offers';

  constructor() {}

  ngOnInit(): void {}
}
