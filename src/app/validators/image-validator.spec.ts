import { TestBed } from '@angular/core/testing';

import { ImageValidator } from './image-validator';

describe('ImageValidatorService', () => {
  let service: ImageValidator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageValidator);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
