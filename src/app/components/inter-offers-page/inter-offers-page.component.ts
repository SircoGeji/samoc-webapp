import { Component, OnInit, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'inter-app-offers-page',
  templateUrl: './inter-offers-page.component.html',
  styleUrls: ['./inter-offers-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class InterOffersPageComponent implements OnInit {
  tableHeaders: string[] = [
    // 'DIT',
    'Campaign Name',
    'Status',
    'Created At',
    'Offer Type',
    'Regions',
    'Offer Code',
    // 'Unique Codes',
    // 'Offer Code Type',
    // 'Plan',
    // 'Discount Amount (USD)',
    // 'Promo Duration',
    'Redeem By',
    // 'Link',
  ];
  dataKeys: string[] = [
    // 'DIT',
    'campaignName',
    'statusId',
    'createdAtDate',
    'offerTypeTitle',
    'regions',
    'offerCode',
    // 'totalUniqueCodes',
    // 'offerCodeType',
    // 'formattedPlans',
    // 'discountAmount',
    // 'promoDurationString',
    'endDate',
    // 'link',
  ];
  component = 'inter-offers';

  constructor() {}

  ngOnInit(): void {}
}
