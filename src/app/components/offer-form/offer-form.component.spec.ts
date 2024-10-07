// import {
//   ComponentFixture,
//   TestBed,
//   fakeAsync,
//   tick,
//   waitForAsync,
// } from '@angular/core/testing';
// import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

// import { OfferFormComponent } from './offer-form.component';
// import { RouterTestingModule } from '@angular/router/testing';
// import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { HttpClientTestingModule } from '@angular/common/http/testing';
// import { MatDialogModule } from '@angular/material/dialog';
// import { MatDialog } from '@angular/material/dialog';
// import { MatInputModule } from '@angular/material/input';
// import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// import { MatSelectModule } from '@angular/material/select';
// import { MatDatepickerModule } from '@angular/material/datepicker';
// import { MatCheckboxModule } from '@angular/material/checkbox';
// import { MatNativeDateModule } from '@angular/material/core';
// import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
// import { of, throwError } from 'rxjs';
// import { OffersService } from '../../service/offers.service';
// import { PlansService } from '../../service/plans.service';
// import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
// import { StatusEnum } from '../../types/enum';
// import { DetailOfferPageComponent } from 'src/app/page-components/detail-offer-page/detail-offer-page.component';
// import { PageNotFoundComponent } from 'src/app/page-components/page-not-found/page-not-found.component';
// import { InfoModalComponent } from '../info-modal/info-modal.component';

// const mockResponse = {
//   offerCode: '123',
//   offerType: { id: 1, title: 'Default Signup' },
//   offerCodeType: 'single',
//   totalRedemptions: null,
//   totalUniqueCodes: 0,
//   Plan: {
//     planCode: 'twlght6month',
//     planPrice: 44,
//     trialDuration: 1,
//     trialUnit: 'days',
//     billingCycle: 'customize',
//     billingCycleDuration: 3,
//     billingCycleUnit: 'months',
//   },
//   offerHeader: '123',
//   offerName: '123',
//   offerBodyText: '123dsf',
//   offerBoldedText: '123',
//   offerCTA: '123d',
//   offerAppliedBannerText: '',
//   offerBgImageUrl: '',
//   legalDisclaimer: '123',
//   welcomeEmailText: '123',
//   discountType: 'trial',
//   discountAmount: 0,
//   discountDurationType: '14-days',
//   discountDurationValue: 14,
//   discountDurationUnit: 'days',
//   offerBusinessOwner: '123',
//   offerVanityUrl: '',
//   publishDate: '7/16/2020',
//   publishTime: '10:00 AM',
//   endDate: null,
//   endTime: null,
//   noEndDate: true,
//   statusId: 1,
// };
// const mock = {
//   offerCode: '123',
//   offerType: { id: 1, title: 'Default Signup' },
//   offerCodeType: 'single',
//   totalRedemptions: null,
//   totalUniqueCodes: 0,
//   Plan: {
//     planCode: 'twlght6month',
//     planPrice: 44,
//     trialOffer: 'customize',
//     trialDuration: 1,
//     trialUnit: 'days',
//     billingCycle: 'customize',
//     billingCycleDuration: 3,
//     billingCycleUnit: 'months',
//   },
//   offerHeader: '123',
//   offerBodyText: '123dsf',
//   offerBoldedText: '123',
//   offerCTA: '123d',
//   offerAppliedBannerText: '',
//   offerBgImageUrl: '',
//   legalDisclaimer: '123',
//   welcomeEmailText: '123',
//   discountType: 'trial',
//   discountAmount: 0,
//   discountDurationType: '14-days',
//   discountDurationValue: 14,
//   discountDurationUnit: 'days',
//   offerBusinessOwner: '123',
//   offerVanityUrl: '',
//   endDate: null,
//   endTime: null,
//   noEndDate: true,
//   status: 'Published Prod',
//   statusId: StatusEnum.PROD_ERR_PUB,
// };
// const mockError = {
//   error: {
//     message: 'message',
//   },
// };
// const mockForUpdates = Object({
//   offerTypeId: 'default',
//   offerCodeType: 'single',
//   offerHeader: 'Offer Name 1',
//   offerName: 'Offer Name 1',
//   offerBodyText: 'this is sample text',
//   offerCTA: 'cta text',
//   offerBoldedText: '',
//   offerAppliedBannerText: '',
//   offerBgImageUrl: '',
//   legalDisclaimer: 'legal disclaimer',
//   welcomeEmailText: 'welcome text',
//   discountType: 'price',
//   offerBusinessOwner: 'owner',
//   offerVanityUrl: 'url',
//   endDateTime: '2022-01-01T06:59:59.000Z',
//   noEndDate: false,
//   discountDurationValue: 1,
//   discountDurationUnit: 'week',
// });
// const mockForNewOffer = Object({
//   offerTypeId: 'default',
//   offerCodeType: 'single',
//   offerHeader: 'Offer Name 1',
//   offerName: 'Offer Name 1',
//   offerBodyText: 'this is sample text',
//   offerCTA: 'cta text',
//   offerBoldedText: '',
//   offerAppliedBannerText: '',
//   offerBgImageUrl: '',
//   legalDisclaimer: 'legal disclaimer',
//   welcomeEmailText: 'welcome text',
//   discountType: 'price',
//   offerBusinessOwner: 'owner',
//   offerVanityUrl: 'url',
//   endDateTime: '2022-01-01T06:59:59.000Z',
//   noEndDate: false,
//   offerCode: 'EXAMPLECODE1',
//   planCode: 'plan1',
//   discountDurationValue: 1,
//   discountDurationUnit: 'week',
// });

