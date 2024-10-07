import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable()
export class ShareInterOfferService {
    shareInterOfferSource: BehaviorSubject<any> = new BehaviorSubject(null);
    shareInterOffer$: Observable<any> = this.shareInterOfferSource.asObservable();
    setInterOfferService(detail:any) {
        this.shareInterOfferSource.next(detail);
    }
}
