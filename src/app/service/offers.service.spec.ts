import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { OffersService } from './offers.service';
import { CodeType, StatusEnum } from '../types/enum';
import { getApiEndpoint } from '../helpers/string-utils';

const mockOffersUrl = getApiEndpoint('/api/offers');

const mockOffer = {
  offerCode: '123',
  offerType: { id: 1, title: 'Default Signup' },
  offerCodeType: CodeType.SINGLE_CODE,
  totalRedemptions: null,
  totalUniqueCodes: 0,
  plan: {
    planCode: 'twlght6month',
    planPrice: 44,
    trialOffer: 'customize',
    trialDuration: 1,
    trialUnit: 'days',
  },
  offerHeader: '123',
  offerName: '123',
  offerBodyText: '123dsf',
  offerBoldedText: '123',
  offerCTA: '123d',
  offerAppliedBannerText: '',
  offerBgImageUrl: '',
  legalDisclaimer: '123',
  welcomeEmailText: '123',
  offer: 'trial',
  offerPrice: 0,
  offerDurationType: '14-days',
  offerDurationValue: 14,
  offerDurationUnit: 'days',
  offerBusinessOwner: '123',
  offerVanityUrl: '',
  publishDate: '7/16/2020',
  publishTime: '10:00 AM',
  endDate: null,
  endTime: null,
  noEndDate: true,
  status: 'Published Prod',
};

const mockOffers = {
  success: true,
  status: 200,
  message: 'Offers found',
  data: [
    {
      offerCode: '123',
      offerType: { id: 1, title: 'Default Signup' },
      offerCodeType: CodeType.SINGLE_CODE,
      totalRedemptions: null,
      totalUniqueCodes: 0,
      plan: {
        planCode: 'twlght6month',
        planPrice: 44,
        trialOffer: 'customize',
        trialDuration: 1,
        trialUnit: 'days',
      },
      offerHeader: '123',
      offerName: '123',
      offerBodyText: '123dsf',
      offerBoldedText: '123',
      offerCTA: '123d',
      offerAppliedBannerText: '',
      offerBgImageUrl: '',
      legalDisclaimer: '123',
      welcomeEmailText: '123',
      offer: 'trial',
      offerPrice: 0,
      offerDurationType: '14-days',
      offerDurationValue: 14,
      offerDurationUnit: 'days',
      offerBusinessOwner: '123',
      offerVanityUrl: '',
      publishDate: '7/16/2020',
      publishTime: '10:00 AM',
      endDate: null,
      endTime: null,
      noEndDate: true,
      status: 'Published Prod',
    },
  ],
};
const mockResponse = {
  success: true,
  status: 200,
  message: 'Offer (123) found',
  data: {
    offerCode: '123',
    offerType: { id: 1, title: 'Default Signup' },
    offerCodeType: CodeType.SINGLE_CODE,
    totalRedemptions: null,
    totalUniqueCodes: 0,
    plan: {
      planCode: 'twlght6month',
      planPrice: 44,
      trialOffer: 'customize',
      trialDuration: 1,
      trialUnit: 'days',
    },
    offerHeader: '123',
    offerName: '123',
    offerBodyText: '123dsf',
    offerBoldedText: '123',
    offerCTA: '123d',
    offerAppliedBannerText: '',
    offerBgImageUrl: '',
    legalDisclaimer: '123',
    welcomeEmailText: '123',
    offer: 'trial',
    offerPrice: 0,
    offerDurationType: '14-days',
    offerDurationValue: 14,
    offerDurationUnit: 'days',
    offerBusinessOwner: '123',
    offerVanityUrl: '',
    publishDate: '7/16/2020',
    publishTime: '10:00 AM',
    endDate: null,
    endTime: null,
    noEndDate: true,
    status: 'Published Prod',
  },
};
const mockStore = {
  storeCode: 'twlght',
};