// const mockPlans = [
//   {
//     planName: 'plan',
//     planCode: 'code',
//     price: 2.99,
//     billingCycle: 'customize',
//     billingCycleDuration: 3,
//     billingCycleUnit: 'months',
//     trialOffer: 'customize',
//     trialDuration: 2,
//     trialUnit: 'days',
//     numberOfUsers: 0,
//     statusId: 1,
//   },
//   {
//     planName: 'apple',
//     planCode: 'eerf',
//     price: 3.5,
//     billingCycle: 'year',
//     billingCycleDuration: 1,
//     billingCycleUnit: 'year',
//     trialOffer: '14-days',
//     trialDuration: 14,
//     trialUnit: 'days',
//     numberOfUsers: 0,
//     statusId: 1,
//   },
//   {
//     planName: 'twlght6month',
//     planCode: 'twlght6month',
//     price: 44,
//     billingCycle: '6-months',
//     billingCycleDuration: 6,
//     billingCycleUnit: 'months',
//     trialOffer: 'customize',
//     trialDuration: 1,
//     trialUnit: 'days',
//     numberOfUsers: 0,
//     statusId: 1,
//   },
//   {
//     planName: 'twlght plan',
//     planCode: 'twlght',
//     price: 2.99,
//     billingCycle: 'customize',
//     billingCycleDuration: 3,
//     billingCycleUnit: 'months',
//     trialOffer: 'customize',
//     trialDuration: 2,
//     trialUnit: 'days',
//     numberOfUsers: 0,
//     statusId: 1,
//   },
// ];
// const mockStore = {
//   storeCode: 'twlght',
// };

// describe('OfferFormComponent', () => {
//   let component: OfferFormComponent;
//   let fixture: ComponentFixture<OfferFormComponent>;
//   let offersService: OffersService;
//   let plansService: PlansService;
//   let route: ActivatedRoute;
//   let router: Router;
//   let dialogSpy: jasmine.Spy;
//   const dialogRefSpyObj = jasmine.createSpyObj({
//     afterClosed: of({}),
//     close: null,
//   });

