import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { validatePromoPrice } from './promo-price-validator';

describe('promo price validator', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should return error if plan price is smaller than promo price', () => {
    const promoPriceValidator = validatePromoPrice(8.99);
    const control = new FormControl('input');
    control.setValue(11);
    const re = promoPriceValidator(control);
    expect(re.validatePromoPriceError).toBe(true);
  });

  it('should not return error when plan price is bigger than promo price', () => {
    const promoPriceValidator = validatePromoPrice(8.99);
    const control = new FormControl('input');
    control.setValue(8.98);
    const re = promoPriceValidator(control);
    expect(re).toBe(null);
  });

  it('should not return error when plan price is the same as promo price', () => {
    const promoPriceValidator = validatePromoPrice(8.99);
    const control = new FormControl('input');
    control.setValue(8.99);
    const re = promoPriceValidator(control);
    expect(re).toBe(null);
  });
});