describe('OffersService', () => {
  let service: OffersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OffersService],
    });
    service = TestBed.inject(OffersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all offers', () => {
    service.getOffers(mockStore).subscribe((data) => {
      expect(data.length).toBe(1);
    });

    const req = httpMock.expectOne(mockOffersUrl + '?store=twlght');
    expect(req.request.method).toEqual('GET');
    req.flush(mockOffers);
  });

  it('should handle 404 error on fetching all offers', () => {
    const emsg = 'deliberate 404 error';
    service.getOffers(mockStore).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockOffersUrl + '?store=twlght');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should fetch single offer', () => {
    service.getOffer(4).subscribe((data) => {});
    const req = httpMock.expectOne(mockOffersUrl + '/4');
    expect(req.request.method).toEqual('GET');
    req.flush(mockResponse);
  });

  it('should handle 404 error on fetching single offer', () => {
    const emsg = 'deliberate 404 error';
    service.getOffer(4).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockOffersUrl + '/4');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should add draft', () => {
    service.addDraft(mockOffer).subscribe((data) => {});
    const req = httpMock.expectOne(mockOffersUrl + '/save');
    expect(req.request.method).toEqual('POST');
    req.flush({});
  });

  it('should handle 404 error on adding draft', () => {
    const emsg = 'deliberate 404 error';
    service.addDraft(mockOffer).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockOffersUrl + '/save');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should create offer', () => {
    service.createOffer(mockOffer).subscribe((data) => {});
    const req = httpMock.expectOne(mockOffersUrl + '/create');
    expect(req.request.method).toEqual('POST');
    req.flush(mockOffer);
  });

  it('should handle 404 error on create offer', () => {
    const emsg = 'deliberate 404 error';
    service.createOffer(mockOffer).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockOffersUrl + '/create');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should update offer', () => {
    service.updateOffer(mockOffer, 4).subscribe((data) => {});
    const req = httpMock.expectOne(mockOffersUrl + '/4');
    expect(req.request.method).toEqual('PUT');
    req.flush({});
  });

  it('should handle 404 error on update offer', () => {
    const emsg = 'deliberate 404 error';
    service.updateOffer(mockOffer, 4).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockOffersUrl + '/4');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should send get request on validate offer', () => {
    service.validateOffer(4).subscribe((data) => {});
    const req = httpMock.expectOne(mockOffersUrl + '/4/validate');
    expect(req.request.method).toEqual('GET');
    req.flush({});
  });

  it('should handle 404 error on validate offer', () => {
    const emsg = 'deliberate 404 error';
    service.validateOffer(4).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockOffersUrl + '/4/validate');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should send get request on publish offer', () => {
    service.publishOffer(4).subscribe((data) => {});
    const req = httpMock.expectOne(mockOffersUrl + '/4/publish');
    expect(req.request.method).toEqual('GET');
    req.flush({});
  });

  it('should handle 404 error on publish offer', () => {
    const emsg = 'deliberate 404 error';
    service.publishOffer(4).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockOffersUrl + '/4/publish');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });

  it('should determine duration', () => {
    let result = service.determineDuration(7, 'day');
    expect(result).toBe('7 days');
    result = service.determineDuration(7, null);
    expect(result).toBe(' ');
  });

  // it('should format date and time', () => {
  //   let result = service.formatDateTime('2020-07-17T05:00:00.000Z', 'date');
  //   expect(result).toBe('7/16/2020');
  //   result = service.formatDateTime('2020-07-17T05:00:00.000Z', 'time');
  //   expect(result).toBe('10:00 PM');
  // });

  it('should send get request on archive offer', () => {
    service.archiveOffer(4).subscribe((data) => {});
    const req = httpMock.expectOne(mockOffersUrl + '/4');
    expect(req.request.method).toEqual('DELETE');
    req.flush({});
  });

  it('should handle 404 error on archive offer', () => {
    const emsg = 'deliberate 404 error';
    service.archiveOffer(4).subscribe(
      () => fail('should have failed with the 404 error'),
      (error: HttpErrorResponse) => {
        expect(error.status).toEqual(404, 'status');
        expect(error.error).toEqual(emsg, 'message');
      },
    );
    const req = httpMock.expectOne(mockOffersUrl + '/4');
    req.flush(emsg, { status: 404, statusText: 'Not Found' });
  });
});
