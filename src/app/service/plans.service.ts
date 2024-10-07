import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { PlanRequestPayload, PlanResponsePayload, Plan } from '../types/payload';
import * as pluralize from 'pluralize';
import { getApiEndpoint } from '../helpers/string-utils';

const PLANS_URL = getApiEndpoint('/api/plans');

@Injectable({
  providedIn: 'root',
})
export class PlansService {
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  public masterPlans: Plan[] = [
    {
      billingCycleDuration: 1,
      billingCycleUnit: "month",
      numberOfUsers: 0,
      planCode: "twlght",
      planDetails: "month, 7 days trial",
      // planId: "esdo8qtcwawn",
      planName: "twlght",
      planTrial: "7 days",
      price: 8.99,
      state: "active",
      statusId: 70,
      term: "1 month",
      totalBillingCycles: 1,
      trialDuration: 7,
      trialUnit: "day",
     },
     {
      billingCycleDuration: 1,
      billingCycleUnit: "month",
      numberOfUsers: 0,
      planCode: "twlghtnft",
      planDetails: "month, no trial",
      // planId: "krgzpnyfop2z",
      planName: "twlghtnft",
      planTrial: "",
      price: 8.99,
      state: "active",
      statusId: 70,
      term: "1 month",
      totalBillingCycles: 1,
      trialDuration: 0,
      trialUnit: "days",
     },
    {
      billingCycleDuration: 3,
      billingCycleUnit: "months",
      numberOfUsers: 0,
      planCode: "twlght3month",
      planDetails: "3 months, 7 days trial",
      // planId: "esdo8qtcwawn",
      planName: "twlght3month",
      planTrial: "7 days",
      price: 23.99,
      state: "active",
      statusId: 70,
      term: "3 months",
      totalBillingCycles: 1,
      trialDuration: 7,
      trialUnit: "day",
     },
     {
      billingCycleDuration: 3,
      billingCycleUnit: "months",
      numberOfUsers: 0,
      planCode: "twlght3monthnft",
      planDetails: "3 months, no trial",
      // planId: "krgzpnyfop2z",
      planName: "twlght3monthnft",
      planTrial: "",
      price: 23.99,
      state: "active",
      statusId: 70,
      term: "3 months",
      totalBillingCycles: 1,
      trialDuration: 0,
      trialUnit: "days",
     },
    {
      billingCycleDuration: 6,
      billingCycleUnit: "months",
      numberOfUsers: 0,
      planCode: "twlght6month",
      planDetails: "6 months, 7 days trial",
      // planId: "esdo8qtcwawn",
      planName: "twlght6month",
      planTrial: "7 days",
      price: 43.99,
      state: "active",
      statusId: 70,
      term: "6 months",
      totalBillingCycles: 1,
      trialDuration: 7,
      trialUnit: "day",
     },
     {
      billingCycleDuration: 6,
      billingCycleUnit: "months",
      numberOfUsers: 0,
      planCode: "twlght6monthnft",
      planDetails: "6 months, no trial",
      // planId: "krgzpnyfop2z",
      planName: "twlght6monthnft",
      planTrial: "",
      price: 43.99,
      state: "active",
      statusId: 70,
      term: "6 months",
      totalBillingCycles: 1,
      trialDuration: 0,
      trialUnit: "days",
     },
    {
      billingCycleDuration: 12,
      billingCycleUnit: "months",
      numberOfUsers: 0,
      planCode: "twlghty",
      planDetails: "12 months, 7 days trial",
      // planId: "esdo8qtcwawn",
      planName: "twlghty",
      planTrial: "7 days",
      price: 74.99,
      state: "active",
      statusId: 70,
      term: "12 months",
      totalBillingCycles: 1,
      trialDuration: 7,
      trialUnit: "day",
     },
     {
      billingCycleDuration: 12,
      billingCycleUnit: "months",
      numberOfUsers: 0,
      planCode: "twlghtynft",
      planDetails: "12 months, no trial",
      // planId: "krgzpnyfop2z",
      planName: "twlghtynft",
      planTrial: "",
      price: 74.99,
      state: "active",
      statusId: 70,
      term: "12 months",
      totalBillingCycles: 1,
      trialDuration: 0,
      trialUnit: "days",
     },
  ];

  constructor(private http: HttpClient) {}

  getAllPlans(store = null): Observable<PlanResponsePayload[]> {
    const url = PLANS_URL + (store ? '?store=' + store.storeCode : '');
    return this.http.get<PlanResponsePayload[]>(url).pipe(
      map((data) => {
        return this.processArray(data);
      }),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  getPlan(planCode): Observable<PlanResponsePayload> {
    const url = PLANS_URL + '/' + planCode;
    return this.http.get<PlanResponsePayload>(url).pipe(
      map((data) => {
        return this.processItem(data['data']);
      }),
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  addDraft(plan, store): Observable<PlanRequestPayload> {
    const url = PLANS_URL + '/save?store=' + store.storeCode;
    return this.http.post<PlanRequestPayload>(url, plan, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  addPlan(plan, store): Observable<PlanRequestPayload> {
    const url = PLANS_URL + '/create?store=' + store.storeCode;
    return this.http.post<PlanRequestPayload>(url, plan, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  updatePlan(plan, planCode): Observable<PlanRequestPayload> {
    const url = PLANS_URL + '/' + planCode;
    return this.http.put<PlanRequestPayload>(url, plan, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  publishPlan(planCode): Observable<PlanResponsePayload> {
    const url = PLANS_URL + '/' + planCode + '/publish';
    return this.http.get<PlanResponsePayload>(url).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  archivePlan(planCode): Observable<PlanResponsePayload> {
    const url = PLANS_URL + '/' + planCode;
    return this.http.delete<PlanResponsePayload>(url, this.httpOptions).pipe(
      catchError((err) => {
        return throwError(err);
      }),
    );
  }

  processArray(res) {
    let response = res['data'];
    if (typeof response === 'undefined') {
      response = [];
    }
    return response.map((item) => {
      return this.processItem(item);
    });
  }

  processItem(item) {
    item['planTrial'] = this.determineDuration(
      item['trialDuration'],
      item['trialUnit'],
    );
    item['term'] = this.determineDuration(
      item['billingCycleDuration'],
      item['billingCycleUnit'],
      item['totalBillingCycles'],
    );
    return item;
  }

  determineDuration(value, unit, cycles?) {
    if (value !== null && value !== 0 && unit !== null) {
      if (cycles) {
        return pluralize(unit, cycles * value, true);
      }
      return pluralize(unit, value, true);
    } else {
      return '';
    }
  }

  getMasterPLans() {
    return
  }
}
