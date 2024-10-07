import { Component, OnDestroy, OnInit } from '@angular/core';
import { PlansService } from '../../service/plans.service';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../components/base/base.component';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { StatusEnum } from '../../types/enum';
import { PROCEED_MESSAGE } from '../../constants';
import { LoaderService } from 'src/app/service/loader.service';
import { OpenErrorDialogOptions } from '../../types/OpenErrorDialogOptions';
import * as pluralize from 'pluralize';

@Component({
  selector: 'app-detail-plan-page',
  templateUrl: './detail-plan-page.component.html',
  styleUrls: ['./detail-plan-page.component.scss'],
})
export class DetailPlanPageComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  planName: string;
  planCode: string;
  price: number;
  billingCycleDuration: string;
  totalBillingCycles: number;
  trialDuration: string;
  numberOfUsers: number;
  routerSubscription: Subscription;
  dialogResponseSubscription: Subscription;
  status: number;
  StatusEnum = StatusEnum;
  retireButtonText: string;

  constructor(
    private route: ActivatedRoute,
    private planService: PlansService,
    public dialog: MatDialog,
    public router: Router,
    public loaderService: LoaderService,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.routerSubscription = this.route.paramMap.subscribe(
      (params: ParamMap) => {
        this.planCode = params.get('planCode');
        this.getPlan();
      },
    );
  }

  async getPlan() {
    try {
      this.loaderService.show('Retrieving plan details...');
      const data = await this.planService.getPlan(this.planCode).toPromise();
      this.planName = data.planName;
      this.planCode = data.planCode;
      this.price = data.price;
      const unit = data.billingCycleUnit
        ? pluralize(data.billingCycleUnit, data.billingCycleDuration)
        : '';
      this.billingCycleDuration = data.billingCycleDuration + ' ' + unit;
      this.totalBillingCycles = data.totalBillingCycles;
      if (
        (data.trialDuration == null && data.trialUnit == null) ||
        data.trialDuration === 0
      ) {
        this.trialDuration = 'No Trial';
      } else {
        const trialUnit = pluralize(data.trialUnit, data.trialDuration);
        this.trialDuration = data.trialDuration + ' ' + trialUnit;
      }
      this.status = data.statusId;
      this.numberOfUsers = data.numberOfUsers;
      this.retireButtonText = this.determineButtonText(this.status);
    } catch (err) {
      this.openErrorDialog(err, {
        navigatingFrom: 'plans',
        reload: false,
      } as OpenErrorDialogOptions);
    } finally {
      this.loaderService.hide();
    }
  }

  editPlan() {
    this.router.navigate(['/plans/update', this.planCode]);
  }

  return() {
    this.router.navigate(['/plans']);
  }

  refresh() {
    window.location.reload();
  }

  onSubmit(type) {
    const action = {};
    action['message'] = PROCEED_MESSAGE + type + '?';
    action['action'] = 'prompt';
    this.openActionDialog(action, type);
  }

  async createPlan() {
    try {
      this.loaderService.show();
      const response = await this.planService
        .publishPlan(this.planCode)
        .toPromise();
      this.openResponseDialog(response, 'detail');
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async archivePlan() {
    try {
      this.loaderService.show();
      const response = await this.planService
        .archivePlan(this.planCode)
        .toPromise();
      this.openResponseDialog(response, 'plans');
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  openResponseDialog(response, returnTo) {
    const dialogResponseRef = super.openResponse(response);
    this.dialogResponseSubscription = dialogResponseRef
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          if (returnTo === 'plans') {
            this.return();
          } else {
            this.refresh();
          }
        }
      });
  }

  openActionDialog(action, type) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            if (type === 'CREATE') {
              this.createPlan();
            } else if (type === 'DELETE' || type === 'RETIRE') {
              this.archivePlan();
            }
          }
        });
    }
  }

  ngOnDestroy() {
    this.routerSubscription.unsubscribe();
    if (this.dialogResponseSubscription !== undefined) {
      this.dialogResponseSubscription.unsubscribe();
    }
  }
}
