import { AuthGuard } from './auth.guard';
import { TestBed, getTestBed } from '@angular/core/testing';
import { AuthenticationService } from '../service/authentication.service';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AuthGuard helpers', () => {
  let injector: TestBed;
  let guard: AuthGuard;
  const routeMock: any = {
    snapshot: {},
    params: { idOrCreationKeyWord: 'create' },
  };
  const routerStateMock: any = { snapshot: {}, url: '/login' };

  const routerMock = { navigate: jasmine.createSpy('navigate') };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        AuthGuard,
        AuthenticationService,
      ],
      imports: [HttpClientTestingModule],
    });
    injector = getTestBed();
    guard = injector.inject(AuthGuard);
  });

  it('should be able to access with user email', () => {
    localStorage.setItem('email', 'random@email.com');
    const res = guard.canActivate(routeMock, routerStateMock);
    expect(res).toBe(true);
  });

  it('should not be able to access with without user email', () => {
    localStorage.clear();
    const res = guard.canActivate(routeMock, routerStateMock);
    expect(res).toBe(false);
  });
});
