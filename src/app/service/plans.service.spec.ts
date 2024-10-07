import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { PlansService } from './plans.service';
import { HttpErrorResponse } from '@angular/common/http';
import { getApiEndpoint } from '../helpers/string-utils';

const mockPlan = {
  planName: 'QA Monthly NFT',
  planCode: 'qamonthlynft',
  price: 8.99,
  billingCycle: 'month',
  billingCycleDuration: 1,
  billingCycleUnit: 'months',
  trialOffer: 'customize',
  trialDuration: 7,
  trialUnit: 'months',
  numberOfUsers: 0,
  status: 1,
};
const mockPlanResponse = {
  success: true,
  status: 200,
  message: 'Plans found',
  data: {
    planName: 'QA Monthly NFT',
    planCode: 'qamonthlynft',
    price: 8.99,
    billingCycle: 'month',
    billingCycleDuration: 1,
    billingCycleUnit: 'months',
    trialOffer: 'customize',
    trialDuration: 7,
    trialUnit: 'months',
    numberOfUsers: 0,
    status: 1,
  },
};

const mockPlans = {
  success: true,
  status: 200,
  message: 'Plans found',
  data: [
    {
      planName: 'QA Monthly NFT',
      planCode: 'qamonthlynft',
      price: 8.99,
      billingCycle: 'month',
      billingCycleDuration: 1,
      billingCycleUnit: 'months',
      trialOffer: 'customize',
      trialDuration: 7,
      trialUnit: 'months',
      numberOfUsers: 0,
      status: 1,
    },
    {
      planName: 'twlght6month',
      planCode: 'twlght6month',
      price: 44,
      billingCycle: '6-months',
      billingCycleDuration: 6,
      billingCycleUnit: 'months',
      trialOffer: 'customize',
      trialDuration: 1,
      trialUnit: 'days',
      numberOfUsers: 0,
      status: 1,
    },
  ],
};
const mockPlanUrl = getApiEndpoint('/api/plans');
const mockStore = {
  storeCode: 'twlght',
};

describe('PlansService', () => {
  let service: PlansService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PlansService],
    });
    service = TestBed.inject(PlansService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all plans', () => {
    service.fetch(mockStore).subscribe((data) => {});
    const req = httpMock.expectOne(mockPlanUrl + '?store=twlght');
    expect(req.request.method).toEqual('GET');
    req.flush(mockPlans);
  });

  it('should handle 404 error on fetch all plans', () => {
    const emsg = 'deliberate 404 error';

    service.fetch(mockStore).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockPlanUrl + '?store=twlght');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should get plan', () => {
    service.getPlan('planCode').subscribe((data) => {});
    const req = httpMock.expectOne(mockPlanUrl + '/planCode');
    expect(req.request.method).toEqual('GET');
    req.flush(mockPlanResponse);
  });

  it('should handle 404 error on get plan', () => {
    const emsg = 'deliberate 404 error';

    service.getPlan('planCode').subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockPlanUrl + '/planCode');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should update plan', () => {
    service.publishPlan('planCode').subscribe((data) => {});
    const req = httpMock.expectOne(mockPlanUrl + '/planCode/publish');
    expect(req.request.method).toEqual('GET');
    req.flush({});
  });

  it('should handle 404 error on update plan', () => {
    const emsg = 'deliberate 404 error';

    service.publishPlan('planCode').subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockPlanUrl + '/planCode/publish');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should archive plan', () => {
    service.archivePlan('planCode').subscribe((data) => {});
    const req = httpMock.expectOne(mockPlanUrl + '/planCode');
    expect(req.request.method).toEqual('DELETE');
    req.flush({});
  });

  it('should handle 404 error on archive plan', () => {
    const emsg = 'deliberate 404 error';

    service.archivePlan('planCode').subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockPlanUrl + '/planCode');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should add draft plan', () => {
    service.addDraft(mockPlan, mockStore).subscribe((data) => {});
    const req = httpMock.expectOne(mockPlanUrl + '/save?store=twlght');
    expect(req.request.method).toEqual('POST');
    req.flush({});
  });

  it('should handle 404 error on add draft plan', () => {
    const emsg = 'deliberate 404 error';

    service.addDraft(mockPlan, mockStore).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockPlanUrl + '/save?store=twlght');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should add plan', () => {
    service.addPlan(mockPlan, mockStore).subscribe((data) => {});
    const req = httpMock.expectOne(mockPlanUrl + '/create?store=twlght');
    expect(req.request.method).toEqual('POST');
    req.flush({});
  });

  it('should handle 404 error on add plan', () => {
    const emsg = 'deliberate 404 error';

    service.addPlan(mockPlan, mockStore).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockPlanUrl + '/create?store=twlght');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should update draft plan', () => {
    service.updatePlan(mockPlan, 'planCode').subscribe((data) => {});
    const req = httpMock.expectOne(mockPlanUrl + '/planCode');
    expect(req.request.method).toEqual('PUT');
    req.flush({});
  });

  it('should handle 404 error on update draft plan', () => {
    const emsg = 'deliberate 404 error';

    service.updatePlan(mockPlan, 'planCode').subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockPlanUrl + '/planCode');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should determine duration', () => {
    let result = service.determineDuration(1, 'week');
    expect(result).toBe('1 week');
    result = service.determineDuration(1, null);
    expect(result).toBe('');
  });
});
