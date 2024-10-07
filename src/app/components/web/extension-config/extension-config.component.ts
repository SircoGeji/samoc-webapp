import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfigurationService } from '../../../service/configuration.service';
import { LoaderService } from '../../../service/loader.service';
import { OffersService } from '../../../service/offers.service';
import { PlansService } from '../../../service/plans.service';
import { BaseComponent } from '../../../components/base/base.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { OfferType, PlatformEnum, StatusEnum } from '../../../types/enum';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-extension-config',
  templateUrl: './extension-config.component.html',
  styleUrls: ['./extension-config.component.scss'],
})
export class ExtensionConfigComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  dialogResponseSubscription: Subscription;
  public store: any;
  public storeSubscription: Subscription;
  public offerCodesList: string[] = [];
  public connectionsList: any[] = [];
  public originalRulesList: any[] = [];
  public hasUnpublishedChanges = false;
  public formGroup: FormGroup = this.fb.group({
    rulesFormArray: this.fb.array([]),
  });
  public ruleErrorMessage: string;

  private importedOffers: any[] = [];
  private destroy$ = new Subject<void>();
  private allPlans: any[] = [];
  private nonExtStgUniversalOffers: any[] = [];
  private extStgUniversalOffers: any[] = [];
  private nonExtStgUniversalOfferTypes: any[] = [];
  private extStgUniversalOfferTypes: any[] = [];
  private nonExtProdUniversalOffers: any[] = [];
  private extProdUniversalOffers: any[] = [];
  private nonExtProdUniversalOfferTypes: any[] = [];
  private extProdUniversalOfferTypes: any[] = [];
  private currentRegion;
  private isStgConfigShown = false;

  constructor(
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public router: Router,
    private plansService: PlansService,
    private offersService: OffersService,
    private configService: ConfigurationService,
    private fb: FormBuilder,
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
          this.currentRegion = this.configService.getRegion()['title'];
          this.setAllExtensionOffers();
        }
      });
  }

  setAllExtensionOffers() {
    this.loaderService.show('Getting all extension offers...');
    this.offersService
      .getOffers(this.store.storeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (createdOffers) => {
          this.importedOffers = createdOffers.filter(
            (offer) =>
              offer.offerTypeId === OfferType.EXTENSION &&
              offer.statusId === StatusEnum.PROD,
          );
          if (!!this.importedOffers.length) {
            this.importedOffers.forEach((offer) => {
              this.offerCodesList.push(offer.offerCode);
              if (!!offer.upgradeOfferCode) {
                this.offerCodesList.push(offer.upgradeOfferCode);
              }
            });
          }
          this.getExtensionOfferRules();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  getExtensionOfferRules() {
    this.loaderService.show('Getting extension offers GL config...');
    this.offersService
      .getExtensionOfferRules(this.store.storeCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res: any) => {
          if (!!res.stgConfig && !!res.prodConfig) {
            const stgCountry = res.stgConfig.countries.find(
              (country) => country.countryCode === this.currentRegion,
            );
            const prodCountry = res.prodConfig.countries.find(
              (country) => country.countryCode === this.currentRegion,
            );

            if (!!stgCountry && !!prodCountry) {
              this.nonExtStgUniversalOffers = stgCountry.universalOffers.filter(
                (offer) => !offer.storeOfferId.startsWith('ext_'),
              );
              this.extStgUniversalOffers = stgCountry.universalOffers.filter(
                (offer) => offer.storeOfferId.startsWith('ext_'),
              );

              const nonExtStgOfferTypeNameSet = new Set<string>(
                this.nonExtStgUniversalOffers.map(
                  (offer) => offer.offerTypeName,
                ),
              );
              stgCountry.universalOfferTypes.forEach((offerType) => {
                if (!nonExtStgOfferTypeNameSet.has(offerType.offerTypeName)) {
                  this.extStgUniversalOfferTypes.push(offerType);
                } else {
                  this.nonExtStgUniversalOfferTypes.push(offerType);
                }
              });

              this.nonExtProdUniversalOffers = prodCountry.universalOffers.filter(
                (offer) => !offer.storeOfferId.startsWith('ext_'),
              );
              this.extProdUniversalOffers = prodCountry.universalOffers.filter(
                (offer) => offer.storeOfferId.startsWith('ext_'),
              );

              const nonExtProdOfferTypeNameSet = new Set<string>(
                this.nonExtProdUniversalOffers.map(
                  (offer) => offer.offerTypeName,
                ),
              );
              prodCountry.universalOfferTypes.forEach((offerType) => {
                if (!nonExtProdOfferTypeNameSet.has(offerType.offerTypeName)) {
                  this.extProdUniversalOfferTypes.push(offerType);
                } else {
                  this.nonExtProdUniversalOfferTypes.push(offerType);
                }
              });

              let offerCodesListSet = new Set<string>(this.offerCodesList);
              if (
                JSON.stringify(this.extStgUniversalOfferTypes) !==
                JSON.stringify(this.extProdUniversalOfferTypes)
              ) {
                this.extStgUniversalOffers.forEach((offer) => {
                  offerCodesListSet.add(offer.storeOfferId);
                });
                this.connectionsList = [...this.extStgUniversalOffers];
                this.setFormGroup(
                  this.extStgUniversalOfferTypes,
                  this.extStgUniversalOffers,
                );
                this.isStgConfigShown = true;
              } else {
                this.extProdUniversalOffers.forEach((offer) => {
                  offerCodesListSet.add(offer.storeOfferId);
                });
                this.connectionsList = [...this.extProdUniversalOffers];
                this.setFormGroup(
                  this.extProdUniversalOfferTypes,
                  this.extProdUniversalOffers,
                );
              }
              this.offerCodesList = Array.from(offerCodesListSet).sort();
            }
          }

          this.getAllPlans();
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  setFormGroup(rules: any[], connections: any[]) {
    rules.forEach((rule, i) => {
      const foundOfferConnection = connections.find(
        (connection) => connection.offerTypeName === rule.offerTypeName,
      );
      const foundOffer = this.importedOffers.find((offer) => {
        return (
          offer.offerCode === foundOfferConnection?.storeOfferId ||
          offer.upgradeOfferCode === foundOfferConnection?.storeOfferId
        );
      });
      let foundPlan: any = null;
      if (!!foundOffer) {
        foundPlan = this.allPlans.find(
          (plan) => plan.planCode === foundOffer.eligibleCharges[0],
        );
      }

      this.getRulesFormArray().push(
        this.fb.group({
          offerCode: [
            foundOfferConnection?.storeOfferId || '',
            Validators.required,
          ],
          planLengthsInMonthsAllowed: [
            rule.userEligibility.planLengthsInMonthsAllowed[0] ||
              foundPlan?.billingCycleDuration,
            [Validators.required],
          ],
          priceForCurrentPeriod: [
            rule.userEligibility.priceForCurrentPeriod,
            Validators.required,
          ],
        }),
      );
      if (!foundOfferConnection?.storeOfferId.includes('_upgrade')) {
        this.getPlanLengthFormControl(i).disable();
      }
      this.originalRulesList.push({
        offerCode: foundOfferConnection?.storeOfferId || '',
        planLengthsInMonthsAllowed: rule.userEligibility.planLengthsInMonthsAllowed[0] ||
        foundPlan?.billingCycleDuration,
        priceForCurrentPeriod: rule.userEligibility.priceForCurrentPeriod
      });
    });
  }

  getAllPlans() {
    this.loaderService.show('Getting plans...');
    this.plansService
      .getAllPlans(this.store)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.allPlans = res;
        this.loaderService.hide();
      });
  }

  turnOnUnpublishedChanges(): void {
    const rulesList = this.formGroup.getRawValue().rulesFormArray;
    if (!this.areRuleListsEqual(this.originalRulesList, rulesList)) {
      this.hasUnpublishedChanges = true;
    } else {
      this.hasUnpublishedChanges = false;
    }
  }

  areRuleListsEqual(oldRules: any[], newRules: any[]) {
    if (oldRules.length !== newRules.length) { 
      return false;
    }
    let isEqual = true;
    newRules.forEach((newRule, i) => {
      if (!this.areRulesEqual(oldRules[i], newRule)) {
        isEqual = false;
      }
    });
    return isEqual;
  }

  areRulesEqual(oldRule: any, newRule: any) {
    if(oldRule.offerCode !== newRule.offerCode || oldRule.planLengthsInMonthsAllowed !== newRule.planLengthsInMonthsAllowed
      || oldRule.priceForCurrentPeriod !== newRule.priceForCurrentPeriod) {
      return false;
    }
    return true;
  }

  addNewElement(column: number) {
    this.turnOnUnpublishedChanges();
    switch (column) {
      case 0:
        this.connectionsList.push({
          offerTypeName: null,
          storeOfferId: null,
        });
        break;
      case 1:
        this.getRulesFormArray().push(
          this.fb.group({
            offerCode: [null, Validators.required],
            planLengthsInMonthsAllowed: [null, [Validators.required]],
            priceForCurrentPeriod: [null, Validators.required],
          }),
        );
        break;
    }
  }

  deleteRule(column: number, position: number) {
    let type;
    if (column === 1) {
      type = 'rule';
    } else {
      type = 'connection';
    }
    const action = {};
    action['message'] = `Please confirm removal of ${type}.`;
    action['action'] = 'prompt';
    this.openActionDialog(action, column, position);
  }

  openActionDialog(action, column, position) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            switch (column) {
              case 0:
                this.connectionsList.splice(position, 1);
                break;
              case 1:
                this.getRulesFormArray().removeAt(position);
                break;
            }
            this.turnOnUnpublishedChanges();
          }
        });
    }
  }

  getOfferCodeList(): string[] {
    return !!this.connectionsList.length
      ? this.connectionsList.map((connection) => connection.storeOfferId)
      : [];
  }

  getPayload(env: string): any {
    const rulesList: any[] = [...this.formGroup.getRawValue().rulesFormArray];
    let universalOfferTypes = rulesList.map((rule) => {
      const foundConnection = this.connectionsList.find((connection) => {
        return connection.storeOfferId === rule.offerCode;
      });
      let offerTypeName;
      if (!!foundConnection) {
        offerTypeName = foundConnection.offerTypeName;
      } else {
        offerTypeName = this.getRuleOfferTypeName(rule);
        this.connectionsList.push({
          offerTypeName,
          storeOfferId: rule.offerCode,
        });
      }
      return {
        offerTypeName,
        userEligibility: {
          planLengthsInMonthsAllowed: [rule.planLengthsInMonthsAllowed],
          priceForCurrentPeriod: rule.priceForCurrentPeriod,
        },
      };
    });

    // add non extension rules to final payload
    if (env === 'prod') {
      universalOfferTypes = [
        ...universalOfferTypes,
        ...this.nonExtProdUniversalOfferTypes,
      ];
    } else {
      universalOfferTypes = [
        ...universalOfferTypes,
        ...this.nonExtStgUniversalOfferTypes,
      ];
    }

    // add non extension connections to final payload
    let universalOffers = [...this.connectionsList];
    if (env === 'prod') {
      universalOffers = [...universalOffers, ...this.nonExtProdUniversalOffers];
    } else {
      universalOffers = [...universalOffers, ...this.nonExtStgUniversalOffers];
    }

    return {
      universalOffers,
      universalOfferTypes,
    };
  }

  getRuleOfferTypeName(rule): string {
    let offerTypeName: string = rule.offerCode;
    offerTypeName = offerTypeName.replace('samocqa_', '');
    return offerTypeName;
  }

  async updateList(env: string) {
    try {
      this.loaderService.show();
      const response = await this.offersService
        .updateExtensionOfferRules(
          this.getPayload(env),
          this.store.storeCode,
          env,
          localStorage.getItem('email') as string,
        )
        .toPromise();
      this.openUpdateResponse(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  isUpdateButtonDisabled(): boolean {
    return (
      !this.hasUnpublishedChanges ||
      this.formGroup.invalid ||
      !this.isRuleListValid()
    );
  }

  isPublishButtonDisabled(): boolean {
    return (
      !!this.hasUnpublishedChanges ||
      this.formGroup.invalid ||
      !this.isRuleListValid() ||
      !this.isStgConfigShown
    );
  }

  duplicateRuleExists() {
    let ruleSet = new Set();
    this.formGroup.getRawValue().rulesFormArray.forEach((rule) => {
      ruleSet.add(
        rule.offerTypeName +
          '/' +
          rule.planLengthsInMonthsAllowed +
          '/' +
          rule.priceForCurrentPeriod,
      );
    });
    return ruleSet.size !== this.formGroup.value.rulesFormArray.length;
  }

  isRuleListValid() {
    this.ruleErrorMessage = '';
    let ruleSet = new Set();
    const rulesList = this.formGroup.getRawValue().rulesFormArray;
    rulesList.forEach((rule) => {
      if (this.isRuleFieldsEmpty(rule)) {
        this.ruleErrorMessage = 'One or more rules have invalid values.';
      } else if (!this.isPlanLengthValid(rule)) {
        this.ruleErrorMessage = 'One or more rules has invalid plan length.';
      } else if (!this.isPriceValid(rule.priceForCurrentPeriod)) {
        this.ruleErrorMessage = 'One or more rules has invalid price.';
      }
      ruleSet.add(
        rule.offerCode +
          '/' +
          rule.planLengthsInMonthsAllowed +
          '/' +
          rule.priceForCurrentPeriod,
      );
    });
    if (ruleSet.size !== rulesList.length) {
      this.ruleErrorMessage = 'One or more rules are duplicates.';
    }
    return this.ruleErrorMessage === '';
  }

  getRuleErrorMessage() {
    return this.ruleErrorMessage;
  }

  isRuleFieldsEmpty(rule: any) {
    if (
      rule.planLengthsInMonthsAllowed === null ||
      rule.priceForCurrentPeriod === null ||
      rule.offerTypeName === null
    ) {
      return true;
    }
    return false;
  }

  isRuleValid(index: number) {
    let valid = true;
    let duplicateCount = 0;
    const ruleValue = this.formGroup.getRawValue().rulesFormArray[index];
    if (this.isRuleFieldsEmpty(ruleValue)) {
      return false;
    } else if (!this.isPlanLengthValid(ruleValue)) {
      return false;
    } else if (!this.isPriceValid(ruleValue.priceForCurrentPeriod)) {
      return false;
    }
    const rulesList = this.formGroup.getRawValue().rulesFormArray;
    rulesList.forEach((existingRule) => {
      if (
        ruleValue.planLengthsInMonthsAllowed ===
          existingRule.planLengthsInMonthsAllowed &&
        ruleValue.priceForCurrentPeriod ===
          existingRule.priceForCurrentPeriod &&
        ruleValue.offerCode === existingRule.offerCode
      ) {
        duplicateCount++;
      }
    });
    if (duplicateCount > 1) {
      valid = false;
    }
    return valid;
  }

  isPlanLengthValid(value: any) {
    if (!this.containsOnlyNumbers(value.planLengthsInMonthsAllowed)) {
      return false;
    }
    let offer = this.getOfferFromOfferCode(value.offerCode);
    if (!!offer && !!offer.upgradeOfferCode && offer.upgradeOfferCode === value.offerCode) {
      let plan = this.getPlanFromOffer(offer);
      if (!!plan && value.planLengthsInMonthsAllowed >= plan.billingCycleDuration){
        return false;
      }
    }
    return true;
  }

  isConnectionDuplicate(connection: any) {
    let duplicateCount = 0;
    this.connectionsList.forEach((existingConnection) => {
      if (
        connection.offerTypeName === existingConnection.offerTypeName &&
        connection.storeOfferId === existingConnection.storeOfferId
      ) {
        duplicateCount++;
      }
    });
    return duplicateCount > 1;
  }

  duplicateConnectionExists() {
    let connectionSet = new Set();
    this.connectionsList.forEach((connection) => {
      connectionSet.add(
        connection.offerTypeName + '/' + connection.storeOfferId,
      );
    });
    return connectionSet.size !== this.connectionsList.length;
  }

  isPlanValid() {
    let valid = true;
    this.formGroup.getRawValue().rulesFormArray.forEach((rule) => {
      if (!this.containsOnlyNumbers(rule.planLengthsInMonthsAllowed)) {
        valid = false;
      }
      if (!this.isPriceValid(rule.priceForCurrentPeriod)) {
        valid = false;
      }
    });
    return valid;
  }

  isPriceValid(value: any) {
    return /^\d+\.?,?\d{0,2}$/.test(value);
  }

  containsOnlyNumbers(value: any) {
    return /^[1-9]+\d*$/.test(value);
  }

  keyPressNumbersWithDecimal(event: KeyboardEvent) {
    if (/^[0-9]+$/.test(event.key)) {
      return true;
    }
    event.preventDefault();
    return false;
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

  drop(event: CdkDragDrop<string[]>) {
    let rulesArr: any[] = this.formGroup.getRawValue().rulesFormArray;
    moveItemInArray(rulesArr, event.previousIndex, event.currentIndex);
    this.getRulesFormArray().patchValue(rulesArr);
    rulesArr.forEach((rule, i) => {
      if (!rule.offerCode.includes('_upgrade')) {
        this.getPlanLengthFormControl(i).disable();
      } else {
        this.getPlanLengthFormControl(i).enable();
      }
    });
    this.turnOnUnpublishedChanges();
  }

  getOfferCodeOption(offerCode: string): string {
    const foundOffer = this.importedOffers.find((offer) => {
      return (
        offer.offerCode === offerCode || offer.upgradeOfferCode === offerCode
      );
    });
    return !!foundOffer
      ? `${foundOffer.offerName} (${offerCode})`
      : `- (${offerCode})`;
  }

  isPlanLengthFieldDisabled(offerCode: string): boolean {
    return !offerCode || !offerCode.includes('_upgrade');
  }

  getBiggerDurationAmount(value: number): number {
    switch (value) {
      case 1:
        return 3;
      case 3:
        return 6;
      case 6:
        return 12;
      default:
        return 12;
    }
  }

  getPlanLengthFormControl(index: number): FormControl {
    return (this.getRulesFormArray().get(`${index}`) as FormGroup).get(
      'planLengthsInMonthsAllowed',
    ) as FormControl;
  }

  setPlanLengthValue(index: number, planLength: number): void {
    this.getPlanLengthFormControl(index).patchValue(planLength);
  }

  updateOfferCodeDependentFields(event, index: number): void {
    const foundPlan = this.getPlanFromOfferCode(event.value);
    if (!!foundPlan) {
      this.setPlanLengthValue(index, foundPlan.billingCycleDuration);
    }
    if (event.value.includes('_upgrade')) {
      this.getPlanLengthFormControl(index).enable();
    } else {
      this.getPlanLengthFormControl(index).disable();
    }
    this.turnOnUnpublishedChanges();
  }

  getPlanFromOfferCode(offerCode: string) {
    const foundOffer = this.getOfferFromOfferCode(offerCode);
    if (!!foundOffer) {
      return this.getPlanFromOffer(foundOffer);
    }
  }

  getOfferFromOfferCode(offerCode: string) {
    return this.importedOffers.find((offer) => {
      return (
        offer.offerCode === offerCode || offer.upgradeOfferCode === offerCode
      );
    });
  }

  getPlanFromOffer(offer: any) {
    return this.allPlans.find(
      (plan) => plan.planCode === offer.eligibleCharges[0],
    );
  }

  getRulesFormArray(): FormArray {
    return this.formGroup.get('rulesFormArray') as FormArray;
  }

  ngOnDestroy(): void {
    this.storeSubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
