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

import { BaseComponent } from '../base/base.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { getServerDateTime } from '../../helpers/date-utils';
import { getStatusColor } from '../../helpers/color-utils';
import duplicates from 'find-array-duplicates';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { PlatformEnum, StatusEnum } from '../../types/enum';
import { CancelFlowService } from '../../service/cancel-flow.service';
import { FormControl } from '@angular/forms';
import { DateTime } from 'luxon';

@Component({
  selector: 'app-filters-2',
  templateUrl: './filters-2.component.html',
  styleUrls: ['./filters-2.component.scss'],
})
export class FiltersComponent2
  extends BaseComponent
  implements OnInit, OnDestroy {
  public store: any;
  public rulesJson: string;
  public rules: any[] = [];
  public plans: any[] = [];
  public createdOffers: any[] = [];
  public backEndData = new Map<string, any>();
  public rulesErrors = new Set<string>();
  public description: string;
  public testUrl: string;
  public canEdit: boolean;
  public canRetire: boolean;
  public isStgEqualProd: boolean;
  public rollbackName: string;
  public status: number;
  public newRuleName: string;
  public expansionPanels: boolean[] = [];
  public statesList: any[] = [];
  public currentRegion: string = '';
  public selectedTab = new FormControl(0);
  public originalsContentList: any[] = [];
  public allGoogleOffersList: any[] = [];
  public defaultOffers: any;
  public defaultOffersJSON: string;

  private destroy$ = new Subject<void>();
  private storeSubscription: Subscription;
  private dialogResponseSubscription: Subscription;
  private waitCount = 0;
  private filterState: any;

  constructor(
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public router: Router,
    private plansService: PlansService,
    private offersService: OffersService,
    private configService: ConfigurationService,
    private cancelFlowService: CancelFlowService,
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
          this.getSelectedTab();
          this.getAllStates();
          // this.getRetentionOffersForTerms();
        }
      });
  }

  getSelectedTab(): void {
    const selectedTab = JSON.parse(
      localStorage.getItem('cancelFlowTab') as string,
    );
    if (!!selectedTab) {
      this.selectedTab.setValue(selectedTab);
    }
  }

  getAllStates() {
    this.loaderService.show('Getting states data...');
    this.offersService
      .getAllStates(this.currentRegion)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (res && res.data) {
          this.statesList = res.data;
        }
        this.getAllPlans();
      });
  }

  getAllPlans() {
    this.loaderService.show('Getting plans data...');
    this.plansService
      .getAllPlans(this.store)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (allPlans) => {
          this.plans = allPlans;
          this.setRegionCode();
          this.getCreatedOffers();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  setRegionCode(): void {
    this.currentRegion = this.configService.getRegion()['title'];
  }

  getCreatedOffers() {
    this.loaderService.show('Getting created offers data...');
    this.offersService
      .getOffers(this.store.storeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (createdOffers) => {
          this.createdOffers = createdOffers;
          this.getRetentionOffersForTerms();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  getRetentionOffersForTerms() {
    this.loaderService.show('Getting retention offers for terms data...');
    this.offersService
      .getRetentionOffersForTerms(this.store.storeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res) => {
          res.forEach((val) => {
            const nonExpiredAllowedOffers = this.getNotExpiredOffers(
              val.allowedOffers,
            );
            this.offersService.retentionOffersForTerms.set(
              val.term,
              nonExpiredAllowedOffers,
            );
          });
          this.offersService.allGlRetentionOffers = new Map(
            (this.offersService.retentionOffersForTerms as any)
              .get(0)
              .map((o) => [o.offerCode, o]),
          );
          this.getDPEConfig();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  getNotExpiredOffers(offers: any): any[] {
    return !!offers && !!offers.length
      ? offers.filter((offer) => offer.couponState !== 'expired')
      : [];
  }

  getDPEConfig() {
    this.loaderService.show('Getting DPE config data...');
    this.cancelFlowService
      .getDPEConfig(this.currentRegion.toLowerCase())
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res: any) => {
          let dpeConfig = res.data.value;
          // sort dpe config storefronts data by storefront names
          dpeConfig.criteria.forEach((criterion) => {
            (criterion.storeFront as any[]).sort((a, b) =>
              a.name.localeCompare(b.name),
            );
          });
          this.filterState = dpeConfig.filterState;
          this.rules = dpeConfig.criteria.filter(
            (rule) => rule.name !== 'Default',
          );
          this.rulesJson = JSON.stringify(this.rules);
          this.canEdit = true; // res.filterState.status !== UserEligibilityStatus.STG;
          this.canRetire = dpeConfig.filterState.canRetire;
          this.isStgEqualProd = res.data.isStgEqualProd;
          this.status = dpeConfig.filterState.status;
          if (dpeConfig.filterState.status === UserEligibilityStatus.STG) {
            this.rollbackName = 'ROLLBACK STG';
            this.description = `Created by ${
              dpeConfig.filterState.updatedBy
            } at ${this.formatTs(dpeConfig.filterState.updatedAt)}`;
            this.testUrl = dpeConfig.filterState.testUrl ?? '';
          } else if (
            dpeConfig.filterState.status === UserEligibilityStatus.PROD
          ) {
            this.rollbackName = 'ROLLBACK PROD';
            this.description = `Published by ${
              dpeConfig.filterState.updatedBy
            } at ${this.formatTs(dpeConfig.filterState.updatedAt)}`;
            this.testUrl = dpeConfig.filterState.testUrl ?? '';
          } else if (
            dpeConfig.filterState.status === UserEligibilityStatus.DFT
          ) {
            this.rollbackName = 'DELETE DFT';
            this.description = `Saved by ${
              dpeConfig.filterState.updatedBy
            } at ${this.formatTs(dpeConfig.filterState.updatedAt)}`;
            this.testUrl = dpeConfig.filterState.testUrl ?? '';
          } else {
            this.rollbackName = 'ROLLBACK PROD';
            this.description = 'Based on PROD configuration';
          }
          this.rules.forEach((rule) => {
            this.expansionPanels.push(false);
          });

          if (dpeConfig.filterState.errorMessage) {
            this.openResponse({ message: dpeConfig.filterState.errorMessage });
          }
          this.getOriginalsContent();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  getOriginalsContent() {
    this.loaderService.show('Getting Dezmund originals content data...');
    this.cancelFlowService
      .getDezmundOriginalsContent()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res: any) => {
          this.originalsContentList = [...res.data.content];
          this.getTardisRecord();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  getTardisRecord() {
    this.loaderService.show('Getting Tardis record data...');
    this.cancelFlowService
      .getTardisRecord('prod', 'google', 'twlght', 'selector-config', 'us')
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res: any) => {
          this.allGoogleOffersList = res.data.supportedProducts.map((offer) => {
            return {
              ...offer,
              offerCode: offer.linkId,
              offerName: offer.id,
            };
          });
          // filter Android Sku modules that have "retention" or "cancellation" substrings in linkId
          this.allGoogleOffersList = this.allGoogleOffersList.filter(
            (offer) => {
              return (
                (offer.offerCode as string).includes('retention') ||
                (offer.offerCode as string).includes('cancellation')
              );
            },
          );
          this.getDefaultOffersConfigs();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  getDefaultOffersConfigs() {
    this.loaderService.show('Getting default filters data...');
    this.cancelFlowService
      .getDefaultStorefrontsConfigs(
        this.configService.getRegion().id.toUpperCase(),
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res: any) => {
          this.defaultOffers = res.data;
          if (!res.data.isStgEqualProd) {
            this.isStgEqualProd = res.data.isStgEqualProd;
          }
          this.defaultOffersJSON = JSON.stringify(this.defaultOffers);
          this.loaderService.hide();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  rulesDuplicatesExists() {
    let ruleCombinedStrSet = new Set();
    this.rules.forEach((rule) => {
      ruleCombinedStrSet.add(
        (rule.planLengthInMonths ?? '') +
          '/' +
          (rule.isInFreeTrial ?? '') +
          '/' +
          (`${rule.churnScore}` ?? '') +
          '/' +
          (`${rule.lastLogin}` ?? '') +
          '/' +
          (`${rule.dateRangeDirection}` ?? '') +
          '/' +
          (`${rule.signUpDateStart}` ?? '') +
          '/' +
          (`${rule.signUpDateEnd}` ?? '') +
          '/' +
          (!!rule.contentActivity && !!rule.contentActivity.length
            ? rule.contentActivity.join(',')
            : ''),
      );
    });
    return ruleCombinedStrSet.size !== this.rules.length;
  }

  isRuleDuplicate(index: number) {
    let mappedRules: any[] = this.rules.map((rule, i) => {
      return {
        name: rule.name,
        index: i,
        uniquesParamsStr:
          (rule.planLengthInMonths ?? '') +
          '/' +
          (rule.isInFreeTrial ?? '') +
          '/' +
          (`${rule.churnScore}` ?? '') +
          '/' +
          (`${rule.lastLogin}` ?? '') +
          '/' +
          (`${rule.dateRangeDirection}` ?? '') +
          '/' +
          (`${rule.signUpDateStart}` ?? '') +
          '/' +
          (`${rule.signUpDateEnd}` ?? '') +
          '/' +
          (!!rule.contentActivity && !!rule.contentActivity.length
            ? rule.contentActivity.join(',')
            : ''),
      };
    });

    const currentRule = mappedRules.find((rule, i) => i === index);

    mappedRules.splice(index, 1);
    const foundDuplicates: any[] = mappedRules.filter(
      (rule) => rule.uniquesParamsStr === currentRule.uniquesParamsStr,
    );

    return !!foundDuplicates && !!foundDuplicates.length;
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
    if (this.selectedTab.value === 0) {
      return !rule.name || rule.name.length === 0;
    } else {
      return;
    }
  }

  formatTs(isoTs: string) {
    const date = getServerDateTime(isoTs, 'date');
    const time = getServerDateTime(isoTs, 'time');
    return `${date} ${time}`;
  }

  // check if rules were modified
  isModified() {
    return (
      this.rulesJson !== JSON.stringify(this.rules) ||
      this.defaultOffersJSON !== JSON.stringify(this.defaultOffers)
    );
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
                if (this.selectedTab.value === 0) {
                  this.rules.splice(index, 1);
                  this.rulesErrors.forEach((ruleError) => {
                    if (Number(ruleError.charAt(0)) === index) {
                      this.rulesErrors.delete(ruleError);
                    }
                  });
                  this.expansionPanels.splice(index, 1);
                } else {
                  this.defaultOffers.splice(index, 1);
                  this.rulesErrors.forEach((ruleError) => {
                    if (Number(ruleError.charAt(0)) === index) {
                      this.rulesErrors.delete(ruleError);
                    }
                  });
                  this.expansionPanels.splice(index, 1);
                }
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
    const cond: any = {
      status: FiltersStatus.NEW,
      name: `Rule ${!!this.rules.length ? this.rules.length : 1}`,
      planLengthInMonths: null,
      isInFreeTrial: null,
      storeFront: [],
      selectedStorefronts: [],
      churnScore: null,
      lastLogin: null,
      dateRangeDirection: null,
      signUpDateStart: null,
      signUpDateEnd: null,
      contentActivity: [],
      searchText: null,
      exclusiveState: null,
      exclusiveOffer: null,
    };
    // this.expansionPanels.splice(this.rules.length - 1, 0, true);
    this.expansionPanels.push(true);
    // this.rules.splice(this.rules.length - 1, 0, cond);
    this.rules.push(cond);
  }

  getAllStorefronts(): any[] {
    return [
      {
        name: 'Apple',
        primaryLists: [],
        secondaryLists: [],
      },
      {
        name: 'Google',
        primaryLists: [],
        secondaryLists: [],
      },
      {
        name: 'Recurly',
        primaryLists: [],
        secondaryLists: [],
      },
    ];
  }

  ruleName(index: number, rule: RetentionOfferFilterRule): string {
    let name = rule.name as string;
    if (rule.planLengthInMonths) {
      name += `: ${rule.planLengthInMonths}mo`;
    }
    if (rule.isInFreeTrial != null) {
      name += rule.isInFreeTrial ? ' (Free Trial)' : ' (No Free Trial)';
    }
    return name;
  }

  ruleDescription(rule: RetentionOfferFilterRule): string {
    let desc = '';
    return '';
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
    if (!data.isInitial) {
      data.rule.exclusiveOfferOverrides = data.exclusiveOfferOverrides
        ? [...data.exclusiveOfferOverrides]
        : null;
      if (
        JSON.stringify(this.rules[data.index]) !== JSON.stringify(data.rule)
      ) {
        this.rules[data.index] = { ...data.rule };
      }
    }
    this.setRuleErrors(data);
  }

  setRuleErrors(data) {
    let rulesErrorsRes = new Set(this.rulesErrors);
    rulesErrorsRes.forEach((ruleError) => {
      const ruleErrorIndex = ruleError.split('-')[0];
      if (Number(ruleErrorIndex) === data.index) {
        rulesErrorsRes.delete(ruleError);
      }
    });
    data.errors.forEach((error) => {
      rulesErrorsRes.add(error);
    });
    setTimeout(() => {
      this.rulesErrors = new Set(rulesErrorsRes);
    }, 0);
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
      const env = !!publish ? 'prod' : 'stg';
      this.loaderService.show();
      let response;
      this.cancelFlowService
        .postDPEConfig(
          this.getDPEConfigPayload(publish),
          env,
          this.currentRegion.toLowerCase(),
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe((res: any) => {
          if (res && res.success) {
            this.cancelFlowService
              .postDefaultStorefrontsConfigs(
                this.getDefaultStorefrontsPayload(),
                this.currentRegion,
                env,
              )
              .pipe(takeUntil(this.destroy$))
              .subscribe((defaultRes: any) => {
                if (defaultRes) {
                  response = defaultRes;
                  this.openUpdateResponse(response);
                }
              });
          }
        });
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
    if (this.selectedTab.value === 0) {
      moveItemInArray(this.rules, event.previousIndex, event.currentIndex);
      moveItemInArray(
        this.expansionPanels,
        event.previousIndex,
        event.currentIndex,
      );
    } else {
      moveItemInArray(
        this.defaultOffers,
        event.previousIndex,
        event.currentIndex,
      );
      moveItemInArray(
        this.expansionPanels,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  hasRuleErrors(rule: RetentionOfferFilterRule, index: number) {
    return (
      // this.isRuleDuplicate(index) ||
      this.isEmptyRule(rule) || this.hasInnerRuleErrors(rule, index)
    );
  }

  hasInnerRuleErrors(rule: RetentionOfferFilterRule, index: number) {
    let hasInnerErrors = false;
    this.rulesErrors.forEach((ruleError) => {
      const ruleErrorIndex = ruleError.split('-')[0];
      if (Number(ruleErrorIndex) === index) {
        hasInnerErrors = true;
      }
    });
    return hasInnerErrors;
  }

  someRuleHasErrors() {
    return !!this.rulesErrors && this.rulesErrors.size > 0;
  }

  synchronizeRulesAction(): void {
    const type = 'SYNCHRONIZE';
    const action = {};
    action['message'] = `Do you wish to ${type} all criteria?`;
    action['action'] = 'prompt';
    action['warningMessage'] =
      'Current state of criteria will be replaced by PROD configuration!';
    this.openActionDialog(action, type);
  }

  async synchronizeRules(): Promise<void> {
    try {
      this.loaderService.show();
      this.cancelFlowService
        .rollbackDPEConfigToProd(this.currentRegion.toLowerCase())
        .pipe(takeUntil(this.destroy$))
        .subscribe((res: any) => {
          if (res && res.success) {
            this.cancelFlowService
              .rollbackDefaultStorefrontsToProd(this.currentRegion)
              .pipe(takeUntil(this.destroy$))
              .subscribe((defaultRes: any) => {
                if (defaultRes) {
                  this.openUpdateResponse(defaultRes);
                }
              });
          }
        });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  changeTab(event): void {
    this.selectedTab.setValue(event);
    localStorage.setItem('cancelFlowTab', JSON.stringify(event));
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

  getDenverDateDayStart(date: any): string {
    if (!date._isAMomentObject) {
      return date;
    }
    const dateString = date.toISOString();
    const utcDateTime = DateTime.fromISO(dateString).setZone('UTC');
    const denverDateTime = utcDateTime
      .setZone('America/Denver')
      .set({ hour: 18 });
    const denverISO = denverDateTime.toISO();
    return denverISO;
  }

  getDPEConfigPayload(isProdPublish: boolean) {
    let criteria = [...this.rules];
    criteria.forEach((criterion: any, i) => {
      criterion.lastLogin = !!criterion.lastLogin
        ? this.getDenverDateDayStart(criterion.lastLogin)
        : null;
      criterion.signUpDateStart = !!criterion.signUpDateStart
        ? this.getDenverDateDayStart(criterion.signUpDateStart)
        : null;
      criterion.signUpDateEnd = !!criterion.signUpDateEnd
        ? this.getDenverDateDayStart(criterion.signUpDateEnd)
        : null;
      criterion.filterPriority = i + 1;
      delete criterion.searchText;
      delete criterion.selectedStorefronts;
    });
    return {
      filterState: {
        canDelete: false,
        canRetire: true,
        errorMessage: null,
        prodVer: isProdPublish
          ? this.filterState.stgVer
          : this.filterState.prodVer,
        stgVer: isProdPublish
          ? this.filterState.stgVer
          : this.filterState.stgVer + 1,
        status: 2,
        testUrl: this.filterState.testUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: localStorage.getItem('username'),
      },
      criteria,
    };
  }

  getDefaultStorefrontsPayload() {
    const appleObj = this.defaultOffers.storeFront.find(
      (elem) => elem.name === 'Apple',
    );
    const applePayload = this.getDefaultStorefrontPayload(appleObj);
    const googleObj = this.defaultOffers.storeFront.find(
      (elem) => elem.name === 'Google',
    );
    const googlePayload = this.getDefaultStorefrontPayload(googleObj);
    const recurlyObj = this.defaultOffers.storeFront.find(
      (elem) => elem.name === 'Recurly',
    );
    const recurlyPayload = this.getDefaultStorefrontPayload(recurlyObj);
    return { applePayload, googlePayload, recurlyPayload };
  }

  getDefaultStorefrontPayload(storefrontObj: any) {
    return {
      enabled: storefrontObj.isEnabled,
      primaryOffers: storefrontObj.primaryLists,
      secondaryOffers: storefrontObj.secondaryLists,
    };
  }

  ngOnDestroy(): void {
    this.storeSubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
