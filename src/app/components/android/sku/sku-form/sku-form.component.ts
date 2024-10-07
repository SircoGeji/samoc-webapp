import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { ConfigurationService } from '../../../../service/configuration.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AndroidService } from '../../../../service/android.service';
import { LoaderService } from '../../../../service/loader.service';
import { forkJoin, Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseComponent } from '../../../base/base.component';
import { filter, takeUntil } from 'rxjs/operators';
import { PROCEED_MESSAGE } from '../../../../constants';
import { AndroidFormsService } from '../../../../service/android-forms.service';
import { identityCheckValidator } from '../../../../validators/identity-check-validator';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

@Component({
  selector: 'app-sku-form',
  templateUrl: './sku-form.component.html',
  styleUrls: ['./sku-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AndroidSkuFormComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  @ViewChild('tableContainer')
  private tableContainer: ElementRef;
  @ViewChild('regionButtonsContainer')
  private regionButtonsContainer: ElementRef;
  @ViewChild('imgContainer')
  private imgContainer: ElementRef;

  public regionsLanguagesBinding: any[] = [];
  public formGroup: FormGroup;
  public regionPosition = 0;
  public regionPositionArray: any[] = [];
  public regionFields;
  public regionNonTranslatableFields: any[] = [];
  public regionTranslatableFields: any[] = [];
  public skuImagesArray;
  public pageQuery: string;
  public selectedRegion;
  public showImgSpinner = false;
  public imgSpinnerPosition;
  public status = {
    DEFAULT: 'default',
    RED: 'incomplete',
    DUPLICATE: 'duplicate',
    UNSAVED: 'unsaved',
    SAVED: 'saved',
  } as const;
  public storeSkuIdFocused = false;
  public linkIdFocused = false;
  public imgCanBeLoaded = true;
  public isFormVisible: boolean = false;

  private destroy$ = new Subject<void>();
  private moduleID: number;
  private importedModuleData;
  private subject = new Subject<boolean>();
  private ignoreDialog = false;
  private allEnvSkuModules: any;
  private allStoreSkuModules: any;
  private allSkuModules: any;
  private linkIdWarningStores: string[];
  private currentEnvAllSkuModules: any;
  private currentStore: any;
  private currentProduct: any;
  private currentEnv: any;

  constructor(
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    private configurationService: ConfigurationService,
    private formBuilder: FormBuilder,
    private androidService: AndroidService,
    private androidFormsService: AndroidFormsService,
    private activatedRoute: ActivatedRoute,
  ) {
    super(dialog, loaderService, router);
    this.formGroup = this.formBuilder.group({});
  }

  ngOnInit(): void {
    this.currentStore = this.androidService.getStore();
    this.currentProduct = this.androidService.getProduct();
    this.currentEnv = this.androidService.getEnv();

    forkJoin([
      this.androidService.getAllSkus(),
      this.androidService.getSkuFields(this.currentStore.code),
      this.androidService.getRegionsLanguages(
        this.currentStore.code,
        this.currentProduct.code,
      ),
      this.androidService.getSkuImages(this.currentProduct.code),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArray) => {
        const [allSkus, fieldsRes, regionsRes, imgRes] = resultArray;
        if (!!allSkus.data && !!allSkus.data.length) {
          this.allStoreSkuModules = allSkus.data.filter((el) => {
            return (
              el.productId === this.currentProduct.productId &&
              el.storeId === this.currentStore.storeId
            );
          });
          this.currentEnvAllSkuModules = allSkus.data.filter((el) => {
            return (
              el.envId === this.currentEnv.envId &&
              el.productId === this.currentProduct.productId &&
              el.storeId === this.currentStore.storeId
            );
          });
          this.allSkuModules = allSkus.data.filter((el) => {
            return (
              el.productId === this.currentProduct.productId
            );
          });
        }

        this.formGroup = this.formBuilder.group({
          regionsFormGroup: this.formBuilder.group({}),
          store_parent_SKU_ID: [''],
          store_SKU_ID: [
            null,
            [
              Validators.required,
              identityCheckValidator(this.allEnvSkuModules, 'storeSkuId'),
            ],
          ],
          skuName: [null, Validators.required],
          linkID: [''],
        });

        this.getSkuImages(imgRes);
        this.setSKUFormFields(fieldsRes);
        this.getRegionsLanguagesBinding(regionsRes);
        this.loaderService.hide();
      });
  }

  setTemplateElementsPositions(): void {
    if (this.tableContainer && this.regionButtonsContainer) {
      this.regionButtonsContainer.nativeElement.style.height =
        this.tableContainer.nativeElement.offsetHeight + 63 + 'px';
    }

    if (this.imgContainer) {
      this.imgSpinnerPosition =
        this.imgContainer.nativeElement.offsetWidth / 2 - 50 + 'px';
    }
  }

  isFieldValuePresent(field, region, language, type) {
    const fieldValue = this.formGroup.value.regionsFormGroup[region.code][
      language.code
    ][field.fieldName];

    if (type === 'string') {
      return fieldValue?.length;
    } else {
      return fieldValue?.toString().replace(/\s/g, '').length;
    }
  }

  isRequiredFieldEmpty(field, region): boolean {
    if (!field.required) {
      return false;
    }

    return !region.languages.every((language) => {
      return !!this.isFieldValuePresent(field, region, language, field.dataType);
    });
  }

  doesRegionHaveOneLanguage(region): boolean {
    return region.languages.length === 1;
  }

  setSKUFormFields(fieldsRes) {
    this.regionFields = fieldsRes.data;
    this.regionFields.forEach((field) => {
      if (field.translatable) {
        this.regionTranslatableFields.push(field);
      } else {
        this.regionNonTranslatableFields.push(field);
      }
    });
    this.regionTranslatableFields.sort(
      (a, b) => Number(a.order) - Number(b.order),
    );
    this.regionNonTranslatableFields.sort(
      (a, b) => Number(a.order) - Number(b.order),
    );
  }

  getSkuImages(imgRes): void {
    this.skuImagesArray = imgRes.data;
  }

  getRegionsLanguagesBinding(regionsRes) {
    this.regionsLanguagesBinding = Object.values(regionsRes.data).map(
      (region: any) => {
        const languagesCodes: any[] = Object.keys(region.languages);
        const languages: any[] = Object.values(region.languages).map(
          (language: any, index) => {
            return { code: languagesCodes[index], name: language.name };
          },
        );
        return {
          code: region.code,
          status: this.status.RED,
          name: region.name,
          languages,
        };
      },
    );

    this.selectedRegion = this.regionsLanguagesBinding[this.regionPosition];

    this.androidFormsService.setFormGroup(
      this.formGroup.controls.regionsFormGroup as FormGroup,
      this.regionTranslatableFields,
      this.regionsLanguagesBinding,
    );

    this.showImgSpinner = true;
    this.editRegionsFormGroup();

    this.androidFormsService.fillRegionPositionArray(
      this.regionsLanguagesBinding,
      this.regionPositionArray,
    );

    this.pageQuery =
      this.activatedRoute.snapshot.paramMap['params']['action'] ?? 'create';
    this.moduleID =
      Number(this.activatedRoute.snapshot.paramMap['params']['id']) ?? null;

    if (this.moduleID) {
      const foundModule = this.allStoreSkuModules.find(
        (module) => module.skuId === this.moduleID,
      );
      if (!!foundModule) {
        this.importedModuleData = foundModule;

        this.formGroup.controls.store_SKU_ID.setValidators([
          Validators.required,
          identityCheckValidator(
            this.allEnvSkuModules,
            'storeSkuId',
            this.importedModuleData.storeSkuId,
            this.pageQuery,
          ),
        ]);

        this.fillSkuForm();
      }
    }
    this.isFormVisible = true;
    this.loaderService.hide();
    this.setTemplateElementsPositions();
  }

  getRegionFieldValue(region, fieldName: string): string {
    const fieldValue = this.formGroup.value.regionsFormGroup[region.code][
      region.languages[0].code
    ][fieldName];

    if (fieldValue) {
      return fieldValue;
    } else {
      return '';
    }
  }

  editRegionsFormGroup(): void {
    this.regionsLanguagesBinding.forEach((region) => {
      const regionFormGroup = (this.formGroup.controls
        .regionsFormGroup as FormGroup).controls[region.code] as FormGroup;
      this.regionNonTranslatableFields.forEach((field) => {
        regionFormGroup.addControl(field.fieldName, new FormControl());
      });
      regionFormGroup.addControl(
        'imgSelector',
        new FormControl(this.skuImagesArray[0].url),
      );
      regionFormGroup.addControl(
        'img',
        new FormControl(this.skuImagesArray[0].url),
      );

      regionFormGroup.controls.imgSelector.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((url) => {
          if (this.formGroup.value.regionsFormGroup[region.code].img !== url) {
            this.showImgSpinner = true;
            this.imgCanBeLoaded = true;
            regionFormGroup.controls.img.setValue(url);
          }
        });
    });
  }

  fillSkuForm(): void {
    if (this.pageQuery === 'duplicate') {
      this.formGroup.controls.skuName.setValue(
        `${this.importedModuleData.name} Copy`,
      );
      this.formGroup.controls.store_parent_SKU_ID.setValue(
        this.importedModuleData.parentSkuId,
      );
      this.formGroup.controls.store_SKU_ID.setValue(
        `${this.importedModuleData.storeSkuId} Copy`,
      );
      if (this.importedModuleData.linkId) {
        this.formGroup.controls.linkID.setValue(
          `${this.importedModuleData.linkId} Copy`,
        );
      }
    } else {
      this.formGroup.controls.skuName.setValue(this.importedModuleData.name);
      this.formGroup.controls.store_parent_SKU_ID.setValue(
        this.importedModuleData.parentSkuId,
      );
      this.formGroup.controls.store_SKU_ID.setValue(
        this.importedModuleData.storeSkuId,
      );
      this.formGroup.controls.linkID.setValue(this.importedModuleData.linkId);
    }

    this.androidFormsService.modifiedFillModule(
      this.importedModuleData.countries,
      this.formGroup.controls.regionsFormGroup as FormGroup,
      this.regionNonTranslatableFields,
      this.regionTranslatableFields,
      'status',
      this.regionsLanguagesBinding,
      'sku',
    );
  }

  changeModuleRegionStatus(index: number) {
    this.androidFormsService.modifiedChangeRegionStatus(
      index,
      this.formGroup.controls.regionsFormGroup as FormGroup,
      this.regionNonTranslatableFields,
      this.regionTranslatableFields,
      'status',
      this.regionsLanguagesBinding,
    );
  }

  getClassArray(region, index: number): string[] {
    const classArray: string[] = [];
    classArray.push(region.status);
    if (this.regionPositionArray[index]) {
      classArray.push('selected-region');
    }
    return classArray;
  }

  isSaveButtonDisabled(): boolean {
    if (
      this.storeSkuIdFocused ||
      this.linkIdFocused ||
      (this.pageQuery === 'view'
        ? !!this.importedModuleData && !!this.importedModuleData.isArchived
        : false)
    ) {
      return true;
    }

    return (
      (this.isSaveAllButtonDisabled() && this.isUpdateRegionButtonDisabled()) ||
      this.androidFormsService.isModuleEmpty(
        this.regionsLanguagesBinding,
        this.formGroup.controls.regionsFormGroup as FormGroup,
        this.regionFields,
      )
    );
  }

  isSaveAllButtonDisabled(): boolean {
    if (this.pageQuery === 'duplicate') {
      return this.formGroup.invalid || this.formGroup.pending;
    } else {
      return (
        this.formGroup.pristine ||
        this.formGroup.invalid ||
        this.formGroup.pending
      );
    }
  }

  isUpdateRegionButtonDisabled(): boolean {
    return (
      this.pageQuery !== 'view' ||
      ((this.formGroup.controls.regionsFormGroup as FormGroup).controls[
        this.selectedRegion.code
      ] as FormGroup).invalid ||
      ((this.formGroup.controls.regionsFormGroup as FormGroup).controls[
        this.selectedRegion.code
      ] as FormGroup).pristine ||
      this.androidFormsService.isRegionEmpty(
        this.selectedRegion,
        this.formGroup.controls.regionsFormGroup as FormGroup,
        this.regionFields,
      )
    );
  }

  getStoreSkuIdIdErrorMessage(): string {
    if (this.formGroup.controls.store_SKU_ID.hasError('required')) {
      return 'Please enter Store SKU ID';
    } else if (
      this.formGroup.controls.store_SKU_ID.hasError('fieldValueIsNotUnique')
    ) {
      return 'This Store SKU ID already exists';
    } else {
      return '';
    }
  }

  regionButtonClick(index: number): void {
    this.regionPosition = index;
    this.regionPositionArray = this.regionPositionArray.map(() => false);
    this.regionPositionArray[index] = true;
    this.selectedRegion = this.regionsLanguagesBinding[this.regionPosition];
  }

  copyFields(regionCode: string, language: string): void {
    let androidSkuFormCopyObj = {};
    this.androidFormsService.copyFields(
      androidSkuFormCopyObj,
      this.regionTranslatableFields,
      this.formGroup.controls.regionsFormGroup as FormGroup,
      regionCode,
      language,
    );
    localStorage.setItem(
      'androidSkuFormCopy',
      JSON.stringify(androidSkuFormCopyObj),
    );
  }

  pasteFields(regionCode: string, language: string, index: number): void {
    const androidSkuFormCopyObj = JSON.parse(
      localStorage.getItem('androidSkuFormCopy') as string,
    );
    this.androidFormsService.pasteFields(
      this.regionsLanguagesBinding,
      androidSkuFormCopyObj,
      this.regionTranslatableFields,
      this.formGroup.controls.regionsFormGroup as FormGroup,
      index,
      regionCode,
      language,
      'status',
    );
  }

  saveAll(): void {
    try {
      let action;
      if (
        this.pageQuery === 'view' &&
        (this.importedModuleData.usedInLiveOnProdSelectorConfig ||
          this.importedModuleData.usedInLiveOnProdCampaign)
      ) {
        action = {
          message:
            'This Sku module is used in Live module, that is deployed on PROD, thus you need to enter the password to update it, ' +
            'after update it will be published automatically. ' +
            `${PROCEED_MESSAGE}UPDATE ALL?`,
          action: 'update',
          env: 'prod',
        };
      } else if (this.pageQuery === 'view') {
        action = {
          message: `${PROCEED_MESSAGE}UPDATE ALL?`,
          action: 'prompt',
        };
      } else {
        action = {
          message: `${PROCEED_MESSAGE}SAVE ALL?`,
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
        .saveSku(
          this.currentStore.code,
          this.currentProduct.code,
          this.currentEnv.code,
          this.getFormData(),
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          async (res) => {
            this.moduleID = res.data.skuId;
            await this.getSkuById();
            this.pageQuery = 'view';

            if (JSON.parse(localStorage.getItem('campaign') as string)) {
              this.androidFormsService.editCampaignObjectInLocalStorage(
                'winbackSkuId',
                this.moduleID,
              );
              this.router.navigate(['android/campaigns/create']);
            } else {
              this.openResponseDialog(res);
            }
          },
          (error) => {
            this.openErrorDialog(error);
          },
        );
    } else if (this.pageQuery === 'view') {
      this.androidService
        .updateSku(this.moduleID, this.getFormData())
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          async (res) => {
            await this.getSkuById();
            this.androidFormsService.navigateBackOrOpenDialog(
              this.openResponseDialog,
              res,
              this,
            );
          },
          (error) => {
            this.openErrorDialog(error);
          },
        );
    }
  }

  async updateRegion() {
    try {
      let action;
      if (
        this.importedModuleData.usedInLiveOnProdSelectorConfig ||
        this.importedModuleData.usedInLiveOnProdCampaign
      ) {
        action = {
          message:
            'This Sku module is used in Live module, that is deployed on PROD, thus you need to enter the password to update it, ' +
            'after update it will be published automatically. ' +
            `${PROCEED_MESSAGE}UPDATE REGION?`,
          action: 'update',
          env: 'prod',
        };
      } else {
        action = {
          message: `${PROCEED_MESSAGE} UPDATE REGION?`,
          action: 'prompt',
        };
      }
      this.openActionDialog(action).subscribe(() => {
        this.loaderService.show();
        this.androidService
          .updateRegionInSku(
            this.moduleID,
            this.androidFormsService.getModifiedSelectedRegionData(
              this.regionNonTranslatableFields,
              this.regionTranslatableFields,
              this.formGroup.controls.regionsFormGroup as FormGroup,
              this.selectedRegion,
              'status',
            ),
            this.selectedRegion.code,
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            async (res) => {
              await this.getSkuById();
              this.androidFormsService.navigateBackOrOpenDialog(
                this.openResponseDialog,
                res,
                this,
              );
            },
            (error) => {
              this.openErrorDialog(error);
            },
          );
      });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  openActionDialog(action: DialogAction) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      return dialogActionRef.afterClosed().pipe(
        filter((res) => Boolean(res)),
        takeUntil(this.destroy$),
      );
    }
  }

  openResponseDialog(response): void {
    super.openResponse(response);
  }

  getFormData() {
    const formData: any = {
      countries: {},
      createdBy: null,
      parentSkuId: this.formGroup.value.store_parent_SKU_ID,
      storeSkuId: this.formGroup.value.store_SKU_ID,
      name: this.formGroup.value.skuName,
      linkId: this.formGroup.value.linkID,
    };
    if (!!localStorage.getItem('username')) {
      formData.createdBy = localStorage.getItem('username');
    }

    this.androidFormsService.makeFormDataKeys(
      formData.countries,
      this.regionsLanguagesBinding,
    );

    this.androidFormsService.modifiedFillFormData(
      this.regionNonTranslatableFields,
      this.regionTranslatableFields,
      formData.countries,
      this.formGroup.controls.regionsFormGroup as FormGroup,
      this.regionsLanguagesBinding,
      'status',
    );
    return formData;
  }

  noUnsavedRegions(): boolean {
    return this.regionsLanguagesBinding.every((region) => {
      return region.status !== this.status.UNSAVED;
    });
  }

  canNotNavigateBack(): boolean {
    if (this.ignoreDialog) {
      return false;
    } else {
      return (
        (!!this.importedModuleData
          ? !this.importedModuleData.isArchived
          : true) &&
        !this.noUnsavedRegions() &&
        this.formGroup.valid
      );
    }
  }

  navigateBack(): void {
    if (
      (!!this.importedModuleData
        ? !this.importedModuleData.isArchived
        : true) &&
      !this.noUnsavedRegions() &&
      this.formGroup.valid
    ) {
      const action: DialogAction = {
        message:
          'There are unsaved changes that will be lost. Do you wish to save changes?',
        action: 'androidSave',
      };
      this.openActionDialog(action).subscribe((res) => {
        switch (res) {
          case 'save':
            this.subject.next(false);
            this.androidFormsService.setProperHistory('sku', this.router);
            this.loaderService.show();
            this.saveModule();
            break;
          case 'leave':
            this.ignoreDialog = true;
            this.subject.next(true);
            this.androidFormsService.navigateBack('sku');
            break;
          case 'cancel':
            this.subject.next(false);
            this.androidFormsService.setProperHistory('sku', this.router);
            break;
        }
      });
    } else {
      this.androidFormsService.navigateBack('sku');
    }
  }

  async getSkuById() {
    const res = await this.androidService.getSku(this.moduleID).toPromise();
    this.importedModuleData = res.data;
    this.formGroup.controls.store_SKU_ID.setValidators([
      Validators.required,
      identityCheckValidator(
        this.allEnvSkuModules,
        'storeSkuId',
        this.importedModuleData.storeSkuId,
        this.pageQuery,
      ),
    ]);
  }

  isFieldValueUnique(fieldName: string, fieldValue: string): boolean {
    if (!this.formGroup || !fieldValue) {
      return true;
    }
    if (!!this.allSkuModules && this.allSkuModules.length) {
      const result = this.allSkuModules.filter((skuModule) => {
        return (skuModule[fieldName] === fieldValue.trim() && skuModule['envId'] === this.currentEnv.envId && this.moduleID !== skuModule['skuId']);
      });
      this.linkIdWarningStores = [];
      result.forEach((store) => {
        this.linkIdWarningStores.push(store['storeId']);
      });
      return !result.length;
    } else {
      return true;
    }
  }

  getWarningMessage(fieldName: string): string {
    let androidStores = JSON.parse(localStorage.getItem('androidStores') as string);
    let warningStores: string[] = [];
    this.linkIdWarningStores.forEach((warningStore) => {
      androidStores.forEach((androidStore) => {
        if (warningStore.toString() === androidStore.storeId.toString()) {
          warningStores.push(androidStore.name);
        }
      });
    });
    return `WARNING! That ${fieldName} already exists for store(s) ${warningStores.join(',')}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loaderService.hide();
  }
}
