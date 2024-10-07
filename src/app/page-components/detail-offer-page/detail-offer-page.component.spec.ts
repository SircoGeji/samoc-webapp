import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DetailOfferPageComponent } from './detail-offer-page.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { OffersService } from '../../service/offers.service';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { CodeType, StatusEnum } from '../../types/enum';
import { CUSTOM_ELEMENTS_SCHEMA, DebugElement } from '@angular/core';
import { CreateOfferPageComponent } from '../create-offer-page/create-offer-page.component';

describe('DetailOfferPageComponent', () => {
  let component: DetailOfferPageComponent;
  let fixture: ComponentFixture<DetailOfferPageComponent>;
  let router: Router;
  let offersService: OffersService;
  let dialogSpy: jasmine.Spy;
  const dialogRefSpyObj = jasmine.createSpyObj({
    afterClosed: of({}),
    close: null,
  });
  let debugElement: DebugElement;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [DetailOfferPageComponent],
        imports: [
          RouterTestingModule.withRoutes([
            {
              path: 'offers/detail/offercode123',
              component: DetailOfferPageComponent,
            },
            {
              path: 'offers/create?prefill=examplecode1',
              component: CreateOfferPageComponent,
            },
            {
              path: 'offers/create',
              component: CreateOfferPageComponent,
            },
          ]),
          MatSnackBarModule,
          MatDialogModule,
          BrowserAnimationsModule,
          LoggerTestingModule,
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          {
            provide: OffersService,
            useValue: {
              exportCsv: () => of({}),
              publishOffer: () => of({}),
              validateOffer: () => of({}),
              archiveOffer: () => of({}),
              createOffer: () => of({}),
              getOffer: () =>
                of({
                  offerType: {
                    id: 1,
                    title: 'Acquisition',
                  },
                  offerCode: 'SAMPLECODE12',
                  offerCodeType: CodeType.BULK_UNIQUE_CODE,
                  totalRedemptions: 3,
                  totalUniqueCodes: 360,
                  plan: 'qamonthlynft',
                  offerHeader: 'header',
                  offerName: 'name',
                  offerBodyText: 'body',
                  offerBoldedText: 'text',
                  offerCTA: 'cta',
                  offerAppliedBannerText: 'banner',
                  offerBgImageUrl: 'bg',
                  legalDisclaimer: 'legal disclaimer',
                  welcomeEmailText: 'email',
                  offer: 'price',
                  offerPrice: 12,
                  offerDurationType: '7-days',
                  offerDurationValue: 7,
                  offerDurationUnit: 'days',
                  offerBusinessOwner: 'ashley',
                  offerVanityUrl: 'www.offers.com',
                  publishDate: '6/11/2020',
                  publishTime: '8:00 AM',
                  endDate: null,
                  endTime: null,
                  noEndDate: true,
                  status: 1,
                }),
            },
          },
        ],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailOfferPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    offersService = TestBed.inject(OffersService);
    dialogSpy = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue(
      dialogRefSpyObj,
    );
    fixture.detectChanges();
    debugElement = fixture.debugElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should lead to edit offer page', () => {
    const spy = spyOn(router, 'navigate');
    component.editOffer();
    expect(spy).toHaveBeenCalled();
  });

  it('should return to offer page', () => {
    const spy = spyOn(router, 'navigate');
    component.return();
    expect(spy).toHaveBeenCalledWith(['/offers']);
  });

  it('should call service on create or publish offer', () => {
    component.offerCode = 'offercode123';
    const spy = spyOn(offersService, 'publishOffer');
    component.publishOffer();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should call service on archive or retiring offer', () => {
    spyOn(component, 'openErrorDialog');
    component.offerCode = 'offercode123';
    const spy = spyOn(offersService, 'archiveOffer');
    component.retireOffer();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should call service on add offer', () => {
    spyOn(component, 'openErrorDialog');
    component.offerCode = 'offercode123';
    const spy = spyOn(offersService, 'createOffer');
    component.addOffer('offercode123456');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should call service on validate offer', () => {
    spyOn(component, 'openErrorDialog');
    component.offerCode = 'offercode123';
    const spy = spyOn(offersService, 'validateOffer');
    component.validateOffer();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should open popup on Submit', () => {
    component.offerCode = 'offercode123';
    const spy = spyOn(component, 'openActionDialog').and.callThrough();
    component.onSubmit('CREATE');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should open popup on response', () => {
    component.offerCode = 'offercode123';
    const spy = spyOn(component, 'return').and.callThrough();
    component.openResponseDialog({}, 'offers');
    fixture.detectChanges();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it('should open popup on action', () => {
    component.offerCode = 'offercode123';
    const spy = spyOn(component, 'addOffer').and.callThrough();
    component.openActionDialog({}, 'CREATE');
    fixture.detectChanges();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();

    const spy1 = spyOn(component, 'publishOffer').and.callThrough();
    component.openActionDialog({}, 'PUBLISH');
    fixture.detectChanges();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    expect(spy1).toHaveBeenCalled();

    const spy2 = spyOn(component, 'validateOffer').and.callThrough();
    component.openActionDialog({}, 'VALIDATE');
    fixture.detectChanges();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();

    const spy3 = spyOn(component, 'retireOffer').and.callThrough();
    component.openActionDialog({}, 'RETIRE');
    fixture.detectChanges();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    expect(spy3).toHaveBeenCalled();
  });

  it('should format OfferBoldedText and remove span tags', () => {
    component.offerBoldedText = '<span>some text</span>';
    const re = component.getOfferBoldedText();
    expect(re).toBe('some text');
  });

  it('should format OfferBoldedTextHint and remove span tags', () => {
    component.offerBoldedTextHint = '<span>some hint text</span>';
    const re = component.getOfferBoldedTextHint();
    expect(re).toBe('some hint text');
  });

  it('should navigate to offer create for duplicate offer', () => {
    const spy = spyOn(router, 'navigate').and.callThrough();
    component.duplicateOffer('examplecode1');
    expect(spy).toHaveBeenCalledWith(['/offers/create'], {
      queryParams: { prefill: 'examplecode1' },
    });
  });

  it('should check and show retire button', () => {
    component.status = StatusEnum.DFT;
    const re = component.showRetireBtn();
    fixture.detectChanges();
    expect(re).toBe(true);
  });

  it('should not show edit button with past enddate', () => {
    component.endDate = '2020-12-28T04:36:58.239Z';
    component.status = StatusEnum.DFT;
    const re = component.showEditBtn();
    fixture.detectChanges();
    expect(re).toBe(false);
  });

  it('should update scrollable height with a user resize window', () => {
    const spy = spyOn(component, 'updateScrollableHeight').and.callThrough();
    component.ngOnInit();
    fixture.detectChanges();
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should get offer', () => {
    const spy = spyOn(component, 'getOffer').and.callThrough();
    component.ngOnInit();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('exportcsv should call offerservice', () => {
    const spy = spyOn(offersService, 'exportCsv').and.callThrough();
    component.exportCsv();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });
});