//   beforeEach(
//     waitForAsync(() => {
//       TestBed.configureTestingModule({
//         declarations: [OfferFormComponent],
//         imports: [
//           FormsModule,
//           ReactiveFormsModule,
//           RouterTestingModule.withRoutes([
//             {
//               path: 'offers/update/:offerCode',
//               redirectTo: 'offers/create',
//             },
//             {
//               path: 'offers/detail/undefined',
//               component: PageNotFoundComponent,
//             },
//             {
//               path: 'offers/detail/EXAMPLECODE1',
//               component: DetailOfferPageComponent,
//             },
//           ]),
//           HttpClientTestingModule,
//           MatDialogModule,
//           MatInputModule,
//           MatSelectModule,
//           BrowserAnimationsModule,
//           MatCheckboxModule,
//           MatDatepickerModule,
//           MatNativeDateModule,
//           NgxMaterialTimepickerModule,
//         ],
//         schemas: [CUSTOM_ELEMENTS_SCHEMA],
//         providers: [
//           {
//             provide: OffersService,
//             useValue: {
//               addDraft: () => of({ msg: 'added offer' }),
//               updateOffer: () => of({ msg: 'updated offer' }),
//               createOffer: () => of({ msg: 'created offer' }),
//               getOffer: () => of(mock),
//             },
//           },
//           {
//             provide: PlansService,
//             useValue: {
//               fetch: () => of(Promise.resolve(mockPlans)),
//             },
//           },
//           {
//             provide: ActivatedRoute,
//             useValue: {
//               routeConfig: {
//                 path: of({}),
//               },
//               paramMap: of(convertToParamMap({ offerCode: 'EXAMPLECODE1' })),
//               queryParams: of(convertToParamMap({ planCode: 'EXAMPLECODE1' })),
//             },
//           },
//         ],
//       }).compileComponents();
//     }),
//   );

//   beforeEach(() => {
//     fixture = TestBed.createComponent(OfferFormComponent);
//     offersService = TestBed.inject(OffersService);
//     plansService = TestBed.inject(PlansService);
//     route = TestBed.inject(ActivatedRoute);
//     router = TestBed.inject(Router);
//     component = fixture.componentInstance;
//     component.requestType = 'post';
//     fixture.detectChanges();
//     component.plans = mockPlans;
//     component.planCode = 'twlght6month';
//     dialogSpy = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue(
//       dialogRefSpyObj,
//     );
//   });

//   function create() {
//     component.offerForm.controls.offerCode.setValue('EXAMPLECODE1');
//     component.offerForm.controls.offerType.setValue('default');
//     component.offerForm.controls.offerCodeType.setValue('single');
//     component.offerForm.controls.plan.setValue('plan1');
//     component.offerForm.controls.offerHeader.setValue('Offer Name 1');
//     component.offerForm.controls.offerName.setValue('Offer Name 1');
//     component.offerForm.controls.offerBodyText.setValue('this is sample text');

//     component.offerForm.controls.offerCTA.setValue('cta text');
//     component.offerForm.controls.legalDisclaimer.setValue('legal disclaimer');
//     component.offerForm.controls.welcomeText.setValue('welcome text');

//     component.offerForm.controls.discountType.setValue('price');

//     component.offerForm.controls.discountAmount.setValue('2.50');

//     component.offerForm.controls.discountDurationType.setValue('1-week');
//     component.offerForm.controls.discountDurationValue.setValue('');
//     component.offerForm.controls.discountDurationUnit.setValue('');

//     component.offerForm.controls.offerBusinessOwner.setValue('owner');
//     component.offerForm.controls.endDate.setValue(new Date('12/31/2021'));
//     component.offerForm.controls.totalUniqueCodes.setValue('5');
//     component.offerForm.controls.offerVanityUrl.setValue('url');
//     component.offerForm.controls.offerAppliedBannerText.setValue('');
//     component.offerForm.controls.offerBgImageUrl.setValue('');
//     component.offerForm.controls.endTime.setValue('11:59 PM');
//     component.offerForm.controls.noEndDate.setValue(false);
//   }

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

//   it('should fetch single offer', async () => {
//     router.navigate(['offers/update/:offerCode']).then(() => {
//       spyOn(offersService, 'getOffer').and.callThrough();
//       component.ngOnInit();
//       fixture.detectChanges();
//       expect(offersService.getOffer).toHaveBeenCalled();
//     });
//   });

//   it('should show fetch single offer error', async () => {
//     router.navigate(['offers/update/:offerCode']).then(() => {
//       spyOn(offersService, 'getOffer').and.returnValue(throwError(mockError));
//       component.ngOnInit();
//       fixture.detectChanges();
//       expect(offersService.getOffer).toHaveBeenCalled();
//     });
//   });

//   it('should open prompt for saving new offer', () => {
//     create();
//     const dialog = {
//       message: 'Do you wish to proceed with SAVE ?',
//       action: 'prompt',
//     };
//     fixture.detectChanges();
//     spyOn(component, 'openActionDialog');
//     component.onSubmit('save');
//     expect(component.openActionDialog).toHaveBeenCalledWith(dialog, 'save');
//   });

