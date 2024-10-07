import { TestBed } from '@angular/core/testing';
import { planCodeValidator } from './plan-code-validator';
import { HttpClient } from '@angular/common/http';

describe('PlanCodeValidatorService', () => {
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be null', () => {
    const storeCode = 'twlght-web-us';
    const asyncValidatorFn = planCodeValidator(http, storeCode);
    const control = null;
    const re = asyncValidatorFn(control);
    expect(re).toBe(null);
  });
});
