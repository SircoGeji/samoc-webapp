import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanFormComponent } from './plan-form.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PlansService } from '../../service/plans.service';
import { of, throwError } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

const mockError = {
  error: {
    message: 'message',
  },
};

const mockPlan = {
  planName: 'plan',
  planCode: 'code',
  price: 2.99,
  billingCycle: 'customize',
  billingCycleDuration: 3,
  billingCycleUnit: 'months',
  trialOffer: 'customize',
  trialDuration: 2,
  trialUnit: 'days',
  numberOfUsers: 0,
  status: 'Draft',
};

const mockPlanNft = {
  planName: 'plan',
  planCode: 'code',
  price: 2.99,
  billingCycle: 'customize',
  billingCycleDuration: 3,
  billingCycleUnit: 'months',
  trialOffer: 'customize',
  trialDuration: 0,
  trialUnit: 'days',
  numberOfUsers: 0,
  status: 'Draft',
};

describe('PlanFormComponent', () => {
  let component: PlanFormComponent;
  let fixture: ComponentFixture<PlanFormComponent>;
  let plansService: PlansService;
  let router: Router;
  let route: ActivatedRoute;
  let dialogSpy: jasmine.Spy;
  const dialogRefSpyObj = jasmine.createSpyObj({
    afterClosed: of({}),
    close: null,
  });

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [PlanFormComponent],
        imports: [
          FormsModule,
          ReactiveFormsModule,
          RouterTestingModule,
          HttpClientTestingModule,
          MatDialogModule,
          MatInputModule,
          MatSelectModule,
          BrowserAnimationsModule,
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          {
            provide: PlansService,
            useValue: {
              getPlan: () => of({}),
              addPlan: () => of({}),
              addDraft: () => of({}),
              updatePlan: () => of({}),
            },
          },
          {
            provide: ActivatedRoute,
            useValue: {
              routeConfig: {
                path: of({}),
              },
              paramMap: of(convertToParamMap({ planCode: 'EXAMPLECODE1' })),
            },
          },
        ],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanFormComponent);
    plansService = TestBed.inject(PlansService);
    route = TestBed.inject(ActivatedRoute);
    router = TestBed.inject(Router);
    component = fixture.componentInstance;
    fixture.detectChanges();
    dialogSpy = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue(
      dialogRefSpyObj,
    );
  });

  function create() {
    component.planForm.controls.planCode.setValue('plancode');
    // component.planForm.controls.planPrice.setValue('2');
    // component.planForm.controls.billingCycle.setValue('customize');
    // component.planForm.controls.billingCycleUnit.setValue('1');
    // component.planForm.controls.billingCycleDuration.setValue('months');
    // component.planForm.controls.trialOffer.setValue('customize');
    // component.planForm.controls.trialDuration.setValue('1');
    // component.planForm.controls.trialUnit.setValue('months');
  }

  function createSecondaryPlan() {
    component.planForm.controls.planCode.setValue('plancode');
    // component.planForm.controls.planPrice.setValue('2');
    // component.planForm.controls.billingCycle.setValue('1-month');
    // component.planForm.controls.billingCycleUnit.setValue('1');
    // component.planForm.controls.billingCycleDuration.setValue('months');
    // component.planForm.controls.trialOffer.setValue('14-days');
    // component.planForm.controls.trialDuration.setValue('1');
    // component.planForm.controls.trialUnit.setValue('months');
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open prompt for adding new plan', () => {
    create();
    fixture.detectChanges();
    spyOn(component, 'openActionDialog');
    component.onSubmit('save');
    expect(component.openActionDialog).toHaveBeenCalled();
  });

  it('should call add draft', () => {
    component.requestType = 'post';
    create();
    fixture.detectChanges();
    spyOn(component, 'addDraft');
    component.processAction('save');
    expect(component.addDraft).toHaveBeenCalled();
  });

  it('should call update draft', () => {
    component.requestType = 'put';
    create();
    fixture.detectChanges();
    spyOn(component, 'updatePlan');
    component.processAction('save');
    expect(component.updatePlan).toHaveBeenCalled();
  });

  it('should call service on add plan', () => {
    spyOn(component, 'openErrorDialog');
    component.requestType = 'post';
    create();
    fixture.detectChanges();
    const spy = spyOn(plansService, 'addPlan');
    component.addPlan(mockPlan);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should call service on add draft', () => {
    spyOn(component, 'openErrorDialog');
    component.requestType = 'post';
    create();
    fixture.detectChanges();
    const spy = spyOn(plansService, 'addDraft');
    component.addDraft(mockPlan);
    expect(spy).toHaveBeenCalled();
  });

  it('should call service on update plan', () => {
    spyOn(component, 'openErrorDialog');
    component.requestType = 'put';
    create();
    fixture.detectChanges();
    const spy = spyOn(plansService, 'updatePlan');
    component.updatePlan(mockPlan);
    expect(spy).toHaveBeenCalled();
  });

  it('should call fetch plan', () => {
    spyOn(component, 'openErrorDialog');
    const spy = spyOn(plansService, 'getPlan');
    component.fetchPlan();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should check whether customize', () => {
    component.requestType = 'put';
    create();
    const result = component.checkCustomize(mockPlan, 'billing');
    fixture.detectChanges();
    expect(result).toEqual('3-months');
  });

  it('should check whether customize', () => {
    component.requestType = 'put';
    create();
    const result = component.checkCustomize(mockPlan, 'trial');
    fixture.detectChanges();
    expect(result).toEqual('customize');
  });

  it('should call setupDisabled', () => {
    const spy = spyOn(component, 'setupDisabledFields');
    component.patchValues(mockPlan);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  // it('should create plan with customized values', () => {
  //   createSecondaryPlan();
  //   const plan = component.createPlan();
  //   fixture.detectChanges();
  //   expect(plan).toEqual({
  //     planCode: 'plancode',
  //     price: 2,
  //     billingCycleDuration: 1,
  //     billingCycleUnit: 'month',
  //     trialDuration: 14,
  //     trialUnit: 'days',
  //   });
  // });

  it('should open popup on response', () => {
    const spy = spyOn(router, 'navigate');
    component.openResponseDialog({});
    fixture.detectChanges();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it('should open popup on action', () => {
    const spy = spyOn(component, 'processAction');
    component.openActionDialog({}, 'CREATE');
    fixture.detectChanges();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it('should open popup on back', () => {
    const spy = spyOn(router, 'navigate');
    component.openBackDialog();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should format plan details', () => {
    component.formatPlanDetails(mockPlan);
    expect(component.planDetails).toBe('$2.99/3 months, 2 day trial.');
    component.formatPlanDetails(mockPlanNft);
    expect(component.planDetails).toBe('$2.99/3 months, no trial.');
  });
});