//   it('should open prompt for creating new offer', () => {
//     create();
//     const dialog = {
//       message: 'Do you wish to proceed with CREATE ?',
//       action: 'prompt',
//     };
//     fixture.detectChanges();
//     spyOn(component, 'openActionDialog');
//     component.onSubmit('create');
//     expect(component.openActionDialog).toHaveBeenCalledWith(dialog, 'create');
//   });

//   it('should open prompt for publishing new offer', () => {
//     create();
//     const dialog = {
//       message: 'Do you wish to proceed with PUBLISH ?',
//       action: 'prompt',
//     };
//     fixture.detectChanges();
//     spyOn(component, 'openActionDialog');
//     component.onSubmit('publish');
//     expect(component.openActionDialog).toHaveBeenCalledWith(dialog, 'publish');
//   });

//   it('should open prompt for updating offer', () => {
//     create();
//     const dialog = {
//       message: 'Do you wish to proceed with UPDATE ?',
//       footNote:
//         'REMINDER: Contentful text updates may take\n' +
//         'approximately 20 minutes to appear on the website.',
//       action: 'prompt',
//     };
//     fixture.detectChanges();
//     spyOn(component, 'openActionDialog');
//     component.onSubmit('update');
//     expect(component.openActionDialog).toHaveBeenCalledWith(dialog, 'update');
//   });

//   it('should open error dialog for invalid type', () => {
//     create();
//     fixture.detectChanges();
//     const spy = spyOn(component, 'openErrorDialog');
//     component.onSubmit('invalid-type');
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should reset End Time', () => {
//     create();
//     component.resetEndTime();
//     fixture.detectChanges();
//     expect(component.offerForm.controls.endTime.value).toEqual(null);
//   });

//   it('should create form on process action', () => {
//     component.requestType = 'put';
//     create();
//     fixture.detectChanges();
//     spyOn(component, 'updateOffer');
//     component.processAction('publish');
//     expect(component.updateOffer).toHaveBeenCalledWith(mockForUpdates);
//   });

//   it('should update offer', () => {
//     component.requestType = 'put';
//     create();
//     fixture.detectChanges();
//     spyOn(component, 'updateOffer');
//     component.processAction('save');
//     expect(component.updateOffer).toHaveBeenCalledWith(mockForUpdates);
//   });

//   it('should add draft', () => {
//     component.requestType = 'post';
//     create();
//     fixture.detectChanges();
//     spyOn(component, 'addDraft');
//     component.processAction('save');
//     expect(component.addDraft).toHaveBeenCalledWith(mockForNewOffer);
//   });

//   it('should add offer', () => {
//     component.requestType = 'post';
//     create();
//     fixture.detectChanges();
//     spyOn(component, 'addOffer');
//     component.processAction('create');
//     expect(component.addOffer).toHaveBeenCalledWith(mockForNewOffer);
//   });

//   it('should publish offer', () => {
//     component.requestType = 'post';
//     create();
//     fixture.detectChanges();
//     spyOn(component, 'publishOffer');
//     component.processAction('publish');
//     expect(component.publishOffer).toHaveBeenCalledWith(mockForNewOffer);
//   });

//   it('should call get offer', fakeAsync(() => {
//     spyOn(
//       Object.getPrototypeOf(Object.getPrototypeOf(component)),
//       'openErrorDialog',
//     );
//     const spy = spyOn(offersService, 'getOffer').and.callThrough();
//     component.fetchOffer();
//     fixture.detectChanges();
//     fixture.whenStable().then(() => {
//       expect(spy).toHaveBeenCalled();
//     });
//   }));

