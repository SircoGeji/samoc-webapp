import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { offerCodeValidator } from './offer-code-validator';

describe('OfferCodeValidatorService', () => {
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should return null', fakeAsync(() => {
    const storeCode = 'twlght-web-us';
    const asyncValidatorFn = offerCodeValidator(http, storeCode);
    const control = null;
    const re = asyncValidatorFn(control);
    expect(re).toBe(null);
  }));
});
