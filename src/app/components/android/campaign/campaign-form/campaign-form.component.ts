import {Component, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {BaseComponent} from '../../../base/base.component';
import {LoaderService} from '../../../../service/loader.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {AndroidService} from '../../../../service/android.service';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {forkJoin, Observable, Subject} from 'rxjs';
import {identityCheckValidator} from '../../../../validators/identity-check-validator-async';
import {filter, takeUntil} from 'rxjs/operators';
import {PROCEED_MESSAGE} from '../../../../constants';
import * as moment from 'moment';
import {AndroidFormsService} from '../../../../service/android-forms.service';
import {ModuleStatus} from '../../../../types/androidEnum';
import { AndroidManagementService } from '../../../../service/androidManagement.service';
import { SnackbarService } from '../../../../service/snackbar.service';

@Component({
  selector: 'app-campaign-form',
  templateUrl: './campaign-form.component.html',
  styleUrls: ['./campaign-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AndroidCampaignFormComponent extends BaseComponent implements OnInit, OnDestroy  {

  public formGroup: FormGroup;
  public pageQuery: string;
  public importedModuleData: any = {
    status: 'null',
  };
  public skusArray;
  public appCopiesArray;
  public imageCollectionsArray;
  public selectorConfigsArray;
  public storeCopiesArray ;
  public defaultAppCopy;
  public defaultSelectorConfig;
  public defaultStoreCopy;
  public defaultImageCollection;
  public isHistory: boolean;
  public isFormFocused = false;
  public imageCollectionSelectIsOpened = false;
  public imgCollectionName = '';

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
    private androidService: AndroidService,
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private androidFormsService: AndroidFormsService,
    private androidManagementService: AndroidManagementService,
    private snackbarService: SnackbarService,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.loaderService.show();

    this.currentStore = this.androidService.getStore();
    this.currentProduct = this.androidService.getProduct();

    this.pageQuery = this.activatedRoute.snapshot.paramMap['params']['action'] ?? 'create';
    this.campaignObject['action'] = this.pageQuery;

    this.moduleID = this.activatedRoute.snapshot.paramMap['params']['id'];
    if (this.moduleID) {
      this.campaignObject['moduleID'] = this.moduleID;
    }

    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.isHistory = params['isHistory'];
        this.campaignObject['isHistory'] = this.isHistory;
      });

    this.formGroup = this.formBuilder.group({
      name: [null, {
        updateOn: 'blur',
        validators: [Validators.required],
        asyncValidators: [identityCheckValidator(
        'name',
        'campaign',
        this.androidService,
    )]
      }],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      appCopyId: [null, Validators.required],
      selectorConfigId: [],
      imageCollectionIndexes: [''],
      winbackSkuId: [],
      storeCopyId: [],
    });

    forkJoin([
      this.androidService.getAllAppCopies(),
      this.androidService.getAllSkus(),
      this.androidService.getAllStoreCopies(),
      this.androidService.getAllSelectorConfigs(),
      this.androidService.getAllImageCollections(),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArray) => {
        const [appCopiesRes, skusRes, storeCopiesRes, selectorConfigsRes, imageCollectionsRes] = resultArray;

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
        this.getDefaultModule(this.imageCollectionsArray, 'image-collection');

        if (!JSON.parse(localStorage.getItem('campaign') as string)) {
          localStorage.setItem('campaign', JSON.stringify(this.campaignObject));

          if (this.pageQuery !== 'create') {
            this.getCampaignRequest().subscribe(
              (res) => {
                this.importedModuleData = res.data;

                this.formGroup.controls.name.setAsyncValidators(
                  identityCheckValidator(
                    'name',
                    'campaign',
                    this.androidService,
                    this.importedModuleData['name'],
                    this.pageQuery,
                  )
                );
                this.fillModule();
              }
            );
          }
        } else {
          this.campaignObject = JSON.parse(localStorage.getItem('campaign') as string);
          this.pageQuery = this.campaignObject['action'];
          this.moduleID = this.campaignObject['moduleID'];
          this.isHistory = this.campaignObject['isHistory'];
          this.imgCollectionName = this.campaignObject.imgCollectionName ?? '';

          if (this.campaignObject.isDirty) {
            this.formGroup.markAsDirty();
          }

          if (this.campaignObject['name']) {
            this.formGroup.controls.name.setAsyncValidators(
              identityCheckValidator(
                'name',
                'campaign',
                this.androidService,
                this.campaignObject['name'],
                this.pageQuery,
              )
            );
          }

          if (this.pageQuery !== 'create') {
            this.getCampaignRequest().subscribe((res) => {
              this.importedModuleData = res.data;
              this.addEndedImageCollectionModules();
              this.addEndedModules();
              this.formGroup.patchValue(this.campaignObject);
            });
          } else {
            this.formGroup.patchValue(this.campaignObject);
          }
        }
        if (this.isFormDisabled()) {
          this.formGroup.disable();
        }
        this.loaderService.hide();
      });
  }

  getCampaignRequest(): Observable<any> {
    if (this.isHistory) {
      return this.androidService.getCampaignHistory(this.moduleID);
    } else {
      return this.androidService.getCampaign(this.moduleID);
    }
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
    const defaultModule = modulesArray.find((module) => module.isDefault === true);

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
     this.formGroup.controls.name.setValue(this.importedModuleData['name'] + ' Copy');
   }

   if (!(this.isHistory && this.pageQuery === 'duplicate')) {
     this.formGroup.controls.startDate.setValue(this.importedModuleData['startDate']);
     this.formGroup.controls.endDate.setValue(this.importedModuleData['endDate']);
   }

   if (this.importedModuleData['appCopy']) {
     if (this.pageQuery !== 'duplicate') {
       this.fillField('appCopy', 'appCopyId', this.appCopiesArray);
     } else {
       this.androidService.duplicateAppCopy(this.importedModuleData['appCopy'].appCopyId)
         .subscribe((appCopyRes) => {
           this.appCopiesArray.push(appCopyRes.data);
           this.formGroup.controls.appCopyId.setValue(appCopyRes.data.appCopyId);
           this.appCopyDuplicateId = appCopyRes.data.appCopyId;
         });
     }
   }

   this.fillField('storeCopy', 'storeCopyId', this.storeCopiesArray);
   this.fillField('selectorConfig', 'selectorConfigId', this.selectorConfigsArray);
   this.fillImageCollection();

   this.formGroup.controls.winbackSkuId.setValue(this.importedModuleData['sku']?.skuId);
  }

  fillField(moduleType: string, idType: string, modulesArray): void {
    if (this.importedModuleData[moduleType]?.status === ModuleStatus.ENDED) {
      if (this.pageQuery === 'view' && this.isHistory) {
        modulesArray.push(this.importedModuleData[moduleType]);
        this.formGroup.controls[idType].setValue(this.importedModuleData[moduleType]?.[idType]);
      }
    } else {
      this.formGroup.controls[idType].setValue(this.importedModuleData[moduleType]?.[idType]);
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
      this.formGroup.controls.imageCollectionIndexes.setValue(imgCollection.imageCollectionId.toString());
    } else {
      this.imgCollectionName = this.imgCollectionName + ', ' + imgCollection.name;
      this.formGroup.controls.imageCollectionIndexes
        .setValue(this.formGroup.value.imageCollectionIndexes + ',' + imgCollection.imageCollectionId);
    }
  }

  addEndedImageCollectionModules(): void {
    this.importedModuleData.imageCollection.forEach((imgCollection) => {
      if (this.pageQuery === 'view' && this.isHistory) {
        this.imageCollectionsArray.push(imgCollection);
      }
    });
  }

  addEndedModules(): void {
    this.addEndedModuleToModulesArray('appCopy', 'appCopyId', this.appCopiesArray);
    this.addEndedModuleToModulesArray('storeCopy', 'storeCopyId', this.storeCopiesArray);
    this.addEndedModuleToModulesArray(
      'selectorConfig',
      'selectorConfigId',
      this.selectorConfigsArray
    );
  }

  addEndedModuleToModulesArray(moduleType: string, idType: string, modulesArray): void {
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
      return  'Please enter valid date';
    }
  }

  getEndDateErrorMessage(): string | undefined {
    const startDate = moment(this.formGroup.value.startDate).endOf('day');
    const endDate = moment(this.formGroup.value.endDate).endOf('day');

    if (this.formGroup.controls.endDate.hasError('required')) {
      return  'Please enter valid date';
    } else if (startDate.isAfter(endDate) || startDate.isSame(endDate)) {
      this.formGroup.controls.endDate.setErrors({notValid: true});
      return 'Please select a date at least one day later than Start Date';
    }
  }

  isSaveButtonDisabled(): boolean {
    if (this.isFormFocused) {
      return true;
    }

    if (
      this.importedModuleData.status === ModuleStatus.LIVE &&
      this.areDraftSelects() &&
      this.pageQuery === 'view'
    ) {
      return true;
    }

    if (this.pageQuery === 'view') {
      return this.formGroup.invalid || this.formGroup.pristine || this.formGroup.pending;
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
      return !(this.isHistory || this.importedModuleData.status === ModuleStatus.LIVE);
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
    this.router.navigate([`android/${moduleType}/view/${id}`]);
  }

  navigateCreate(moduleType: string, idType?: string, defaultModule?): void {
    this.editOrCreateModeIsOn = true;
    this.campaignObject.isDirty = this.formGroup.dirty;
    localStorage.setItem('campaign', JSON.stringify(this.campaignObject));

    if (moduleType === 'sku') {
      this.router.navigate([`android/${moduleType}/create`]);
    } else {
      if (defaultModule) {
        this.router.navigate([`android/${moduleType}/duplicate/${defaultModule[idType as string]}`]);
      } else {
        this.router.navigate([`android/${moduleType}/create`]);
      }
    }
  }

  isImageCollectionSelectDraft(): boolean {
    if (this.formGroup.value.imageCollectionIndexes) {
      let isDraft: any = false;

      this.formGroup.value.imageCollectionIndexes.toString().split(',').forEach((id) => {
        const collection = this.imageCollectionsArray.find((element) => element.imageCollectionId.toString() === id);
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
      const selectedModule = modulesArray.find((module) => module[idType] === id);
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
      const selectedModule = modulesArray.find((module) => module[idType] === id);
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
      const selectedAppCopy = this.appCopiesArray.find((appCopy) => appCopy.appCopyId === id);

      if (selectedAppCopy.platforms.mobile) {
        supportedRegions = supportedRegions.concat(Object.keys(selectedAppCopy.platforms.mobile));
      }
      if (selectedAppCopy.platforms.mobile) {
        supportedRegions = supportedRegions.concat(Object.keys(selectedAppCopy.platforms.mobile));
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
        this.formGroup.controls.imageCollectionIndexes.setValue(imgCollectionId.toString());
        this.imgCollectionName = imgCollectionName;
      } else {
        this.formGroup.controls.imageCollectionIndexes
          .setValue(this.formGroup.value.imageCollectionIndexes + ',' + imgCollectionId);
        this.imgCollectionName = this.imgCollectionName + ', ' + imgCollectionName;
      }
    } else {
      const imgId = this.formGroup.value.imageCollectionIndexes.toString().split(',').filter((id) => {
        return id !== imgCollectionId.toString();
      }).join(',');
      this.formGroup.controls.imageCollectionIndexes.setValue(imgId);

      this.imgCollectionName = this.imgCollectionName.split(', ').filter((name => {
        return name !== imgCollectionName;
      })).join(', ');
    }

    this.campaignObject.imageCollectionIndexes = this.formGroup.value.imageCollectionIndexes;
    this.campaignObject.imgCollectionName = this.imgCollectionName;
    localStorage.setItem('campaign', JSON.stringify(this.campaignObject));
    this.formGroup.markAsDirty();
  }

  isImageCheckboxEnabled(checkbox, imgCollection): boolean {
    if (!checkbox.checked && this.formGroup.value.imageCollectionIndexes) {
      let isEnabled = true;

      this.formGroup.value.imageCollectionIndexes.toString().split(',').forEach((id) => {
        const collection = this.imageCollectionsArray.find((element) => element.imageCollectionId.toString() === id);

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
      return this.formGroup.value.imageCollectionIndexes.toString().split(',').includes(id.toString());
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
      let action;
      if (this.pageQuery === 'view' &&  this.importedModuleData['deployedTo']?.includes('prod')) {
        action = {
          message:
            'This is Live CAMPAIGN, it is deployed on prod, thus you need to enter the password to update it, '
            + 'after update it will be published automatically. ' + `${PROCEED_MESSAGE}UPDATE?`,
          action: 'update',
          env: 'prod',
        };
      } else if (this.pageQuery === 'view') {
        action = {
          message:
            `${(this.importedModuleData.status === 'live')
              ? 'This is Live CAMPAIGN, after update it will be published automatically. ' : ''}` +
            `${PROCEED_MESSAGE}UPDATE?`,
          action: 'prompt',
        };
      } else {
        action = {
          message:
            `${PROCEED_MESSAGE}SAVE?`,
          action: 'prompt',
        };
      }

      this.openActionDialog(action).subscribe(() => {
        this.loaderService.show();
        this.saveModule();
      });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async saveModule() {
    if (this.pageQuery === 'create' || this.pageQuery === 'duplicate') {
      this.androidService
        .saveCampaign(
          this.currentStore.code, this.currentProduct.code,
          await this.getCampaignFormData()
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (res) => {
          this.openResponseDialog(res);
          this.pageQuery = 'view';
          this.campaignObject['action'] = 'view';
          this.isHistory = false;

          this.moduleID = res.data.campaignId;
          this.campaignObject['moduleID'] = this.moduleID;
          localStorage.setItem('campaign', JSON.stringify(this.campaignObject));

          await this.getCampaignById();
          this.formGroup.markAsPristine();
        });
    } else if (this.pageQuery === 'view') {
      this.androidService
        .updateCampaign(this.moduleID, await this.getCampaignFormData())
        .pipe(takeUntil(this.destroy$)).subscribe(async (res) => {
          await this.getCampaignById();
          this.formGroup.markAsPristine();
          if (this.importedModuleData.status === ModuleStatus.LIVE) {
            this.publishAfterUpdate(res);
          } else {
            this.openResponseDialog(res);
          }
        },
        (error) => {
          this.openErrorDialog(error);
        });
    }
  }

  publishAfterUpdate(res) {
    this.loaderService.show();

    this.androidFormsService.getPublishRequests(
      this.importedModuleData,
      this.moduleID,
      this.androidService.publishCampaign
    ).subscribe(() => {
      this.openResponseDialog(res);
    });
  }

  async publish() {
    const action: any = {
      message: PROCEED_MESSAGE + 'PUBLISH?',
      action: 'androidPublish',
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
    this.androidService
      .publishCampaign(
        campaignId,
        env,
        ` - ${this.androidManagementService.getModuleDeploymentString(env)}`,
        {
          tardisToken,
          tardisTokenExpiresAt,
        },
      )
      .subscribe(
        (res) => {
          this.snackbarService.show(
            res.message,
            'OK',
            '/android/campaigns',
            this.router,
          );
        },
        (err) => {
          this.snackbarService.show(
            `${err.message}`,
            'ERROR',
            '/android/campaigns',
            this.router,
          );
        },
      );
    this.router.navigate(['android/campaigns']);
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

  openResponseDialog(response): void {
    super
      .openResponse(response);
  }

  clearField(fieldName: string): void {
    this.formGroup.controls[fieldName].reset();
    this.formGroup.controls[fieldName].markAsDirty();
  }

  async getCampaignById() {
    const res = await this.androidService.getCampaign(this.moduleID).toPromise();
    this.importedModuleData = res.data;
    this.formGroup.controls.name.setAsyncValidators(
      identityCheckValidator(
        'name',
        'campaign',
        this.androidService,
        this.importedModuleData['name'],
        this.pageQuery,
      )
    );
  }

  duplicateCampaign(): void {
    localStorage.removeItem('campaign');
    this.router.navigate(
      ['/android/campaigns/duplicate', this.moduleID],
      { queryParams: { isHistory: true } }
      ).then(() => location.reload());
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
      this.formGroup.dirty && this.formGroup.valid &&
      !(this.importedModuleData.status === ModuleStatus.LIVE && this.areDraftSelects())
    );
  }

  navigateBack(): void {
    if (this.isNavigateBackEnabled()) {
      const action = {
        message: 'There are unsaved changes that will be lost. Do you wish to save changes?' +
          `${(this.importedModuleData.status === ModuleStatus.LIVE && this.pageQuery === 'view') ?
            ' This is Live CAMPAIGN, after save it will be published automatically. ' : ''}`,
        action: 'androidSave',
      };
      this.openActionDialog(action).subscribe((res) => {
        switch (res) {
          case 'save':
            this.subject.next(false);
            this.androidFormsService.setProperHistory('android/campaigns', this.router);
            this.save();
            break;
          case 'leave':
            this.ignoreDialog = true;
            this.subject.next(true);
            this.router.navigate(['android/campaigns']);
            break;
          case 'cancel':
            this.subject.next(false);
            this.androidFormsService.setProperHistory('android/campaigns', this.router);
            break;
        }
      });
    } else {
      this.router.navigate(['android/campaigns']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loaderService.hide();

    if (!this.editOrCreateModeIsOn) {
      localStorage.removeItem('campaign');
      if (!this.duplicatedAppCopyIsUsed && this.appCopyDuplicateId) {
        this.androidService.deleteAppCopy(this.appCopyDuplicateId).subscribe();
      }
    }
  }
}
