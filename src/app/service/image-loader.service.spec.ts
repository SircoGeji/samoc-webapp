import { TestBed } from '@angular/core/testing';

import { ImageLoaderService } from './image-loader.service';

describe('ImageDimensionsService', () => {
  let service: ImageLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
