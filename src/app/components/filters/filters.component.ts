import { Component, OnDestroy, OnInit } from '@angular/core';

import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ConfigurationService } from '../../service/configuration.service';
import { LoaderService } from '../../service/loader.service';
import { OffersService } from '../../service/offers.service';
import { PlansService } from '../../service/plans.service';
import {
  FiltersStatus,
  RetentionOfferFilterRule,
  UserEligibilityStatus,
} from '../../types/payload';

import { BaseComponent } from '../../components/base/base.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { getServerDateTime } from '../../helpers/date-utils';
import { getStatusColor } from '../../helpers/color-utils';
import duplicates from 'find-array-duplicates';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { PlatformEnum, StatusEnum } from '../../types/enum';

@Component({
  selector: 'app-filters',
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.scss'],
})
export class FiltersComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  dialogResponseSubscription: Subscription;
  public store: any;
  storeSubscription: Subscription;

  public rulesJson: string;
  public rules: RetentionOfferFilterRule[] = [];
  public plans: any[] = [];
  public createdOffers: any[] = [];
  public backEndData = new Map<string, any>();
  public rulesErrors = new Set<string>();

  private destroy$ = new Subject<void>();

  public description: string;
  public testUrl: string;
  public canEdit: boolean;
  public canRetire: boolean;
  public canSave: boolean;
  public canPublish: boolean;
  public canUpdate: boolean;
  public canCreate: boolean;
  public rollbackName: string;
  public status: number;
  public isDraft: boolean;
  public newRuleName: string;
  public expansionPanels: boolean[] = [];
  public statesList: any[] = [];
  public currentRegion: string = '';

  private waitCount = 0;

  constructor(
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public router: Router,
    private plansService: PlansService,
    private offersService: OffersService,
    private configService: ConfigurationService,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.storeSubscription = this.configService.store
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (
          value.id !== PlatformEnum.ANDROID &&
          value.id !== PlatformEnum.ROKU
        ) {
          this.store = value;
          this.getAllPlans();
          this.getCreatedOffers();
          this.getRetentionOffersForTerms();
        }
      });
  }

  setRegionCode(): void {
    this.currentRegion = this.configService.getRegion()['title'];
  }

  showLoader() {
    if (this.waitCount === 0) {
      this.loaderService.show('Caching data...');
    }
    this.waitCount++;
  }

  hideLoader() {
    this.waitCount--;
    if (this.waitCount === 0) {
      this.loaderService.hide();
    }
  }

  getAllPlans() {
    this.showLoader();
    this.plansService
      .getAllPlans(this.store)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (allPlans) => {
          this.plans = allPlans;
          this.setRegionCode();
          this.hideLoader();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  getCreatedOffers() {
    this.showLoader();
    this.offersService
      .getOffers(this.store.storeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (createdOffers) => {
          this.createdOffers = createdOffers;
          this.hideLoader();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  getRetentionOffersForTerms() {
    this.showLoader();
    this.offersService
      .getRetentionOffersForTerms(this.store.storeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res) => {
          res.forEach((val) =>
            this.offersService.retentionOffersForTerms.set(
              val.term,
              val.allowedOffers,
            ),
          );
          this.offersService.allGlRetentionOffers = new Map(
            this.offersService.retentionOffersForTerms
              .get(0)
              .map((o) => [o.offerCode, o]),
          );
          this.getAllStates();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  rulesDuplicatesExists() {
    const nameSet = new Set();
    const planTrialActiveInactive = new Set();
    this.rules.forEach((rule) => {
      nameSet.add(rule.name);
      planTrialActiveInactive.add(
        (rule.planLengthInMonths ?? '') +
          '/' +
          (rule.isInFreeTrial ?? '') +
          '/' +
          (rule.activeCoupons?.join(' ') ?? '') +
          '/' +
          (rule.inactiveCoupons?.join(' ') ?? ''),
      );
    });
    return (
      planTrialActiveInactive.size !== this.rules.length ||
      nameSet.size !== this.rules.length
    );
  }

  isRuleDuplicate(checkName: string) {
    const filteredRules = this.rules.map((rule) => {
      return {
        name: rule.name,
        planTrialActiveInactive:
          (rule.planLengthInMonths ?? '') +
          '/' +
          (rule.isInFreeTrial ?? '') +
          '/' +
          (rule.activeCoupons?.join(' ') ?? '') +
          '/' +
          (rule.inactiveCoupons?.join(' ') ?? ''),
      };
    });

    const duplicatesPlanTrialActiveInactive = duplicates(
      filteredRules,
      'planTrialActiveInactive',
    ).all();
    const duplicatesNames = duplicates(filteredRules, 'name').all();

    const resultPlanTrialActiveInactive = duplicatesPlanTrialActiveInactive.some(
      (rule) => rule.name === checkName,
    );
    const resultName = duplicatesNames.some((rule) => rule.name === checkName);

    return resultPlanTrialActiveInactive || resultName;
  }

  defaultRuleExists() {
    const result = this.rules.some((rule) => {
      if (rule.name === 'Default') {
        return true;
      }
    });
    return result;
  }

  emptyRuleExist() {
    const result = this.rules.some((rule) => {
      if (rule.name !== 'Default') {
        return !rule.name || rule.name.length === 0;
      }
    });
    return result;
  }

  isEmptyRule(rule: RetentionOfferFilterRule) {
    if (rule.name !== 'Default') {
      return !rule.name || rule.name.length === 0;
    }
  }

  formatTs(isoTs: string) {
    const date = getServerDateTime(isoTs, 'date');
    const time = getServerDateTime(isoTs, 'time');
    return `${date} ${time}`;
  }

  getAllStates() {
    this.offersService
      .getAllStates(this.currentRegion)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (res && res.data) {
          this.statesList = res.data;
        }
        this.getRetentionOfferRules();
      });
  }

  getRetentionOfferRules() {
    this.offersService
      .getRetentionOfferRules(this.store.storeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res) => {
          this.hideLoader();
          if (!!res) {
            this.offersService.retentionOfferFiltersPayload = res;
            this.rules = res.rules;
            this.rulesJson = JSON.stringify(this.rules);
            this.canEdit = true; // res.filterState.status !== UserEligibilityStatus.STG;
            this.canRetire = res.filterState.canRetire;
            this.canPublish =
              res.filterState.status === UserEligibilityStatus.STG; // && !this.canEdit;
            this.canUpdate =
              this.canEdit &&
              res.filterState.status === UserEligibilityStatus.STG;
            this.canSave = res.filterState.status !== UserEligibilityStatus.STG;
            this.isDraft = res.filterState.status === UserEligibilityStatus.DFT;
            this.canCreate = true;
            this.status = res.filterState.status;
            if (res.filterState.status === UserEligibilityStatus.STG) {
              this.rollbackName = 'ROLLBACK STG';
              this.description = `Created by ${
                res.filterState.updatedBy
              } at ${this.formatTs(res.filterState.updatedAt)}`;
              this.testUrl = res.filterState.testUrl ?? '';
            } else if (res.filterState.status === UserEligibilityStatus.PROD) {
              this.rollbackName = 'ROLLBACK PROD';
              this.description = `Published by ${
                res.filterState.updatedBy
              } at ${this.formatTs(res.filterState.updatedAt)}`;
              this.testUrl = res.filterState.testUrl ?? '';
            } else if (res.filterState.status === UserEligibilityStatus.DFT) {
              this.rollbackName = 'DELETE DFT';
              this.description = `Saved by ${
                res.filterState.updatedBy
              } at ${this.formatTs(res.filterState.updatedAt)}`;
              this.testUrl = res.filterState.testUrl ?? '';
            } else {
              this.rollbackName = 'ROLLBACK PROD';
              this.description = 'Based on PROD configuration';
            }
            this.rules.forEach((rule) => {
              this.expansionPanels.push(false);
            });

            if (res.filterState.errorMessage) {
              this.openResponse({ message: res.filterState.errorMessage });
            }
          }
        },
        (err) => this.openErrorDialog(err),
      );
  }

  // check if rules were modified
  isModified() {
    return this.rulesJson !== JSON.stringify(this.rules);
  }

  deleteRule(index: number, ruleName: string) {
    const type = 'DELETE';
    const action = {};
    action['message'] = `Do you wish to ${type} "${ruleName}" rule?`;
    action['action'] = 'prompt';
    this.openActionDialog(action, type, index);
  }

  openActionDialog(action, type, index?) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            switch (type) {
              case 'DELETE':
                this.rules.splice(index, 1);
                this.rulesErrors.forEach((ruleError) => {
                  if (Number(ruleError.charAt(0)) === index) {
                    this.rulesErrors.delete(ruleError);
                  }
                });
                this.expansionPanels.splice(index, 1);
                break;
              case 'SYNCHRONIZE':
                this.synchronizeRules();
                break;
            }
          }
        });
    }
  }

  addRule() {
    const cond: RetentionOfferFilterRule = {
      primaryLists: [],
      secondaryLists: [],
      status: FiltersStatus.NEW,
      name: `Rule ${this.rules.length}`,
      isInFreeTrial: null,
      planLengthInMonths: null,
    };
    this.expansionPanels.splice(this.rules.length - 1, 0, true);
    this.rules.splice(this.rules.length - 1, 0, cond);
  }

  ruleName(index: number, rule: RetentionOfferFilterRule): string {
    let name = rule.name;
    if (rule.planLengthInMonths) {
      name += `: ${rule.planLengthInMonths}mo`;
    }
    if (rule.isInFreeTrial != null) {
      name += rule.isInFreeTrial ? ' (Free Trial)' : ' (No Free Trial)';
    }
    if (rule.activeCoupons && rule.activeCoupons.length > 0) {
      if (name !== '') {
        name += '; ';
      }
      name += `Active: ` + rule.activeCoupons.join(', ');
    }
    if (rule.inactiveCoupons && rule.inactiveCoupons.length > 0) {
      if (name !== '') {
        name += '; ';
      }
      name += `Inactive: ` + rule.inactiveCoupons.join(', ');
    }
    if (name === '' && index === this.rules.length - 1) {
      name = 'Default';
    }
    return name;
  }

  ruleDescription(rule: RetentionOfferFilterRule): string {
    let desc = '';
    if (rule.primaryLists.length > 0) {
      desc +=
        ' 1st: ' +
        rule.primaryLists
          .map((offer) => {
            let offerString = '';
            if (offer['name']) {
              offerString += offer['name'];
            } else {
              offerString += 'noName';
            }
            if (offer['offers'] && offer['offers'].length !== 0) {
              const offerOrOffersString =
                offer['offers']?.length > 1 ? 'offers' : 'offer';
              offerString += `: ${offer['offers'].length} ${offerOrOffersString}`;
            } else {
              offerString += ': noOffers';
            }
            return offerString;
          })
          .join(', ');
    }
    if (rule.secondaryLists.length > 0) {
      if (desc !== '') {
        desc += ';';
      }
      desc +=
        ' 2nd: ' +
        rule.secondaryLists
          .map((offer) => {
            let offerString = '';
            if (offer['name']) {
              offerString += offer['name'];
            } else {
              offerString += 'noName';
            }
            if (offer['offers'] && offer['offers'].length !== 0) {
              const offerOrOffersString =
                offer['offers']?.length > 1 ? 'offers' : 'offer';
              offerString += `: ${offer['offers'].length} ${offerOrOffersString}`;
            } else {
              offerString += ': noOffers';
            }
            return offerString;
          })
          .join(', ');
    }
    if (desc === '') {
      desc = 'No Offers';
    }
    return desc;
  }

  mapStatus(): StatusEnum {
    switch (this.status) {
      case UserEligibilityStatus.NEW:
        return StatusEnum.APV_APRVD;
      case UserEligibilityStatus.DFT:
        return StatusEnum.DFT;
      case UserEligibilityStatus.STG:
        return StatusEnum.STG;
      case UserEligibilityStatus.PROD:
        return StatusEnum.PROD;
      default:
        return StatusEnum.PROD_FAIL;
    }
  }

  getStatusColor(): string {
    return getStatusColor(this.mapStatus());
  }

  getStatusTitle() {
    switch (this.status) {
      case UserEligibilityStatus.NEW:
        return 'NEW';
      case UserEligibilityStatus.STG:
        return 'STG';
      case UserEligibilityStatus.PROD:
        return 'PROD';
      case UserEligibilityStatus.DFT:
        return 'DFT';
      default:
        return 'NO DATA';
    }
  }

  canChangeRules() {
    return true;
  }

  serializeData(data) {
    data.rule.primaryLists = [...data.primaryLists];
    data.rule.secondaryLists = [...data.secondaryLists];
    if (!data.isInitial) {
      data.rule.exclusiveOfferOverrides = data.exclusiveOfferOverrides
        ? [...data.exclusiveOfferOverrides]
        : null;
    }
    this.setRuleErrors(data);
  }

  setRuleErrors(data) {
    this.rulesErrors.forEach((ruleError) => {
      if (Number(ruleError.charAt(0)) === data.index) {
        this.rulesErrors.delete(ruleError);
      }
    });
    data.errors.forEach((error) => {
      this.rulesErrors.add(data.index + '-' + error);
    });
  }

  openUpdateResponse(response) {
    super
      .openResponse(response)
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        location.reload();
      });
  }

  async doSave(publish: boolean, saveAsDraft: boolean) {
    try {
      this.loaderService.show();
      const response = await this.offersService
        .updateRetentionOfferRules(
          this.offersService.retentionOfferFiltersPayload,
          this.store.storeCode,
          saveAsDraft ? 'draft' : publish ? 'true' : 'false',
        )
        .toPromise();
      this.openUpdateResponse(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async doRollback() {
    try {
      this.loaderService.show();
      const response = await this.offersService
        .retireRetentionOfferConditions(
          this.offersService.retentionOfferFiltersPayload.filterState,
          this.store.storeCode,
        )
        .toPromise();
      this.openUpdateResponse(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  update(publish: boolean, saveAsDraft: boolean = false) {
    const action = {};
    if (saveAsDraft) {
      action['message'] = 'Save changes as DFT?';
    } else if (publish) {
      action['message'] = 'Publish changes to PROD?';
    } else {
      action['message'] = 'Push changes to STG?';
    }
    action['action'] = 'prompt';
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            this.doSave(publish, saveAsDraft);
          }
        });
    }
  }

  async addDefaultFilter() {
    if (!this.defaultRuleExists()) {
      const defaultRule: RetentionOfferFilterRule = {
        status: FiltersStatus.NEW,
        name: 'Default',
        primaryLists: [],
        secondaryLists: [],
      };
      const action = {};
      action['message'] =
        'Create default filter? Warning: This publishes to STG.';
      action['action'] = 'prompt';
      const dialogActionRef = super.openAction(action);
      if (dialogActionRef) {
        this.dialogResponseSubscription = dialogActionRef
          .afterClosed()
          .subscribe((result) => {
            if (result) {
              this.offersService.retentionOfferFiltersPayload.rules.push(
                defaultRule,
              );
              try {
                this.loaderService.show();
                this.doSave(false, false);
              } catch (err) {
                this.openErrorDialog(err);
              }
            }
          });
      }
    } else {
      this.openErrorDialog(new Error('Default filter already exists!'));
    }
  }

  rollback() {
    const action = {};
    if (
      this.offersService.retentionOfferFiltersPayload.filterState.status ==
      UserEligibilityStatus.DFT
    ) {
      action['message'] = 'Delete DFT?';
    } else if (
      this.offersService.retentionOfferFiltersPayload.filterState.status ==
      UserEligibilityStatus.STG
    ) {
      action['message'] = 'Rollback changes on STG?';
    } else {
      action['message'] = 'Rollback changes on PROD and STG?';
    }
    action['action'] = 'prompt';
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            this.doRollback();
          }
        });
    }
  }

  stage() {
    this.update(false);
  }

  publish() {
    this.update(true);
  }

  save() {
    this.update(false, true);
  }

  create() {}

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.rules, event.previousIndex, event.currentIndex);
    moveItemInArray(
      this.expansionPanels,
      event.previousIndex,
      event.currentIndex,
    );
    if (event.currentIndex === this.rules.length - 1) {
      moveItemInArray(this.rules, event.currentIndex, this.rules.length - 2);
      moveItemInArray(
        this.expansionPanels,
        event.currentIndex,
        this.rules.length - 2,
      );
    }
  }

  hasRuleErrors(rule: RetentionOfferFilterRule, index?: number) {
    return (
      this.isRuleDuplicate(rule.name) ||
      this.isEmptyRule(rule) ||
      this.hasInnerRuleErrors(rule, index)
    );
  }

  hasInnerRuleErrors(rule: RetentionOfferFilterRule, index?: number) {
    return this.hasWeightSumError(index) || this.hasAbsentOffersInLists(index);
  }

  someRuleHasErrors() {
    return this.rulesErrors.size > 0;
  }

  hasWeightSumError(index: number) {
    return (
      this.rulesErrors.has(`${index}-big-weight-sum-1`) ||
      this.rulesErrors.has(`${index}-big-weight-sum-2`)
    );
  }

  hasAbsentOffersInLists(index: number) {
    return (
      this.rulesErrors.has(`${index}-absent-offer-1`) ||
      this.rulesErrors.has(`${index}-absent-offer-2`)
    );
  }

  synchronizeRulesAction(): void {
    const type = 'SYNCHRONIZE';
    const action = {};
    action['message'] = `Do you wish to ${type} all criteria?`;
    action['action'] = 'prompt';
    action['warningMessage'] =
      'Current state of criteria will be replaced by GhotLocker configuration!';
    this.openActionDialog(action, type);
  }

  async synchronizeRules(): Promise<void> {
    try {
      this.loaderService.show();
      const response = await this.offersService
        .synchronizeRules({
          regions: this.store.storeCode.split('-').pop().toUpperCase(),
          createdBy: localStorage.getItem('username') ?? '',
        })
        .toPromise();
      this.openUpdateResponse(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  ngOnDestroy(): void {
    this.storeSubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
