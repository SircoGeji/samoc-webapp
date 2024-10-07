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
import { RokuService } from '../../../../service/roku.service';
import { LoaderService } from '../../../../service/loader.service';
import { forkJoin, Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseComponent } from '../../../base/base.component';
import { filter, takeUntil } from 'rxjs/operators';
import { PROCEED_MESSAGE } from '../../../../constants';
import { RokuFormsUtils } from '../../../../utils/roku-forms.utils';
import { identityCheckValidator } from '../../../../validators/identity-check-validator';
import { SnackbarService } from '../../../../service/snackbar.service';

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
export class RokuSkuFormComponent
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
  public showImgSpinner = true;
  public imgSpinnerPosition;
  public status = {
    DEFAULT: 'default',
    RED: 'incomplete',
    DUPLICATE: 'duplicate',
    UNSAVED: 'unsaved',
    SAVED: 'saved',
  } as const;
  public imgCanBeLoaded = true;
  public isFormVisible: boolean = false;
  public middleWidthFieldName: string = 'flow';

  private destroy$ = new Subject<void>();
  private moduleID: number;
  private importedModuleData;
  private subject = new Subject<boolean>();
  private ignoreDialog = false;
  private allEnvSkuModules: any;
  private allSkuModules: any;
  private currentStore: any;
  private currentProduct: any;
  private currentEnv: any;

  constructor(
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    private configurationService: ConfigurationService,
    private formBuilder: FormBuilder,
    private rokuService: RokuService,
    private rokuFormsUtils: RokuFormsUtils,
    private activatedRoute: ActivatedRoute,
    private snackbarService: SnackbarService,
  ) {
    super(dialog, loaderService, router);
    this.formGroup = this.formBuilder.group({});
  }

  ngOnInit(): void {
    this.currentStore = this.rokuService.getStore();
    this.currentProduct = this.rokuService.getProduct();
    this.currentEnv = this.rokuService.getEnv();

    forkJoin([
      this.rokuService.getAllSkus(),
      this.rokuService.getSkuFields(this.currentStore.code),
      this.rokuService.getRegionsLanguages(
        this.currentStore.code,
        this.currentProduct.code,
      ),
      this.rokuService.getSkuImages(this.currentProduct.code),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArray) => {
        const [allSkusRes, fieldsRes, regionsRes, imgRes] = resultArray;
        if (!!allSkusRes.data && !!allSkusRes.data.length) {
          this.allEnvSkuModules = allSkusRes.data.filter((el) => {
            return (
              el.envId === this.currentEnv.envId &&
              el.productId === this.currentProduct.productId &&
              el.storeId === this.currentStore.storeId
            );
          });
          this.allSkuModules = allSkusRes.data.filter((el) => {
            return (
              el.productId === this.currentProduct.productId &&
              el.storeId === this.currentStore.storeId
            );
          });
        }

        this.formGroup = this.formBuilder.group({
          regionsFormGroup: this.formBuilder.group({}),
          storeSkuId: [
            null,
            [
              Validators.required,
              identityCheckValidator(this.allEnvSkuModules, 'storeSkuId'),
            ],
          ],
          skuName: [null, Validators.required],
          linkId: ['', identityCheckValidator(this.allEnvSkuModules, 'linkId')],
        });

        this.getSkuImages(imgRes);
        this.getSKUFormFields(fieldsRes);
        this.getRegionsLanguagesBinding(regionsRes);
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

  getSKUFormFields(fieldsRes) {
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

  getNonTranslatableField(isBoolean: boolean, excludedFieldName?: string) {
    return this.regionNonTranslatableFields.filter(
      (field) =>
        (!!isBoolean
          ? field.dataType === 'boolean'
          : field.dataType !== 'boolean') &&
        (!!excludedFieldName ? field.fieldName !== excludedFieldName : true),
    );
  }

  getMiddleWidthField() {
    return this.getNonTranslatableField(false).find(
      (field) => field.fieldName === this.middleWidthFieldName,
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
          active: false,
          code: region.code,
          status: this.status.RED,
          name: region.name,
          languages,
        };
      },
    );

    this.selectedRegion = this.regionsLanguagesBinding[this.regionPosition];

    this.rokuFormsUtils.setFormGroup(
      this.formGroup.controls.regionsFormGroup as FormGroup,
      this.regionTranslatableFields,
      this.regionsLanguagesBinding,
    );

    this.editRegionsFormGroup();

    this.rokuFormsUtils.fillRegionPositionArray(
      this.regionsLanguagesBinding,
      this.regionPositionArray,
    );

    this.pageQuery =
      this.activatedRoute.snapshot.paramMap['params']['action'] ?? 'create';
    this.moduleID =
      Number(this.activatedRoute.snapshot.paramMap['params']['id']) ?? null;

    if (this.moduleID) {
      const foundModule = this.allSkuModules.find(
        (module) => module.skuId === this.moduleID,
      );
      if (!!foundModule) {
        this.importedModuleData = foundModule;

        this.formGroup.controls.storeSkuId.setValidators([
          Validators.required,
          identityCheckValidator(
            this.allEnvSkuModules,
            'storeSkuId',
            this.importedModuleData.storeSkuId,
            this.pageQuery,
          ),
        ]);

        this.formGroup.controls.linkId.setValidators([
          identityCheckValidator(
            this.allEnvSkuModules,
            'linkId',
            this.importedModuleData.linkId,
            this.pageQuery,
          ),
        ]);

        this.fillSkuForm();
      }
    }
    this.isFormVisible = true;
    this.setTemplateElementsPositions();
    this.loaderService.hide();
  }

  getRegionFieldValue(region, fieldName: string): string {
    const fieldValue = this.formGroup.value.regionsFormGroup[region.code][
      region.languages[0].code
    ][fieldName];
    return !!fieldValue ? fieldValue : '';
  }

  isFieldRequired(fieldName: string): boolean {
    const foundField = this.regionFields.find(
      (field) => field.fieldName === fieldName,
    );
    return !!foundField ? foundField.required : false;
  }

  changeRegionFieldValue(
    region,
    fieldName: string,
    event,
    index: number,
  ): void {
    region.languages.forEach((language) => {
      const fieldControl = this.formGroup.get([
        'regionsFormGroup',
        region.code,
        language.code,
        fieldName,
      ]) as FormControl;
      if (fieldName === 'preRelease' || fieldName === 'enabled') {
        fieldControl.setValue(!fieldControl.value);
      } else {
        fieldControl.setValue(event.target.value);
      }
      fieldControl.markAsDirty();
    });
    this.changeModuleRegionStatus(index);
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
      this.formGroup.controls.storeSkuId.setValue(
        `${this.importedModuleData.storeSkuId} Copy`,
      );
      if (this.importedModuleData.linkId) {
        this.formGroup.controls.linkId.setValue(
          `${this.importedModuleData.linkId} Copy`,
        );
      }
    } else {
      this.formGroup.controls.skuName.setValue(this.importedModuleData.name);
      this.formGroup.controls.storeSkuId.setValue(
        this.importedModuleData.storeSkuId,
      );
      this.formGroup.controls.linkId.setValue(this.importedModuleData.linkId);
    }

    this.rokuFormsUtils.modifiedFillModule(
      this.importedModuleData.countries,
      this.formGroup.controls.regionsFormGroup as FormGroup,
      this.regionNonTranslatableFields,
      this.regionTranslatableFields,
      'status',
      this.regionsLanguagesBinding,
      'sku',
    );

    Object.keys(this.importedModuleData.countries).forEach((regionCode) => {
      this.regionsLanguagesBinding.forEach((region) => {
        if (region.code === regionCode) {
          region.active = true;
        }
      });
    });
  }

  changeModuleRegionStatus(index: number) {
    this.rokuFormsUtils.modifiedChangeRegionStatus(
      index,
      this.formGroup.controls.regionsFormGroup as FormGroup,
      this.regionNonTranslatableFields,
      this.regionTranslatableFields,
      'status',
      this.regionsLanguagesBinding,
    );
  }

  getClassArray(region, index: number): string[] {
    const regionStatus = region.active ? region.status : this.status.DEFAULT;
    const classArray: string[] = [];
    classArray.push(regionStatus);
    if (this.regionPositionArray[index]) {
      classArray.push('selected-region');
    }
    return classArray;
  }

  isSaveButtonDisabled(): boolean {
    return (
      (this.pageQuery === 'view'
        ? !!this.importedModuleData && !!this.importedModuleData.isArchived
        : false) ||
      (this.isSaveAllButtonDisabled() && this.isUpdateRegionButtonDisabled()) ||
      this.rokuFormsUtils.modifiedIsModuleEmpty(
        this.regionsLanguagesBinding,
        this.formGroup.controls.regionsFormGroup as FormGroup,
        this.regionNonTranslatableFields,
        this.regionTranslatableFields,
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
      this.rokuFormsUtils.isRegionEmpty(
        this.selectedRegion,
        this.formGroup.controls.regionsFormGroup as FormGroup,
        this.regionFields,
      )
    );
  }

  getLinkIdErrorMessage(): string {
    if (this.formGroup.controls.linkId.hasError('required')) {
      return 'Please enter Link ID';
    } else if (
      this.formGroup.controls.linkId.hasError('fieldValueIsNotUnique')
    ) {
      return 'This Link ID already exists';
    } else {
      return '';
    }
  }

  getStoreSkuIdIdErrorMessage(): string {
    if (this.formGroup.controls.storeSkuId.hasError('required')) {
      return 'Please enter Store SKU ID';
    } else if (
      this.formGroup.controls.storeSkuId.hasError('fieldValueIsNotUnique')
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
    let rokuSkuFormCopyObj = {};
    this.rokuFormsUtils.copyFields(
      rokuSkuFormCopyObj,
      this.regionTranslatableFields,
      this.formGroup.controls.regionsFormGroup as FormGroup,
      regionCode,
      language,
    );
    localStorage.setItem('rokuSkuFormCopy', JSON.stringify(rokuSkuFormCopyObj));
  }

  pasteFields(regionCode: string, language: string, index: number): void {
    const rokuSkuFormCopyObj = JSON.parse(
      localStorage.getItem('rokuSkuFormCopy') as string,
    );
    this.rokuFormsUtils.pasteFields(
      this.regionsLanguagesBinding,
      rokuSkuFormCopyObj,
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
      if (
        this.pageQuery === 'view' &&
        (this.importedModuleData.usedInLiveOnProdSelectorConfig ||
          this.importedModuleData.usedInLiveOnProdCampaign)
      ) {
        const action = {
          message:
            'This Sku module is used in Live module, that is deployed on PROD, thus you need to enter the password to update it, ' +
            'after update it will be published automatically. ' +
            `${PROCEED_MESSAGE}UPDATE ALL?`,
          action: 'update',
          env: 'prod',
        };
        this.openActionDialog(action).subscribe(() => {
          this.loaderService.show();
          this.saveModule();
        });
      } else {
        this.saveModule();
      }
    } catch (err) {
      this.showErrorSnackbar(err);
    }
  }

  async saveModule() {
    this.loaderService.show();
    if (this.pageQuery === 'create' || this.pageQuery === 'duplicate') {
      this.rokuService
        .saveSku(
          this.currentStore.code,
          this.currentProduct.code,
          this.getFormData(),
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          async (res) => {
            this.showResponseSnackbar(res);
            this.moduleID = res.data.skuId;
            await this.getSkuById();
            this.pageQuery = 'view';

            if (JSON.parse(localStorage.getItem('campaign') as string)) {
              this.rokuFormsUtils.editCampaignObjectInLocalStorage(
                'winbackSkuId',
                this.moduleID,
              );
              this.router.navigate(['roku/campaigns/create']);
            }
            this.loaderService.hide();
          },
          (err) => {
            this.showErrorSnackbar(err);
            this.loaderService.hide();
          },
        );
    } else if (this.pageQuery === 'view') {
      this.rokuService
        .updateSku(this.moduleID, this.getFormData())
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          async (res) => {
            this.showResponseSnackbar(res);
            await this.getSkuById();
            this.loaderService.hide();
          },
          (err) => {
            this.showErrorSnackbar(err);
            this.loaderService.hide();
          },
        );
    }
  }

  async updateRegion() {
    try {
      if (
        this.importedModuleData.usedInLiveOnProdSelectorConfig ||
        this.importedModuleData.usedInLiveOnProdCampaign
      ) {
        const action = {
          message:
            'This Sku module is used in Live module, that is deployed on PROD, thus you need to enter the password to update it, ' +
            'after update it will be published automatically. ' +
            `${PROCEED_MESSAGE}UPDATE REGION?`,
          action: 'update',
          env: 'prod',
        };
        this.openActionDialog(action).subscribe(() => {
          this.loaderService.show();
          this.rokuService
            .updateRegionInSku(
              this.moduleID,
              this.rokuFormsUtils.getModifiedSelectedRegionData(
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
                this.showResponseSnackbar(res);
                await this.getSkuById();
              },
              (err) => {
                this.showErrorSnackbar(err);
              },
            );
        });
      } else {
        this.rokuService
          .updateRegionInSku(
            this.moduleID,
            this.rokuFormsUtils.getModifiedSelectedRegionData(
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
              this.showResponseSnackbar(res);
              await this.getSkuById();
            },
            (err) => {
              this.showErrorSnackbar(err);
            },
          );
      }
    } catch (err) {
      this.showErrorSnackbar(err);
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

  getFormData() {
    const formData: any = {
      countries: {},
      createdBy: null,
      storeSkuId: this.formGroup.value.storeSkuId,
      name: this.formGroup.value.skuName,
      linkId: this.formGroup.value.linkId,
    };
    const usernameFromLocalStorage = localStorage.getItem('username');
    if (!!usernameFromLocalStorage) {
      formData.createdBy = usernameFromLocalStorage;
    }

    const activeRegionsLanguagesBinding = this.regionsLanguagesBinding.filter(
      (region) => region.active,
    );
    this.rokuFormsUtils.makeFormDataKeys(
      formData.countries,
      activeRegionsLanguagesBinding,
    );

    if (
      !!activeRegionsLanguagesBinding &&
      !!activeRegionsLanguagesBinding.length
    ) {
      this.rokuFormsUtils.modifiedFillFormData(
        this.regionNonTranslatableFields,
        this.regionTranslatableFields,
        formData.countries,
        this.formGroup.controls.regionsFormGroup as FormGroup,
        activeRegionsLanguagesBinding,
        'status',
      );
    }

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
        action: 'rokuSave',
      };
      this.openActionDialog(action).subscribe((res) => {
        switch (res) {
          case 'save':
            this.subject.next(false);
            this.rokuFormsUtils.setProperHistory('sku', this.router);
            this.loaderService.show();
            this.saveModule();
            break;
          case 'leave':
            this.ignoreDialog = true;
            this.subject.next(true);
            this.rokuFormsUtils.navigateBack('sku');
            break;
          case 'cancel':
            this.subject.next(false);
            this.rokuFormsUtils.setProperHistory('sku', this.router);
            break;
        }
      });
    } else {
      this.rokuFormsUtils.navigateBack('sku');
    }
  }

  async getSkuById() {
    const res = await this.rokuService.getSku(this.moduleID).toPromise();
    this.importedModuleData = res.data;

    this.formGroup.controls.storeSkuId.setValidators([
      Validators.required,
      identityCheckValidator(
        this.allEnvSkuModules,
        'storeSkuId',
        this.importedModuleData.storeSkuId,
        this.pageQuery,
      ),
    ]);

    this.formGroup.controls.linkId.setValidators([
      identityCheckValidator(
        this.allEnvSkuModules,
        'linkId',
        this.importedModuleData.linkId,
        this.pageQuery,
      ),
    ]);
  }

  showResponseSnackbar(res: any) {
    this.snackbarService.show(
      res.message,
      'OK',
      `/roku/sku/view/${!!this.moduleID ? this.moduleID : res.data.skuId}`,
      this.router,
      5000,
    );
  }

  showErrorSnackbar(err: any) {
    this.snackbarService.show(
      `${err.message}`,
      'ERROR',
      `/roku/sku`,
      this.router,
      10000,
    );
  }

  toggleRegionState(index: number) {
    this.regionsLanguagesBinding[index].active = !this.regionsLanguagesBinding[
      index
    ].active;
    this.formGroup.markAsDirty();
  }

  checkInputText(region, language, formControlName) {
    const regionFormGroup = (this.formGroup.controls
      .regionsFormGroup as FormGroup).controls[region.code] as FormGroup;
    let formControl;
    if (!!language) {
      formControl = (regionFormGroup.controls[language.code] as FormGroup)
        .controls[formControlName];
    } else {
      formControl = regionFormGroup.controls[formControlName];
    }
    if (!!formControl && !!formControl.value) {
      const newValue = formControl.value.replace(/(?:\\n)/g, '\n');
      if (newValue !== formControl.value) {
        formControl.setValue(newValue, { emitEvent: false });
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loaderService.hide();
  }
}
