import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-plans-page',
  templateUrl: './plans-page.component.html',
  styleUrls: ['./plans-page.component.scss'],
})
export class PlansPageComponent implements OnInit {
  tableHeaders: string[] = [
    'Status',
    'Plan Code',
    'Price (USD)',
    'Term',
    'Trial Offer',
    // Removed User Count (see samoc-153) 'Number of Users',
  ];
  dataKeys: string[] = [
    'statusId',
    'planCode',
    'price',
    'term',
    'planTrial',
    // Removed User Count (see samoc-153) 'numberOfUsers',
    'ellipsis',
  ];
  component = 'plans';

  constructor() {}

  ngOnInit(): void {}
}
