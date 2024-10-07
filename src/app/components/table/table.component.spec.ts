import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { OffersService } from '../../service/offers.service';
import { PlansService } from '../../service/plans.service';
import { ConfigurationService } from '../../service/configuration.service';
import { TableComponent } from './table.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatDialogModule } from '@angular/material/dialog';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { CodeType, StatusEnum } from '../../types/enum';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

const mockOffers = [
  {
    legalDisclaimer:
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has su',
    totalUniqueCodes: 0,
    noEndDate: false,
    discountType: 'trial',
    offerAppliedBannerText: '',
    offerBgImageUrl: '',
    offerBodyText:
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has su',
    offerBoldedText: 'bolded text',
    offerBusinessOwner: 'Mimi',
    offerCTA: 'cta',
    offerCode: 'SAMPLECODE1',
    offerCodeType: CodeType.SINGLE_CODE,
    discountrDurationUnit: 'days',
    discountDurationValue: 14,
    offerHeader: 'SAMPLE OFFER 1',
    offerName: 'SAMPLE OFFER 1',
    discountPrice: 12.99,
    offerTypeId: 1,
    OfferType: {
      id: 1, // 1=Default Signup, 2=Acquisition
      title: 'Default',
    },
    offerVanityUrl: '',
    Plan: {
      planCode: 'plan', // planCode
      planPrice: 3.99,
      trialDuration: 2,
      trialUnit: 'weeks',
    },
    promoDurationString: '14 days',
    publishDateTime: '2020-06-16T22:00:00.000Z',
    endDateTime: '2020-06-30T18:00:00.000Z',
    statusId: 1,
    statusString: 'Draft',
    totalRedemptions: null,
    welcomeEmailText:
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specim',
  },
];

const mockPlans = [
  {
    id: 0,
    statusId: 'Inactive',
    planName: 'Weekly',
    planCode: 'EXAMPLECODE0',
    price: '$9.99 USD',
    trial: '15',
    users: 1870,
    cycle: 'Monthly',
    cylcleDuration: '30',
  },
];
const mockStore = {
  storeCode: 'twlght',
};

