import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { HeaderComponent } from './header.component';
import { Router, ActivatedRoute } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { of, throwError } from 'rxjs';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ConfigurationService } from '../../service/configuration.service';
import { AuthenticationService } from '../../service/authentication.service';
import { StorePayload } from '../../types/payload';

const mockStores = { web: { displayName: 'WEB', storeCode: 'twlght-web-it' } };
const mockBrands = {
  twlght: {
    displayName: 'twlght',
    platforms: { web: { displayName: 'WEB', storeCode: 'twlght-web-mx' } },
  },
};
const mockResponse = {
  success: true,
  status: 200,
  message: 'Stores found',
  data: {
    es: {
      displayName: 'ES',
      brands: {
        twlghtplay: {
          displayName: 'twlghtPLAY',
          platforms: {
            web: { displayName: 'WEB', storeCode: 'twlghtplay-web-es' },
          },
        },
      },
    },
    gb: {
      displayName: 'GB',
      brands: {
        twlghtplay: {
          displayName: 'twlghtPLAY',
          platforms: {
            web: { displayName: 'WEB', storeCode: 'twlghtplay-web-gb' },
          },
        },
      },
    },
    it: {
      displayName: 'IT',
      brands: {
        twlghtplay: {
          displayName: 'twlghtPLAY',
          platforms: {
            web: { displayName: 'WEB', storeCode: 'twlghtplay-web-it' },
          },
        },
      },
    },
    mx: {
      displayName: 'MX',
      brands: {
        twlghtplay: {
          displayName: 'twlghtPLAY',
          platforms: {
            web: { displayName: 'WEB', storeCode: 'twlghtplay-web-mx' },
          },
        },
      },
    },
    us: {
      displayName: 'US',
      brands: {
        pantaya: {
          displayName: 'Pantaya',
          platforms: {
            web: { displayName: 'WEB', storeCode: 'pantaya-web-us' },
          },
        },
        twlght: {
          displayName: 'twlght',
          platforms: { web: { displayName: 'WEB', storeCode: 'twlght-web-us' } },
        },
      },
    },
  },
};
describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let route: ActivatedRoute;
  let router: Router;
  let httpMock: HttpTestingController;
  let configService: ConfigurationService;
  let authenticationService: AuthenticationService;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [HeaderComponent],
        imports: [
          RouterTestingModule,
          HttpClientTestingModule,
          LoggerTestingModule,
          MatMenuModule,
        ],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              routeConfig: {
                path: of({}),
              },
            },
          },
          {
            provide: authenticationService,
            useValue: {
              logout: () => of(Promise.resolve({ msg: 'logout' })),
            },
          },
          {
            provide: authenticationService,
            useValue: {
              getRegions: () => of({}),
              fetchConfig: () => of(Promise.resolve({ mockResponse })),
            },
          },
        ],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    route = TestBed.inject(ActivatedRoute);
    router = TestBed.inject(Router);
    configService = TestBed.inject(ConfigurationService);
    authenticationService = TestBed.inject(AuthenticationService);
    httpMock = TestBed.inject(HttpTestingController);
    component.ngOnInit();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call service logout', () => {
    const spy = spyOn(authenticationService, 'logout');
    component.logout();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should call service on change region', () => {
    const spy = spyOn(configService, 'setRegion');
    component.changeRegion('us');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should call get regions', () => {
    const spy1 = spyOn(configService, 'getConfigResponse').and.returnValue(
      mockResponse as StorePayload,
    );
    const spy2 = spyOn(configService, 'getRegions');
    fixture.detectChanges();
    component.fetchConfig();
    expect(spy1).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
  });

  it('should call service on change brand', () => {
    const spy = spyOn(configService, 'setBrand').and.callThrough();
    component.changeBrand('twlght');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should call service on change store', () => {
    const spy = spyOn(configService, 'setStore');
    component.changeStore('WEB');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('should call service fetch stores data', () => {
    const spy1 = spyOn(configService, 'fetchConfig');
    component.fetchConfig();
    fixture.detectChanges();
    expect(spy1).toHaveBeenCalled();
  });

  it('should build store', () => {
    const stores = component.buildStores(mockStores);
    fixture.detectChanges();
    expect(stores).toEqual([
      Object({ storeCode: 'twlght-web-it', title: 'WEB', id: 'web' }),
    ]);
  });

  it('should build brands', () => {
    const brands = component.buildBrands(mockBrands);
    fixture.detectChanges();
    expect(brands).toEqual([Object({ id: 'twlght', title: 'twlght' })]);
  });

  it('disable based on route', () => {
    const spy = spyOnProperty(router, 'url', 'get').and.returnValue('/offers');
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.showTab).toBe(true);
  });

  it('disable based on route else case', () => {
    const spy = spyOnProperty(router, 'url', 'get').and.returnValue(
      '/plans/create',
    );
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.showTab).toBe(false);
  });

  it('should fetch health status', () => {
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.healthStatus).toBe(true);
  });

  it('should fetch fetchHealthStatus - success', () => {
    const response: any = {
      success: true,
      status: 200,
      message: 'samoc API Service Available',
      data: {
        envname: 'dev',
        version: '2.2.0',
      },
    };

    spyOn(configService, 'fetchHealthStatus').and.returnValue(of(response));
    component.fetchHealthStatus();
    fixture.detectChanges();
    expect(component.healthStatus).toEqual(true);
    expect(component.serverVer).toEqual('v2.2.0');
  });

  it('should fetch fetchHealthStatus - fail', () => {
    spyOn(configService, 'fetchHealthStatus').and.returnValue(
      throwError({ status: 500 }),
    );
    component.fetchHealthStatus();
    fixture.detectChanges();
    expect(component.healthStatus).toEqual(false);
  });
});
