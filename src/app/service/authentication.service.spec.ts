import { TestBed } from '@angular/core/testing';

import { AuthenticationService } from './authentication.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(AuthenticationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check user ', () => {
    spyOn(Object.getPrototypeOf(localStorage), 'getItem').and.returnValue(
      'user',
    );
    const user = service.checkUser();
    expect(Object.getPrototypeOf(localStorage).getItem).toHaveBeenCalled();
    expect(user).toBe('user');
  });
});