describe('TableComponent', () => {
  let component: TableComponent;
  let fixture: ComponentFixture<TableComponent>;
  let offersService: OffersService;
  let plansService: PlansService;
  let router: Router;
  let configService: ConfigurationService;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [TableComponent],
        imports: [
          HttpClientTestingModule,
          MatTableModule,
          MatDialogModule,
          MatFormFieldModule,
          MatSelectModule,
          MatInputModule,
          BrowserAnimationsModule,
          LoggerTestingModule,
          RouterTestingModule.withRoutes([]),
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          {
            provide: OffersService,
            useValue: {
              getOffers: () => of(mockOffers),
            },
          },
          {
            provide: PlansService,
            useValue: {
              fetch: () => of(mockPlans),
              archivePlan: () => of({}),
            },
          },
        ],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
    offersService = TestBed.inject(OffersService);
    plansService = TestBed.inject(PlansService);
    router = TestBed.inject(Router);
    configService = TestBed.inject(ConfigurationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load offers', () => {
    component.dataKeys = [
      'statusString',
      'offerHeader',
      'offerName',
      'offerCode',
      'totalUniqueCodes',
      'offerType',
      'plan',
      'offerPrice',
      'offerDuration',
      'freeTrial',
      'publishDate',
      'endDate',
      'link',
    ];
    component.tableHeaders = [
      'Status',
      'Offer Name',
      'Offer Code',
      'Total Unique Codes',
      'Offer Type',
      'Plan',
      'Offer Price',
      'Promo Duration',
      'Free Trial',
      'Start Date',
      'Redeem By',
      'Link',
    ];

    spyOn(offersService, 'getOffers').and.returnValue(of(mockOffers));
    component.fetchOffers(mockStore);
    fixture.detectChanges();
    const tableColumns = fixture.nativeElement.querySelectorAll('th');
    expect(tableColumns.length).toBe(13);
    const tableRows = fixture.nativeElement.querySelectorAll('tr');
    const headerRow = tableRows[0];
    expect(headerRow.cells[0].innerHTML).toBe(' Status');
    expect(headerRow.cells[1].innerHTML).toBe(' Offer Name');
    expect(headerRow.cells[2].innerHTML).toBe(' Offer Code');
  });

  it('should load plans', () => {
    component.tableHeaders = [
      'Status',
      'Plan Name',
      'Plan Code',
      'Price',
      'Trial Offer',
      'Number of Users',
      '',
    ];
    component.dataKeys = [
      'status',
      'planName',
      'planCode',
      'price',
      'trial',
      'ellipsis',
    ];
    component.parent = 'plans';
    spyOn(plansService, 'fetch').and.callThrough();
    component.fetchPlans(mockStore);
    fixture.detectChanges();
    const tableRows = fixture.nativeElement.querySelectorAll('tr');
    const headerRow = tableRows[0];
    expect(headerRow.cells[0].innerHTML).toBe(' Status');
    expect(headerRow.cells[1].innerHTML).toBe(' Plan Name');
    expect(headerRow.cells[2].innerHTML).toBe(' Plan Code');
  });

  it('should lead to offer details', () => {
    fixture.detectChanges();
    component.parent = 'offers';
    const spy = spyOn(router, 'navigate');
    component.onDataSelect({
      id: '2',
      status: 'Draft',
      offerName: 'Offer Name 2',
      offerCode: 'EXAMPLECODE2',
      offerType: 'Default Signup',
      plan: 'Plan Name',
      offerPrice: 9.99,
      promoDuration: '3 days',
      freeTrial: 'No Trial',
      totalUniqueCodes: '50,000',
      startDate: '06/01/20',
      endDate: '12/05/20',
      link: './assets/link-solid.svg',
    });
    expect(spy).toHaveBeenCalledWith(['/offers/detail', 'EXAMPLECODE2']);
  });

  it('should lead to plan details', () => {
    fixture.detectChanges();
    component.parent = 'plans';
    const spy = spyOn(router, 'navigate');
    component.onDataSelect({
      id: '5',
      status: 'Draft',
      planName: 'Annual',
      planCode: 'EXAMPLECODE1',
      price: '$79.99 USD/Year',
      trial: '7 Days',
      users: 100000,
      ellipsis: '',
    });
    expect(spy).toHaveBeenCalledWith(['/plans/detail', 'EXAMPLECODE1']);
  });

  it('should call create', () => {
    const spy = spyOn(router, 'navigate');
    component.addNew();
    expect(spy).toHaveBeenCalled();
  });

  it('should add offer based on offer', () => {
    component.getStatusColor('');
    const spy = spyOn(router, 'navigate');
    component.addOffer('planCode');
    expect(spy).toHaveBeenCalled();
  });

  it('should set buttonText to addPlans', () => {
    component.parent = 'plans';
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.buttonText).toEqual('ADD PLAN');
  });

  it('should set buttonText to addOffer', () => {
    component.parent = 'offers';
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.buttonText).toEqual('ADD OFFER');
  });

  it('should delete plan', () => {
    spyOn(plansService, 'archivePlan').and.callThrough();
    component.deletePlan();
    fixture.detectChanges();
    expect(plansService.archivePlan).toHaveBeenCalled();
  });

  it('should throw error on delete plan', () => {
    spyOn(plansService, 'archivePlan').and.returnValue(
      throwError({ status: 404, statusText: 'Not Found' }),
    );
    component.deletePlan();
    fixture.detectChanges();
    expect(plansService.archivePlan).toHaveBeenCalled();
  });

  it('should open dialog on confirm delete plan', () => {
    const spy = spyOn(component, 'openActionDialog');
    component.confirmDelete('planCode', StatusEnum.PROD);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should determine if error status', () => {
    let result = component.isErrorStatus(StatusEnum.STG_VALDN_FAIL);
    expect(result).toBe(true);
    result = component.isErrorStatus(StatusEnum.PROD_VALDN_PASS);
    expect(result).toBe(false);
    result = component.isErrorStatus(StatusEnum.PROD_VALDN_FAIL);
    expect(result).toBe(true);
    result = component.isErrorStatus(StatusEnum.PROD_VALDN_PASS);
    expect(result).toBe(false);
  });

  it('should setup filter', () => {
    component.parent = 'offers';
    component.setUpSort();
    expect(component.data.filterPredicate).toBeInstanceOf(Function);
    component.parent = 'plans';
    component.setUpSort();
    expect(component.data.filterPredicate).toBeInstanceOf(Function);
  });

  it('should color rollback rows', () => {
    let result = component.colorRollbackRows(
      StatusEnum.PROD_RB_FAIL,
      '2221kGE',
    );
    expect(result).toBe('glrollback');
    result = component.colorRollbackRows(StatusEnum.STG_RB_FAIL, '221kGE');
    expect(result).toBe('glrollback');
    result = component.colorRollbackRows(StatusEnum.STG_VALDN_FAIL, '221kGE');
    expect(result).toBe('');
  });

  it('should apply filter and clear filter', () => {
    const mockEvent = {
      currentTarget: {
        value: 'TARGET',
      },
    };
    component.applyFilter(mockEvent);
    expect(component.data.filter).toBe('target');
    component.clearSearchInput({ value: 'value' });
    expect(component.data.filter).toBe('ALL');
  });

  it('should handle offer events', () => {
    component.ngOnInit();
    fixture.detectChanges();
    component.fetchedOffers = mockOffers;
    component.offerEventHandler('offer-status-updated', mockOffers[0]);
    expect(component.fetchedOffers).toEqual(mockOffers);
  });

  it('should setup sort', () => {
    component.setUpSort();
    expect(component.data.sortingDataAccessor instanceof Function);
    let result = component.data.sortingDataAccessor(mockOffers[0], 'offerName');
    expect(result).toBe('sample offer 1');
    result = component.data.sortingDataAccessor(mockOffers[0], 'link');
    expect(result).toBe('z');
    result = component.data.sortingDataAccessor(
      mockOffers[0],
      'promoDurationString',
    );
    expect(result).toBe(14);
    result = component.data.sortingDataAccessor(
      mockOffers[0],
      'publishDateTime',
    );
    expect(result).toBe('2020-06-16T22:00:00.000Z');
  });

  it('should should convert to days for sorting', () => {
    let value = component.convertToDays('1 day');
    expect(value).toEqual(1);
    value = component.convertToDays('1 week');
    expect(value).toEqual(7);
    value = component.convertToDays('1 month');
    expect(value).toEqual(31);
    value = component.convertToDays('1 year');
    expect(value).toEqual(365);
  });

  it('should get status color based on status', () => {
    let value = component.getStatusColor(1);
    expect(value).toEqual('#777777');
    value = component.getStatusColor(22);
    expect(value).toEqual('#4e7968');
    value = component.getStatusColor(32);
    expect(value).toEqual('#4e7968');
    for (let i = 10; i < 15; i++) {
      value = component.getStatusColor(i);
      expect(value).toEqual('#dc2b34');
    }
    for (let i = 42; i < 45; i++) {
      value = component.getStatusColor(i);
      expect(value).toEqual('#4e7968');
    }
    value = component.getStatusColor(24);
    expect(value).toEqual('#4e7968');
    value = component.getStatusColor(34);
    expect(value).toEqual('#4e7968');
    value = component.getStatusColor(30);
    expect(value).toEqual('#f9e44c');
    value = component.getStatusColor(40);
    expect(value).toEqual('#3d4743');
    value = component.getStatusColor(20);
    expect(value).toEqual('#4e7968');
    value = component.getStatusColor(48);
    expect(value).toEqual('#2D5847');
    value = component.getStatusColor(18);
    expect(value).toEqual('#4e7968');
    value = component.getStatusColor(68);
    expect(value).toEqual('#2D5847');
    value = component.getStatusColor(19);
    expect(value).toEqual('#4e7968');
    value = component.getStatusColor(49);
    expect(value).toEqual('#2D5847');
    value = component.getStatusColor(101);
    expect(value).toEqual('#2D5847');
  });
});
