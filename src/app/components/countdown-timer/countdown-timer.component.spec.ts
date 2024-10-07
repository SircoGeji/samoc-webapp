import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as moment from 'moment-timezone';

import { CountDownComponent } from './countdown-timer.component';

describe('CountDownComponent', () => {
  let component: CountDownComponent;
  let fixture: ComponentFixture<CountDownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CountDownComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CountDownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should return getTimeDifference - 8, w/ 10min delay :: should not hide', () => {
    spyOn(component.countdownCompleted, 'emit');
    const testIsoStr = moment().subtract(8, 'minutes');
    const value = component.getTimeDifference(testIsoStr.toISOString(), 600);
    expect(value.shouldHide).toBe(false);
    expect(component.countdownCompleted.emit).toHaveBeenCalledTimes(0);
  });

  it('should return getTimeDifference - 12, w/ 10min delay :: should hide', () => {
    spyOn(component.countdownCompleted, 'emit');
    const testIsoStr = moment().subtract(12, 'minutes');
    const value = component.getTimeDifference(testIsoStr.toISOString(), 600);
    expect(value.shouldHide).toBe(true);
    expect(component.countdownCompleted.emit).toHaveBeenCalledTimes(1);
  });

  it('should return getTimeDifference - 12 with 0 sec delay :: should hide', () => {
    spyOn(component.countdownCompleted, 'emit');
    const testIsoStr = moment().subtract(12, 'minutes');
    const value = component.getTimeDifference(testIsoStr.toISOString(), 0);
    expect(value.shouldHide).toBe(true);
    expect(component.countdownCompleted.emit).toHaveBeenCalledTimes(1);
  });

  it('should return allocateTimeUnits - 0', () => {
    const value = component.allocateTimeUnits(0);
    expect(value).toEqual({
      secondsLeft: 0,
      minutesLeft: 0,
    });
  });

  it('should return allocateTimeUnits - 1000', () => {
    const value = component.allocateTimeUnits(1000);
    expect(value).toEqual({
      secondsLeft: 1,
      minutesLeft: 0,
    });
  });

  it('should return allocateTimeUnits - 60000', () => {
    const value = component.allocateTimeUnits(60000);
    expect(value).toEqual({
      secondsLeft: 0,
      minutesLeft: 1,
    });
  });

  it('should return allocateTimeUnits - 120000', () => {
    const value = component.allocateTimeUnits(121000);
    expect(value).toEqual({
      secondsLeft: 1,
      minutesLeft: 2,
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
