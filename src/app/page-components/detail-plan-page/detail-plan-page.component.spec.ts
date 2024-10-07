import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { DetailPlanPageComponent } from './detail-plan-page.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { PlansService } from '../../service/plans.service';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('DetailPlanPageComponent', () => {
  let component: DetailPlanPageComponent;
  let fixture: ComponentFixture<DetailPlanPageComponent>;
  let router: Router;
  let plansService: PlansService;
  let dialogSpy: jasmine.Spy;
  const dialogRefSpyObj = jasmine.createSpyObj({
    afterClosed: of({}),
    close: null,
  });

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [DetailPlanPageComponent],
        imports: [
          RouterTestingModule,
          MatDialogModule,
          BrowserAnimationsModule,
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          {
            provide: PlansService,
            useValue: {
              deletePlan: () => of({}),
              publishPlan: () => of({}),
              archivePlan: () => of({}),
              getPlan: () =>
                of({
                  planName: 'some name',
                }),
            },
          },
        ],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailPlanPageComponent);
    router = TestBed.inject(Router);
    plansService = TestBed.inject(PlansService);
    component = fixture.componentInstance;
    dialogSpy = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue(
      dialogRefSpyObj,
    );
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should lead to edit plan page', () => {
    const spy = spyOn(router, 'navigate');
    component.editPlan();
    expect(spy).toHaveBeenCalled();
  });

  it('should return to plan page', () => {
    const spy = spyOn(router, 'navigate');
    component.return();
    expect(spy).toHaveBeenCalledWith(['/plans']);
  });

  it('should call service on create plan', () => {
    spyOn(component, 'openErrorDialog');
    component.planCode = 'plancode123';
    const spy = spyOn(plansService, 'publishPlan').and.callThrough();
    component.createPlan();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should call service on archive plan', () => {
    spyOn(component, 'openErrorDialog');
    component.planCode = 'plancode123';
    const spy = spyOn(plansService, 'archivePlan');
    component.archivePlan();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should open popup on Submit', () => {
    component.planCode = 'plancode123';
    const spy = spyOn(component, 'openActionDialog');
    component.onSubmit('CREATE');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should open popup on response', () => {
    component.planCode = 'plancode123';
    const spy = spyOn(component, 'return');
    component.openResponseDialog({}, 'plans');
    fixture.detectChanges();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it('should open popup on action', () => {
    component.planCode = 'plancode123';
    const spy = spyOn(component, 'createPlan');
    component.openActionDialog({}, 'CREATE');
    fixture.detectChanges();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    const spy2 = spyOn(component, 'archivePlan');
    component.openActionDialog({}, 'DELETE');
    fixture.detectChanges();
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
  });

  it('should get plan', async () => {
    const spy = spyOn(component, 'getPlan').and.callThrough();
    component.ngOnInit();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
    fixture.whenStable().then(() => {
      expect(component.planName).toBe('some name');
    });
  });

  it('should remove subscription on ng destroy', () => {
    spyOn(component['routerSubscription'], 'unsubscribe');
    component.ngOnDestroy();
    expect(component['routerSubscription'].unsubscribe).toHaveBeenCalledTimes(
      1,
    );
  });
});
