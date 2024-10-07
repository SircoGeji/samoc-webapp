import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { UploadService } from './upload.service';
import { getApiEndpoint } from '../helpers/string-utils';

const mockUploadUrl = getApiEndpoint('/api/uploadImage');

describe('UploadService', () => {
  let service: UploadService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UploadService],
    });
    service = TestBed.inject(UploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should upload image', () => {
    const file = new Blob([]);
    service.uploadImage(file).subscribe((data) => {});
    const req = httpMock.expectOne(mockUploadUrl);
    expect(req.request.method).toEqual('POST');
    req.flush({});
  });

  it('should handle 404 error on upload image', () => {
    const file = new Blob([]);
    const emsg = 'deliberate 404 error';

    service.uploadImage(file).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockUploadUrl);
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });
});
