import { Injectable } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { forkJoin, Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConfirmationGuard implements CanDeactivate<any> {
  canDeactivate(
    component: any,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    const conditionRes = component.canNotNavigateBack();

    if (component.editOrCreateModeIsOn) {
      return true;
    }

    if (conditionRes) {
      let subject = new Subject<boolean>();
      component.navigateBack();
      subject = component.subject;
      return subject.asObservable();
    } else {
      return true;
    }
  }
}