//   it('should call service on adding draft', () => {
//     spyOn(component, 'openErrorDialog');
//     const spy = spyOn(offersService, 'addDraft');
//     component.addDraft(mockForNewOffer);
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should call service on update offer', () => {
//     const spy = spyOn(offersService, 'updateOffer');
//     component.updateOffer(mockForUpdates);
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should call service on add offer', () => {
//     const spy = spyOn(offersService, 'createOffer');
//     component.addOffer(mockForNewOffer);
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should return based on clean form', () => {
//     const spy = spyOn(router, 'navigate').and.returnValue(
//       Promise.resolve(true),
//     );
//     component.openBackDialog();
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should open popup on response', () => {
//     const spy = spyOn(router, 'navigate').and.returnValue(
//       Promise.resolve(true),
//     );
//     component.openResponseDialog({});
//     fixture.detectChanges();
//     expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should open popup on action', () => {
//     const spy = spyOn(component, 'processAction');
//     component.openActionDialog({ action: 'PROMPT', message: '' }, 'CREATE');
//     fixture.detectChanges();
//     expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should call setupDisabled', () => {
//     const spy = spyOn(component, 'setupDisabledFields');
//     component.patchValues(mock);
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should setup form validators', () => {
//     const spy = spyOn(component, 'setupFormValidators');
//     component.ngOnInit();
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should setup Price Duration Types Dropdown Data Provider', () => {
//     component.ngOnInit();
//     fixture.detectChanges();
//     component.setupPriceDurationTypesDropdownDataProvider(mockPlans[0]);
//     expect(component.priceDurationTypes).toEqual([
//       { value: '3-month', viewValue: '3 Months' },
//       { value: '6-month', viewValue: '6 Months' },
//       { value: 'customize', viewValue: 'Customize' },
//     ]);
//   });

//   it('should setup Validator With Field Condition', () => {
//     const spy = spyOn(component, 'setupValidatorWithFieldCondition');
//     component.patchValues(mock);
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should get discount duration value error', () => {
//     component.offerForm.controls.discountType.setValue('trial');
//     expect(component.getDiscountDurationValueError()).toEqual(
//       'Please enter an integer from 1 to 365',
//     );
//     component.offerForm.controls.discountType.setValue('fixed');
//     expect(component.getDiscountDurationValueError()).toEqual(
//       'Please enter an integer from 1 to 24',
//     );
//   });

//   it('should call plans service', async () => {
//     const spy = spyOn(plansService, 'fetch');
//     component.fetchPlans(mockStore);
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should format Plan Details', async (done) => {
//     const spy = spyOn(component, 'formatPlanDetails');
//     await component.fetchPlans(mockStore);
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//     done();
//   });

//   it('should handle no end date change', () => {
//     create();
//     const e = { checked: true };
//     component.noEndDateChangeHandler(e);
//     fixture.detectChanges();
//     expect(component.offerForm.controls.endDate.value).toEqual(null);
//   });

//   it('should reset End Date', () => {
//     create();
//     component.resetEndDate();
//     fixture.detectChanges();
//     expect(component.offerForm.controls.endDate.value).toEqual(null);
//   });

//   it('should reset End Date', () => {
//     create();
//     component.resetEndDate();
//     fixture.detectChanges();
//     expect(component.offerForm.controls.endDate.value).toEqual(null);
//   });

//   it('should build offer', () => {
//     const spy = spyOn(component, 'buildOffer');
//     component.processAction('save');
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should determine customize', () => {
//     const re = component.determineCustomize(mock);
//     fixture.detectChanges();
//     expect(re).toEqual('customize');
//   });

//   it('should not allow generation hint for boldedText without correct fields', () => {
//     const re = component.shouldGenerateHintBoldedText();
//     fixture.detectChanges();
//     expect(re).toBe(false);
//   });

//   it('should allow generation of hint for boldedText with fixed discount type', () => {
//     component.plans = mockPlans;
//     fixture.detectChanges();
//     component.offerForm.controls.plan.setValue('code');
//     component.offerForm.controls.offerBoldedText.setValue('');
//     component.offerForm.controls.discountType.setValue('fixed');
//     component.offerForm.controls.discountDurationType.setValue('customize');
//     component.offerForm.controls.discountDurationUnit.setValue('1');
//     component.offerForm.controls.discountDurationValue.setValue('month');
//     component.offerForm.controls.discountAmount.setValue('1');
//     const re = component.shouldGenerateHintBoldedText();
//     fixture.detectChanges();
//     expect(re).toBe(true);
//   });

