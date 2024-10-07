import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ConfigurationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  const mockResponse = {
    gb: {
      displayName: 'GB',
    },
    us: {
      displayName: 'US',
    },
  };

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should build regions', () => {
    const result = service.buildRegions(mockResponse);
    expect(result).toEqual([
      { id: 'gb', title: 'GB' },
      { id: 'us', title: 'US' },
    ]);
  });
});
