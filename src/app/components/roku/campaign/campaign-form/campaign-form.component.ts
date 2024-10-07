import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { BaseComponent } from '../../../base/base.component';
import { LoaderService } from '../../../../service/loader.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { RokuService } from '../../../../service/roku.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Observable, Subject } from 'rxjs';
import { identityCheckValidator } from '../../../../validators/identity-check-validator';
import { filter, takeUntil } from 'rxjs/operators';
import { PROCEED_MESSAGE } from '../../../../constants';
import * as moment from 'moment';
import { RokuFormsUtils } from '../../../../utils/roku-forms.utils';
import { ModuleStatus } from '../../../../types/rokuEnum';
import { RokuManagementUtils } from '../../../../utils/rokuManagement.utils';
import { SnackbarService } from '../../../../service/snackbar.service';

@Component({
  selector: 'app-campaign-form',
  templateUrl: './campaign-form.component.html',
  styleUrls: ['./campaign-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RokuCampaignFormComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public formGroup: FormGroup;
  public pageQuery: string;
  public importedModuleData: any = {
    status: 'null',
  };
  public campaignsModules: any;
  public campaignsHistoryModules: any;
  public skusArray;
  public appCopiesArray;
  public imageCollectionsArray;
  public selectorConfigsArray;
  public storeCopiesArray;
  public defaultAppCopy;
  public defaultSelectorConfig;
  public defaultStoreCopy;
  public defaultImageCollection;
  public isHistory: boolean;
  public imageCollectionSelectIsOpened = false;
  public imgCollectionName = '';
  public isFormVisible: boolean = false;

  private destroy$ = new Subject<void>();
  private moduleID: number;
  private currentProduct;
  private currentStore;
  private editOrCreateModeIsOn = false;
  private campaignObject: any = {};
  private selectsDraftObject = {
    appCopyId: null,
    imageCollectionIndexes: null,
    storeCopyId: null,
    selectorConfigId: null,
    skuId: null,
  };
  private appCopyDuplicateId: number;
  private duplicatedAppCopyIsUsed = false;
  private subject = new Subject<boolean>();
  private ignoreDialog = false;

  constructor(
    public loaderService: LoaderService,
    public router: Router,
    public dialog: MatDialog,
    private rokuService: RokuService,
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private rokuFormsUtils: RokuFormsUtils,
    private rokuManagementUtils: RokuManagementUtils,
    private snackbarService: SnackbarService,
  ) {
    super(dialog, loaderService, router);
    this.formGroup = this.formBuilder.group({});
  }

  ngOnInit(): void {
    this.loaderService.show();

    this.currentStore = this.rokuService.getStore();
    this.currentProduct = this.rokuService.getProduct();

    this.pageQuery =
      this.activatedRoute.snapshot.paramMap['params']['action'] ?? 'create';
    this.campaignObject['action'] = this.pageQuery;

    this.moduleID =
      Number(this.activatedRoute.snapshot.paramMap['params']['id']) ?? null;
    if (this.moduleID) {
      this.campaignObject['moduleID'] = this.moduleID;
    }

    this.activatedRoute.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.isHistory = !!params['isHistory'];
        this.campaignObject['isHistory'] = this.isHistory;

        forkJoin([
          this.rokuService.getAllCampaigns(),
          this.rokuService.getAllCampaignHistory(),
          this.rokuService.getAllAppCopies(),
          this.rokuService.getAllSkus(),
          this.rokuService.getAllStoreCopies(),
          this.rokuService.getAllSelectorConfigs(),
          this.rokuService.getAllImageCollections(),
        ])
          .pipe(takeUntil(this.destroy$))
          .subscribe((resultArray) => {
            const [
              campaignsRes,
              campaignHistoryRes,
              appCopiesRes,
              skusRes,
              storeCopiesRes,
              selectorConfigsRes,
              imageCollectionsRes,
            ] = resultArray;

            if (!!campaignsRes.data && !!campaignsRes.data.length) {
              this.campaignsModules = campaignsRes.data.filter((el) => {
                return (
                  el.productId === this.currentProduct.productId &&
                  el.storeId === this.currentStore.storeId
                );
              });
            }
            if (!!campaignHistoryRes.data && !!campaignHistoryRes.data.length) {
              this.campaignsHistoryModules = campaignHistoryRes.data.filter(
                (el) => {
                  return (
                    el.productId === this.currentProduct.productId &&
                    el.storeId === this.currentStore.storeId
                  );
                },
              );
            }

            this.formGroup = this.formBuilder.group({
              name: [
                null,
                [
                  Validators.required,
                  identityCheckValidator(this.campaignsModules, 'name'),
                ],
              ],
              startDate: [null, Validators.required],
              endDate: [null, Validators.required],
              appCopyId: [null, Validators.required],
              selectorConfigId: [],
              imageCollectionIndexes: [''],
              winbackSkuId: [],
              storeCopyId: [],
            });

            this.skusArray = skusRes.data.filter((sku) => {
              return (
                sku.storeId === this.currentStore.storeId &&
                sku.productId === this.currentProduct.productId &&
                sku.status !== 'archived'
              );
            });

            this.getModules('app-copy', appCopiesRes);
            this.getDefaultModule(this.appCopiesArray, 'app-copy');

            this.getModules('store-copy', storeCopiesRes);
            this.getDefaultModule(this.storeCopiesArray, 'store-copy');

            this.getModules('selector-config', selectorConfigsRes);
            this.getDefaultModule(this.selectorConfigsArray, 'selector-config');

            this.getModules('image-collection', imageCollectionsRes);
            this.getDefaultModule(
              this.imageCollectionsArray,
              'image-collection',
            );

            if (!JSON.parse(localStorage.getItem('campaign') as string)) {
              localStorage.setItem(
                'campaign',
                JSON.stringify(this.campaignObject),
              );

              if (this.pageQuery !== 'create') {
                const foundModule = this.isHistory
                  ? this.campaignsHistoryModules.find(
                      (module) => module.campaignHistoryId === this.moduleID,
                    )
                  : this.campaignsModules.find(
                      (module) => module.campaignId === this.moduleID,
                    );
                this.importedModuleData = foundModule;

                this.formGroup.controls.name.setValidators([
                  identityCheckValidator(
                    this.isHistory
                      ? this.campaignsHistoryModules
                      : this.campaignsModules,
                    'name',
                    this.importedModuleData.name,
                    this.pageQuery,
                  ),
                ]);
                this.fillModule();
              }
            } else {
              this.campaignObject = JSON.parse(
                localStorage.getItem('campaign') as string,
              );
              this.pageQuery = this.campaignObject['action'];
              this.moduleID = Number(this.campaignObject['moduleID']);
              this.isHistory = this.campaignObject['isHistory'];
              this.imgCollectionName =
                this.campaignObject.imgCollectionName ?? '';

              if (this.campaignObject.isDirty) {
                this.formGroup.markAsDirty();
              }

              if (this.campaignObject['name']) {
                this.formGroup.controls.name.setValidators([
                  identityCheckValidator(
                    this.isHistory
                      ? this.campaignsHistoryModules
                      : this.campaignsModules,
                    'name',
                    this.importedModuleData.name,
                    this.pageQuery,
                  ),
                ]);
              }

              if (this.pageQuery !== 'create') {
                const foundModule = this.isHistory
                  ? this.campaignsHistoryModules.find(
                      (module) => module.campaignHistoryId === this.moduleID,
                    )
                  : this.campaignsModules.find(
                      (module) => module.campaignId === this.moduleID,
                    );
                this.importedModuleData = foundModule;
                this.addEndedImageCollectionModules();
                this.addEndedModules();
                this.formGroup.patchValue(this.campaignObject);
              } else {
                this.formGroup.patchValue(this.campaignObject);
              }
            }
            if (this.isFormDisabled()) {
              this.formGroup.disable();
            }
            this.loaderService.hide();
            this.isFormVisible = true;
          });
      });
  }

  getModules(moduleType: string, modules): void {
    const modulesArray = modules.data.filter((module) => {
      return (
        module.storeId === this.currentStore.storeId &&
        module.productId === this.currentProduct.productId &&
        module.status !== ModuleStatus.ENDED
      );
    });

    switch (moduleType) {
      case 'app-copy':
        this.appCopiesArray = modulesArray;
        break;
      case 'selector-config':
        this.selectorConfigsArray = modulesArray;
        break;
      case 'store-copy':
        this.storeCopiesArray = modulesArray;
        break;
      case 'image-collection':
        this.imageCollectionsArray = modulesArray;
    }
  }

  getDefaultModule(modulesArray, moduleType: string): void {
    const defaultModule = modulesArray.find(
      (module) => module.isDefault === true,
    );

    switch (moduleType) {
      case 'app-copy':
        this.defaultAppCopy = defaultModule;
        break;
      case 'selector-config':
        this.defaultSelectorConfig = defaultModule;
        break;
      case 'store-copy':
        this.defaultStoreCopy = defaultModule;
        break;
      case 'image-collection':
        this.defaultImageCollection = defaultModule;
    }
  }

  fillModule(): void {
    if (this.pageQuery === 'view') {
      this.formGroup.controls.name.setValue(this.importedModuleData['name']);
    } else {
      this.formGroup.controls.name.setValue(
        this.importedModuleData['name'] + ' Copy',
      );
    }

    if (!(this.isHistory && this.pageQuery === 'duplicate')) {
      this.formGroup.controls.startDate.setValue(
        this.importedModuleData['startDate'],
      );
      this.formGroup.controls.endDate.setValue(
        this.importedModuleData['endDate'],
      );
    }

    if (this.importedModuleData['appCopy']) {
      if (this.pageQuery !== 'duplicate') {
        this.fillField('appCopy', 'appCopyId', this.appCopiesArray);
      } else {
        this.rokuService
          .duplicateAppCopy(this.importedModuleData['appCopy'].appCopyId)
          .subscribe((appCopyRes) => {
            this.appCopiesArray.push(appCopyRes.data);
            this.formGroup.controls.appCopyId.setValue(
              appCopyRes.data.appCopyId,
            );
            this.appCopyDuplicateId = appCopyRes.data.appCopyId;
          });
      }
    }

    this.fillField('storeCopy', 'storeCopyId', this.storeCopiesArray);
    this.fillField(
      'selectorConfig',
      'selectorConfigId',
      this.selectorConfigsArray,
    );
    this.fillImageCollection();

    this.formGroup.controls.winbackSkuId.setValue(
      this.importedModuleData['sku']?.skuId,
    );
  }

  fillField(moduleType: string, idType: string, modulesArray): void {
    if (this.importedModuleData[moduleType]?.status === ModuleStatus.ENDED) {
      if (this.pageQuery === 'view' && this.isHistory) {
        modulesArray.push(this.importedModuleData[moduleType]);
        this.formGroup.controls[idType].setValue(
          this.importedModuleData[moduleType]?.[idType],
        );
      }
    } else {
      this.formGroup.controls[idType].setValue(
        this.importedModuleData[moduleType]?.[idType],
      );
    }
  }

  fillImageCollection(): void {
    this.importedModuleData.imageCollection.forEach((imgCollection) => {
      if (imgCollection.status !== ModuleStatus.ENDED) {
        this.fillImageCollectionVariables(imgCollection);
      } else {
        if (this.pageQuery === 'view' && this.isHistory) {
          this.imageCollectionsArray.push(imgCollection);
          this.fillImageCollectionVariables(imgCollection);
        }
      }
    });
    this.campaignObject.imageCollectionIndexes = this.formGroup.value.imageCollectionIndexes;
    this.campaignObject.imgCollectionName = this.imgCollectionName;
    localStorage.setItem('campaign', JSON.stringify(this.campaignObject));
  }

  fillImageCollectionVariables(imgCollection): void {
    if (!this.imgCollectionName) {
      this.imgCollectionName = imgCollection.name;
      this.formGroup.controls.imageCollectionIndexes.setValue(
        imgCollection.imageCollectionId.toString(),
      );
    } else {
      this.imgCollectionName =
        this.imgCollectionName + ', ' + imgCollection.name;
      this.formGroup.controls.imageCollectionIndexes.setValue(
        this.formGroup.value.imageCollectionIndexes +
          ',' +
          imgCollection.imageCollectionId,
      );
    }
  }

  addEndedImageCollectionModules(): void {
    if (
      !!this.importedModuleData.imageCollection &&
      !!this.importedModuleData.imageCollection.length
    ) {
      this.importedModuleData.imageCollection.forEach((imgCollection) => {
        if (this.pageQuery === 'view' && this.isHistory) {
          this.imageCollectionsArray.push(imgCollection);
        }
      });
    }
  }

  addEndedModules(): void {
    this.addEndedModuleToModulesArray(
      'appCopy',
      'appCopyId',
      this.appCopiesArray,
    );
    this.addEndedModuleToModulesArray(
      'storeCopy',
      'storeCopyId',
      this.storeCopiesArray,
    );
    this.addEndedModuleToModulesArray(
      'selectorConfig',
      'selectorConfigId',
      this.selectorConfigsArray,
    );
  }

  addEndedModuleToModulesArray(
    moduleType: string,
    idType: string,
    modulesArray,
  ): void {
    if (this.importedModuleData[moduleType]?.status === ModuleStatus.ENDED) {
      if (this.pageQuery === 'view' && this.isHistory) {
        modulesArray.push(this.importedModuleData[moduleType]);
      }
    }
  }

  getCampaignNameErrorMessage(): string | undefined {
    if (this.formGroup.controls.name.hasError('required')) {
      return 'Please enter Campaign Name';
    } else if (this.formGroup.controls.name.hasError('fieldValueIsNotUnique')) {
      return 'This Campaign Name already exists';
    }
  }

  getStartDateErrorMessage(): string | undefined {
    if (this.formGroup.controls.startDate.hasError('required')) {
      return 'Please enter valid date';
    }
  }

  getEndDateErrorMessage(): string | undefined {
    const startDate = moment(this.formGroup.value.startDate).endOf('day');
    const endDate = moment(this.formGroup.value.endDate).endOf('day');

    if (this.formGroup.controls.endDate.hasError('required')) {
      return 'Please enter valid date';
    } else if (startDate.isAfter(endDate) || startDate.isSame(endDate)) {
      this.formGroup.controls.endDate.setErrors({ notValid: true });
      return 'Please select a date at least one day later than Start Date';
    }
  }

  isSaveButtonDisabled(): boolean {
    if (
      this.importedModuleData.status === ModuleStatus.LIVE &&
      this.areDraftSelects() &&
      this.pageQuery === 'view'
    ) {
      return true;
    }

    if (this.pageQuery === 'view') {
      return (
        this.formGroup.invalid ||
        this.formGroup.pristine ||
        this.formGroup.pending
      );
    } else {
      return this.formGroup.invalid || this.formGroup.pending;
    }
  }

  isPublishButtonDisabled(): boolean {
    return (
      this.pageQuery !== 'view' ||
      this.formGroup.dirty ||
      this.areDraftSelects() ||
      this.formGroup.invalid ||
      this.formGroup.pending
    );
  }

  isPublishButtonDisplayed(): boolean {
    if (this.pageQuery !== 'view') {
      return false;
    } else {
      return !(
        this.isHistory || this.importedModuleData.status === ModuleStatus.LIVE
      );
    }
  }

  isFormDisabled(): boolean {
    return this.isHistory && this.pageQuery === 'view';
  }

  areDraftSelects(): boolean {
    let flag = false;

    for (const selectName in this.selectsDraftObject) {
      if (this.selectsDraftObject[selectName]) {
        flag = true;
      }
    }
    return flag;
  }

  navigateEdit(moduleType: string, id: number): void {
    this.editOrCreateModeIsOn = true;
    this.campaignObject.isDirty = this.formGroup.dirty;
    localStorage.setItem('campaign', JSON.stringify(this.campaignObject));
    this.router.navigate([`roku/${moduleType}/view/${id}`]);
  }

  navigateCreate(moduleType: string, idType?: string, defaultModule?): void {
    this.editOrCreateModeIsOn = true;
    this.campaignObject.isDirty = this.formGroup.dirty;
    localStorage.setItem('campaign', JSON.stringify(this.campaignObject));

    if (moduleType === 'sku') {
      this.router.navigate([`roku/${moduleType}/create`]);
    } else {
      if (defaultModule) {
        this.router.navigate([
          `roku/${moduleType}/duplicate/${defaultModule[idType as string]}`,
        ]);
      } else {
        this.router.navigate([`roku/${moduleType}/create`]);
      }
    }
  }

  isImageCollectionSelectDraft(): boolean {
    if (this.formGroup.value.imageCollectionIndexes) {
      let isDraft: any = false;

      this.formGroup.value.imageCollectionIndexes
        .toString()
        .split(',')
        .forEach((id) => {
          const collection = this.imageCollectionsArray.find(
            (element) => element.imageCollectionId.toString() === id,
          );
          if (collection.status === ModuleStatus.DRAFT) {
            isDraft = true;
          }
        });
      this.selectsDraftObject.imageCollectionIndexes = isDraft;
      return isDraft;
    } else {
      return false;
    }
  }

  isSelectedModuleDraft(modulesArray, id: number, idType: string): boolean {
    if (modulesArray && id) {
      const selectedModule = modulesArray.find(
        (module) => module[idType] === id,
      );
      if (selectedModule.status === ModuleStatus.DRAFT) {
        this.selectsDraftObject[idType] = true;
        return true;
      } else {
        this.selectsDraftObject[idType] = false;
        return false;
      }
    } else {
      this.selectsDraftObject[idType] = false;
      return false;
    }
  }

  isSelectedModuleEnded(modulesArray, id: number, idType: string): boolean {
    if (modulesArray && id) {
      const selectedModule = modulesArray.find(
        (module) => module[idType] === id,
      );
      if (selectedModule.status === ModuleStatus.ENDED) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  getAppCopyRegions(id: number) {
    let supportedRegions: string[] = [];

    if (this.appCopiesArray && id) {
      const selectedAppCopy = this.appCopiesArray.find(
        (appCopy) => appCopy.appCopyId === id,
      );

      if (selectedAppCopy.platforms.mobile) {
        supportedRegions = supportedRegions.concat(
          Object.keys(selectedAppCopy.platforms.mobile),
        );
      }
      if (selectedAppCopy.platforms.mobile) {
        supportedRegions = supportedRegions.concat(
          Object.keys(selectedAppCopy.platforms.mobile),
        );
      }
    }
    return new Set(supportedRegions);
  }

  changeLocalStorageCampaign(fieldName: string, value): void {
    this.campaignObject[fieldName] = value;
    localStorage.setItem('campaign', JSON.stringify(this.campaignObject));
  }

  editImageCollectionSelect(event, imgCollection): void {
    const imgCollectionId = imgCollection.imageCollectionId;
    const imgCollectionName = imgCollection.name;

    if (event.checked) {
      if (!this.imgCollectionName) {
        this.formGroup.controls.imageCollectionIndexes.setValue(
          imgCollectionId.toString(),
        );
        this.imgCollectionName = imgCollectionName;
      } else {
        this.formGroup.controls.imageCollectionIndexes.setValue(
          this.formGroup.value.imageCollectionIndexes + ',' + imgCollectionId,
        );
        this.imgCollectionName =
          this.imgCollectionName + ', ' + imgCollectionName;
      }
    } else {
      const imgId = this.formGroup.value.imageCollectionIndexes
        .toString()
        .split(',')
        .filter((id) => {
          return id !== imgCollectionId.toString();
        })
        .join(',');
      this.formGroup.controls.imageCollectionIndexes.setValue(imgId);

      this.imgCollectionName = this.imgCollectionName
        .split(', ')
        .filter((name) => {
          return name !== imgCollectionName;
        })
        .join(', ');
    }

    this.campaignObject.imageCollectionIndexes = this.formGroup.value.imageCollectionIndexes;
    this.campaignObject.imgCollectionName = this.imgCollectionName;
    localStorage.setItem('campaign', JSON.stringify(this.campaignObject));
    this.formGroup.markAsDirty();
  }

  isImageCheckboxEnabled(checkbox, imgCollection): boolean {
    if (!checkbox.checked && this.formGroup.value.imageCollectionIndexes) {
      let isEnabled = true;

      this.formGroup.value.imageCollectionIndexes
        .toString()
        .split(',')
        .forEach((id) => {
          const collection = this.imageCollectionsArray.find(
            (element) => element.imageCollectionId.toString() === id,
          );

          const flag = imgCollection.countries.every((country) => {
            return !collection.countries.includes(country);
          });
          if (!flag) {
            isEnabled = false;
          }
        });
      return isEnabled;
    } else {
      return true;
    }
  }

  isImgCheckboxChecked(id: number): boolean {
    if (this.formGroup.value.imageCollectionIndexes) {
      return this.formGroup.value.imageCollectionIndexes
        .toString()
        .split(',')
        .includes(id.toString());
    } else {
      return false;
    }
  }

  getCampaignFormData() {
    const campaignData = this.formGroup.getRawValue();
    campaignData.status = 'saved';
    if (!!localStorage.getItem('username')) {
      campaignData.createdBy = localStorage.getItem('username');
    }

    if (this.formGroup.value.appCopyId === this.appCopyDuplicateId) {
      this.duplicatedAppCopyIsUsed = true;
    }

    for (const fieldName in campaignData) {
      if (!campaignData[fieldName]) {
        delete campaignData[fieldName];
      }
    }

    return campaignData;
  }

  save(): void {
    try {
      if (
        this.pageQuery === 'view' &&
        this.importedModuleData['deployedTo']?.includes('prod')
      ) {
        const action = {
          message:
            'This is Live CAMPAIGN, it is deployed on prod, thus you need to enter the password to update it, ' +
            'after update it will be published automatically. ' +
            `${PROCEED_MESSAGE}UPDATE?`,
          action: 'update',
          env: 'prod',
        };
        this.openActionDialog(action).subscribe(() => {
          this.loaderService.show();
          this.saveModule();
        });
      } else {
        this.loaderService.show();
        this.saveModule();
      }
    } catch (err) {
      this.showErrorSnackbar(err);
      this.loaderService.hide();
    }
  }

  async saveModule() {
    if (this.pageQuery === 'create' || this.pageQuery === 'duplicate') {
      this.rokuService
        .saveCampaign(
          this.currentStore.code,
          this.currentProduct.code,
          this.getCampaignFormData(),
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (res) => {
          this.pageQuery = 'view';
          this.campaignObject['action'] = 'view';
          this.isHistory = false;

          this.moduleID = res.data.campaignId;
          this.campaignObject['moduleID'] = this.moduleID;
          localStorage.setItem('campaign', JSON.stringify(this.campaignObject));

          await this.getCampaignById();
          this.formGroup.markAsPristine();
          this.showResponseSnackbar(res);
          this.loaderService.hide();
        });
    } else if (this.pageQuery === 'view') {
      this.rokuService
        .updateCampaign(this.moduleID, this.getCampaignFormData())
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          async (res) => {
            await this.getCampaignById();
            this.formGroup.markAsPristine();
            if (this.importedModuleData.status === ModuleStatus.LIVE) {
              this.publishAfterUpdate(res);
            } else {
              this.showResponseSnackbar(res);
              this.loaderService.hide();
            }
          },
          (err) => {
            this.showErrorSnackbar(err);
            this.loaderService.hide();
          },
        );
    }
  }

  publishAfterUpdate(res) {
    this.loaderService.show();
    this.rokuFormsUtils
      .getPublishRequests(
        this.importedModuleData,
        this.moduleID,
        this.rokuService.publishCampaign,
      )
      .subscribe(() => {
        this.showResponseSnackbar(res);
        this.loaderService.hide();
      });
  }

  async publish() {
    const action: any = {
      message: PROCEED_MESSAGE + 'PUBLISH?',
      action: 'rokuPublish',
      module: 'campaign',
      id: this.moduleID,
    };
    this.openActionDialog(action).subscribe((res) => {
      this.publishModule(this.moduleID, res);
    });
  }

  async publishModule(campaignId: number, env: string) {
    const tardisToken = localStorage.getItem('tardisToken');
    const tardisTokenExpiresAt = localStorage.getItem('tardisTokenExpiresAt');
    this.rokuService
      .publishCampaign(
        campaignId,
        env,
        ` - ${this.rokuManagementUtils.getModuleDeploymentString(env)}`,
        {
          tardisToken,
          tardisTokenExpiresAt,
        },
      )
      .subscribe(
        (res) => {
          this.showResponseSnackbar(res);
          this.loaderService.hide();
        },
        (err) => {
          this.showErrorSnackbar(err);
          this.loaderService.hide();
        },
      );
    this.router.navigate(['roku/campaigns']);
  }

  openActionDialog(action) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      return dialogActionRef.afterClosed().pipe(
        filter((res) => Boolean(res)),
        takeUntil(this.destroy$),
      );
    }
  }

  clearField(fieldName: string): void {
    this.formGroup.controls[fieldName].reset();
    this.formGroup.controls[fieldName].markAsDirty();
  }

  async getCampaignById() {
    const res = await this.rokuService.getCampaign(this.moduleID).toPromise();
    this.importedModuleData = res.data;
    this.formGroup.controls.name.setValidators([
      identityCheckValidator(
        this.campaignsModules,
        'name',
        this.importedModuleData.name,
        this.pageQuery,
      ),
    ]);
  }

  duplicateCampaign(): void {
    localStorage.removeItem('campaign');
    this.router
      .navigate(['/roku/campaigns/duplicate', this.moduleID], {
        queryParams: { isHistory: true },
      })
      .then(() => location.reload());
  }

  canNotNavigateBack(): boolean {
    if (this.ignoreDialog) {
      return false;
    } else {
      return this.isNavigateBackEnabled();
    }
  }

  isNavigateBackEnabled(): boolean {
    return (
      this.formGroup.dirty &&
      this.formGroup.valid &&
      !(
        this.importedModuleData.status === ModuleStatus.LIVE &&
        this.areDraftSelects()
      )
    );
  }

  navigateBack(): void {
    if (this.isNavigateBackEnabled()) {
      const action = {
        message:
          'There are unsaved changes that will be lost. Do you wish to save changes?' +
          `${
            this.importedModuleData.status === ModuleStatus.LIVE &&
            this.pageQuery === 'view'
              ? ' This is Live CAMPAIGN, after save it will be published automatically. '
              : ''
          }`,
        action: 'rokuSave',
      };
      this.openActionDialog(action).subscribe((res) => {
        switch (res) {
          case 'save':
            this.subject.next(false);
            this.rokuFormsUtils.setProperHistory('roku/campaigns', this.router);
            this.save();
            break;
          case 'leave':
            this.ignoreDialog = true;
            this.subject.next(true);
            this.router.navigate(['roku/campaigns']);
            break;
          case 'cancel':
            this.subject.next(false);
            this.rokuFormsUtils.setProperHistory('roku/campaigns', this.router);
            break;
        }
      });
    } else {
      this.router.navigate(['roku/campaigns']);
    }
  }

  showResponseSnackbar(res: any) {
    this.snackbarService.show(
      res.message,
      'OK',
      `/roku/campaigns/view/${
        !!this.moduleID ? this.moduleID : res.data.campaignId
      }`,
      this.router,
      5000,
    );
  }

  showErrorSnackbar(err: any) {
    this.snackbarService.show(
      `${err.message}`,
      'ERROR',
      `/roku/campaigns`,
      this.router,
      10000,
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loaderService.hide();

    if (!this.editOrCreateModeIsOn) {
      localStorage.removeItem('campaign');
      if (!this.duplicatedAppCopyIsUsed && this.appCopyDuplicateId) {
        this.rokuService.deleteAppCopy(this.appCopyDuplicateId).subscribe();
      }
    }
  }
}