//   it('should generate bolded text message', () => {
//     component.plans = mockPlans;
//     fixture.detectChanges();
//     component.offerForm.controls.plan.setValue('code');
//     component.offerForm.controls.offerBoldedText.setValue('');
//     component.offerForm.controls.discountType.setValue('trial');
//     component.offerForm.controls.discountDurationType.setValue('customize');
//     component.offerForm.controls.discountDurationUnit.setValue('3');
//     component.offerForm.controls.discountDurationValue.setValue('months');
//     component.generateBoldedTextMsg();
//     fixture.detectChanges();
//     expect(component.offerBoldedTextMsg).toBe(
//       'If left blank, the Bolded Text would appear as:  $2.99/3 months, months-3s free trial',
//     );
//   });

//   it('should format offer bolded text', () => {
//     component.offerForm.controls.offerBoldedText.setValue('abc');
//     fixture.detectChanges();
//     const re = component.formatOfferBoldedText();
//     expect(re).toBe('<span>abc</span>');
//   });

//   it('should set header to update if update route', () => {
//     component.isUpdateRoute = true;
//     component.ngOnInit();
//     expect(component.heading).toBe('EDIT OFFER');
//   });

//   it('should open info model with correct asset path', () => {
//     component.openInfoModal('offerHeader');
//     expect(dialogSpy).toHaveBeenCalledWith(InfoModalComponent, {
//       width: '50vw',
//       data: { assetPath: '../../assets/offerHeader.png' },
//     });
//     component.openInfoModal('offerBoldedText');
//     expect(dialogSpy).toHaveBeenCalledWith(InfoModalComponent, {
//       width: '50vw',
//       data: { assetPath: '../../assets/offerBoldedText.png' },
//     });
//     component.openInfoModal('offerAppliedBannerText');
//     expect(dialogSpy).toHaveBeenCalledWith(InfoModalComponent, {
//       width: '50vw',
//       data: { assetPath: '../../assets/offerAppliedBannerText.png' },
//     });
//     component.openInfoModal('legalDisclaimer');
//     expect(dialogSpy).toHaveBeenCalledWith(InfoModalComponent, {
//       width: '50vw',
//       data: { assetPath: '../../assets/legalDisclaimer.png' },
//     });
//     component.openInfoModal('offerBoldedText');
//     expect(dialogSpy).toHaveBeenCalledWith(InfoModalComponent, {
//       width: '50vw',
//       data: { assetPath: '../../assets/offerBoldedText.png' },
//     });
//     component.openInfoModal('someOtherStuff');
//     expect(dialogSpy).toHaveBeenCalledWith(InfoModalComponent, {
//       width: '50vw',
//       data: { assetPath: '' },
//     });
//   });

//   it('should navigate back when open back dialog', () => {
//     const spy = spyOn(router, 'navigate');
//     component.offerForm.controls.legalDisclaimer.markAsDirty();
//     component.isUpdateRoute = true;
//     component.offerCode = 'EXAMPLECODE1';
//     component.openBackDialog();
//     expect(spy).toHaveBeenCalledWith(['/offers/detail/EXAMPLECODE1']);
//   });

//   it('should duplicate offer', fakeAsync(() => {
//     component.duplicateOfferCode = 'some code';
//     component.duplicateOffer();
//     fixture.detectChanges();
//     fixture.whenStable().then(() => {
//       expect(component.offerForm.controls.offerBoldedText.value).toBe('123');
//     });
//   }));

//   it('should prefill value when calling prefill', () => {
//     component.prefill();
//     fixture.detectChanges();
//     expect(component.offerForm.controls.welcomeText.value).toBe(
//       'Welcome Email Text goes here',
//     );
//   });

//   it('should update value and validity on plan code change', () => {
//     const spy = spyOn(
//       component.offerForm.controls.offerCode,
//       'updateValueAndValidity',
//     );
//     const err = new Error('some err');
//     component.onPlanCodeChangeHandler(err);
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should mark bg image url as dirty when drag and drop complete and url is not the same', () => {
//     const spy = spyOn(
//       component.offerForm.controls.offerBgImageUrl,
//       'markAsDirty',
//     );
//     component.offerForm.controls.offerBgImageUrl.setValue('ccc');
//     fixture.detectChanges();
//     component.dndCompletedHandler('ddd');
//     fixture.detectChanges();
//     expect(spy).toHaveBeenCalled();
//   });
// });
