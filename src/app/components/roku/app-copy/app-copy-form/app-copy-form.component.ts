import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { RokuService } from '../../../../service/roku.service';
import { forkJoin, Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ConfigurationService } from '../../../../service/configuration.service';
import { LoaderService } from '../../../../service/loader.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../base/base.component';
import { PROCEED_MESSAGE } from '../../../../constants';
import { RokuFormsUtils } from '../../../../utils/roku-forms.utils';
import { identityCheckValidator } from '../../../../validators/identity-check-validator';
import { ModuleStatus } from '../../../../types/rokuEnum';
import { SnackbarService } from '../../../../service/snackbar.service';

@Component({
  selector: 'app-copy-form',
  templateUrl: './app-copy-form.component.html',
  styleUrls: ['./app-copy-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RokuAppCopyFormComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public tvFields = [];
  public regionsLanguagesBinding: any[] = [];
  public formGroup: FormGroup;
  public selectedTab = new FormControl(1);
  public tvPositionArray: boolean[] = [];
  public tvRegionPosition = 0;
  public pageQuery = 'create';
  public importedModuleData: any = {
    status: 'null',
  };
  public status = {
    DEFAULT: 'default',
    RED: 'incomplete',
    DUPLICATE: 'duplicate',
    UNSAVED: 'unsaved',
    SAVED: 'saved',
    PUBLISHED: 'published',
  } as const;
  public showImgSpinner = false;
  public tvImgSpinnerPosition;
  public tvFieldFocused = false;
  public tvImgCanBeLoaded = true;
  public isFormVisible: boolean = false;
  public tvNonTranslatableFields: any[] = [];
  public tvTranslatableFields: any[] = [];
  public platforms: string[] = ['mobile', 'tv'];

  @ViewChild('tvImgContainer')
  private tvImgContainer: ElementRef;
  private destroy$ = new Subject<void>();
  private tvImportedData;
  private selectedTvRegion;
  private defaultAppCopy;
  private allAppCopyNames = new Set<string>();
  private moduleID: number;
  private isCreateMode: boolean;
  private subject = new Subject<boolean>();
  private ignoreDialog = false;
  private allEnvAppCopyModules: any;
  private allAppCopyModules: any;
  private currentEnv: any;
  private currentStore: any;
  private currentProduct: any;

  constructor(
    public loaderService: LoaderService,
    public router: Router,
    public dialog: MatDialog,
    private rokuService: RokuService,
    private configurationService: ConfigurationService,
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private rokuFormsUtils: RokuFormsUtils,
    private snackbarService: SnackbarService,
  ) {
    super(dialog, loaderService, router);
    this.formGroup = this.formBuilder.group({});
  }

  ngOnInit(): void {
    this.currentStore = this.rokuService.getStore();
    this.currentProduct = this.rokuService.getProduct();
    this.currentEnv = this.rokuService.getEnv();

    this.loaderService.show();
    forkJoin([
      this.rokuService.getAllAppCopies(),
      this.rokuService.getAppCopyFields(
        this.currentStore.code,
        this.platforms[1],
        this.currentProduct.code,
      ),
      this.rokuService.getRegionsLanguages(
        this.currentStore.code,
        this.currentProduct.code,
      ),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArray) => {
        const [allAppCopies, tvRes, regionsRes] = resultArray;
        if (!!allAppCopies.data && !!allAppCopies.data.length) {
          this.allEnvAppCopyModules = allAppCopies.data.filter((el) => {
            return (
              el.envId === this.currentEnv.envId &&
              el.productId === this.currentProduct.productId &&
              el.storeId === this.currentStore.storeId
            );
          });
          this.allAppCopyModules = allAppCopies.data.filter((el) => {
            return (
              el.productId === this.currentProduct.productId &&
              el.storeId === this.currentStore.storeId
            );
          });
        }
        this.formGroup = this.formBuilder.group({
          appCopyName: [
            null,
            [
              Validators.required,
              identityCheckValidator(this.allEnvAppCopyModules, 'name'),
            ],
          ],
          tvFormGroup: this.formBuilder.group({}),
        });
        this.getAppCopyFormFields(tvRes);
        this.getRegionsLanguagesBinding(regionsRes);
      });
  }

  setTvImgSpinnerPosition(): void {
    if (this.selectedTab.value === 1) {
      if (this.tvImgContainer) {
        this.tvImgSpinnerPosition =
          this.tvImgContainer.nativeElement.offsetWidth / 2 - 50 + 'px';
      }
    }
  }


  isFieldValuePresent(field, region, language, selectedTab, type){
    let formGroup;
    if (selectedTab === 1) {
      formGroup = this.formGroup.controls.tvFormGroup;
    }
    let formValue = formGroup.value[
      region.code
    ][language.code][field.fieldName];
    
    if (type === 'string'){
      return formValue?.length;
    }else {
      return formValue?.toString().replace(/\s/g, '').length;
    }
  }

  isRequiredFieldEmpty(field, region): boolean {
    if (!field.required) {
      return false;
    }
    if (this.selectedTab.value !== 1) {
      return true;
    }
    return !region.languages.every((language) => {
      if (this.isFieldValuePresent(field, region, language, this.selectedTab.value, field.dataType)) {
        return true;
      } else {
        return false;
      }
    });
  }

  doesRegionHaveOneLanguage(region): boolean {
    return region.languages.length === 1;
  }

  getAppCopyFormFields(tvRes) {
    this.tvFields = tvRes.data;
    this.tvFields.forEach((field: any) => {
      if (!!field.translatable) {
        this.tvTranslatableFields.push(field);
      } else {
        this.tvNonTranslatableFields.push(field);
      }
    });
    this.tvTranslatableFields.sort((a, b) => Number(a.order) - Number(b.order));
    this.tvNonTranslatableFields.sort(
      (a, b) => Number(a.order) - Number(b.order),
    );
  }

  getRegionsLanguagesBinding(res) {
    this.regionsLanguagesBinding = Object.values(res.data).map(
      (region: any) => {
        const languages: any[] = Object.values(region.languages).map(
          (language: any) => {
            return { code: language.code, name: language.name };
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
    this.rokuFormsUtils.setFormGroup(
      this.formGroup.controls.tvFormGroup as FormGroup,
      this.tvTranslatableFields,
      this.regionsLanguagesBinding,
    );

    this.editRegionsFormGroup();

    this.rokuFormsUtils.fillRegionPositionArray(
      this.regionsLanguagesBinding,
      this.tvPositionArray,
    );

    this.selectedTvRegion = this.regionsLanguagesBinding[this.tvRegionPosition];

    this.pageQuery =
      this.activatedRoute.snapshot.paramMap['params']['action'] ?? 'create';
    this.moduleID =
      Number(this.activatedRoute.snapshot.paramMap['params']['id']) ?? null;
    this.isCreateMode = this.activatedRoute.snapshot.queryParams['create'];

    if (this.moduleID) {
      const foundModule = this.allAppCopyModules.find(
        (module) => module.appCopyId === this.moduleID,
      );
      this.importedModuleData = foundModule;
      this.tvImportedData = foundModule.platforms.tv;

      this.formGroup.controls.appCopyName.setValidators([
        Validators.required,
        identityCheckValidator(
          this.allEnvAppCopyModules,
          'name',
          this.importedModuleData.name,
          this.pageQuery,
        ),
      ]);
      this.isFormVisible = true;
      this.setDefaultAppCopy();
    } else {
      this.isFormVisible = true;
      this.setTvImgSpinnerPosition();
      this.loaderService.hide();
    }
  }

  getPlanSelectorValue(region): boolean {
    let flag;
    if (this.selectedTab.value === 1) {
      flag = this.formGroup.controls.tvFormGroup.value[region.code][
        region.languages[0].code
      ].showPurchaseTermSelector;
    }

    return flag;
  }

  changePlanSelectorValue(event, index: number) {
    if (this.selectedTab.value === 1) {
      this.selectedTvRegion.languages.forEach((language) => {
        const fieldControl = this.formGroup.controls.tvFormGroup.get([
          this.selectedTvRegion.code,
          language.code,
          'showPurchaseTermSelector',
        ]);
        if (!!fieldControl) {
          fieldControl.setValue(event.target.checked);
          fieldControl.markAsDirty();
        }
      });
    }
    this.changeModuleRegionStatus(index);
  }

  setDefaultAppCopy(): void {
    this.allEnvAppCopyModules.forEach((elem) => {
      this.allAppCopyNames.add(elem.name);
    });

    const defaultAppCopy = this.allEnvAppCopyModules.find((el) => {
      return el.isDefault === true;
    });

    if (defaultAppCopy) {
      this.defaultAppCopy = defaultAppCopy;
      this.fillTable(this.importedModuleData, this.pageQuery);
    }
    this.loaderService.hide();
    this.setTvImgSpinnerPosition();
  }

  editRegionsFormGroup(): void {
    this.regionsLanguagesBinding.forEach((region) => {
      const tvRegionFormGroup = (this.formGroup.controls
        .tvFormGroup as FormGroup).controls[region.code] as FormGroup;
      this.tvNonTranslatableFields.forEach((field) => {
        tvRegionFormGroup.addControl(field.fieldName, new FormControl());
      });
      ((this.formGroup.controls.tvFormGroup as FormGroup).controls[
        region.code
      ] as FormGroup).addControl('img', new FormControl());
    });
  }

  getBooleanNonTranslatableField(platform: string, isBoolean: boolean) {
    switch (platform) {
      case this.platforms[1]:
        return this.tvNonTranslatableFields.filter((field) =>
          !!isBoolean
            ? field.dataType === 'boolean'
            : field.dataType !== 'boolean',
        );
    }
  }

  getRegionFieldValue(platform: string, region, fieldName: string): string {
    switch (platform) {
      case this.platforms[1]:
        const tvFieldValue = this.formGroup.value.tvFormGroup[region.code][
          region.languages[0].code
        ][fieldName] as string;
        return tvFieldValue ?? '';
      default:
        return '';
    }
  }

  fieldFocus(region, imgUrl: string): void {
    switch (this.selectedTab.value) {
      case 1:
        if (
          this.formGroup.controls.tvFormGroup.value[region.code].img !== imgUrl
        ) {
          this.showImgSpinner = true;
          this.tvImgCanBeLoaded = true;
          ((this.formGroup.controls.tvFormGroup as FormGroup).controls[
            region.code
          ] as FormGroup).controls.img.setValue(imgUrl);
        }
        break;
    }
  }

  getModuleName(data, pageQuery: string): string {
    if (pageQuery === 'duplicate') {
      let newName: string = data.name;
      let nameIndex = 1;
      while (this.allAppCopyNames.has(newName)) {
        if (newName.startsWith('COPY')) {
          nameIndex++;
        }
        newName = this.getNewName(newName, nameIndex);
      }
      return newName;
    } else {
      return data.name;
    }
  }

  fillTable(data, pageQuery: string, action?: string): void {
    if (action !== 'clear' && !this.isCreateMode) {
      this.formGroup.controls.appCopyName.setValue(
        this.getModuleName(data, pageQuery),
      );
    }
    if (!!Object.values(data.platforms).length) {
      const tvImportedData = data.platforms.tv;
      this.regionsLanguagesBinding.forEach((region) => {
        const foundRegionCode: string =
          Object.keys(tvImportedData).find(
            (regionCode) => regionCode === region.code,
          ) || '';
        if (!!foundRegionCode) {
          region.status = tvImportedData[foundRegionCode].status;
          region.active = true;
        }
      });

      this.selectedTab.setValue(1);
      this.rokuFormsUtils.modifiedFillModule(
        tvImportedData,
        this.formGroup.controls.tvFormGroup as FormGroup,
        this.tvNonTranslatableFields,
        this.tvTranslatableFields,
        'status',
        this.regionsLanguagesBinding,
        'app-copy',
        this.defaultAppCopy.platforms.tv,
        action,
      );
    } else {
      this.selectedTab.setValue(1);
      const defaultTv =
        !!this.defaultAppCopy &&
        !!this.defaultAppCopy.platforms &&
        !!this.defaultAppCopy.platforms.tv
          ? this.defaultAppCopy.platforms.tv
          : {};
      this.rokuFormsUtils.modifiedFillModule(
        {},
        this.formGroup.controls.tvFormGroup as FormGroup,
        this.tvNonTranslatableFields,
        this.tvTranslatableFields,
        'status',
        this.regionsLanguagesBinding,
        'app-copy',
        defaultTv,
        action,
      );
    }
  }

  getNewName(name: string, index: number): string {
    let newName: string;
    if (name.startsWith('COPY')) {
      const boldName = name.substring(name.indexOf(' - ') + 3);
      newName = `COPY ${index} - ${boldName}`;
      return newName;
    } else {
      newName = `COPY - ${name}`;
      return newName;
    }
  }

  isSaveButtonDisabled(): boolean {
    return (
      (this.isSaveAllButtonDisabled() && this.isUpdateRegionButtonDisabled()) ||
      this.rokuFormsUtils.modifiedIsModuleEmpty(
        this.regionsLanguagesBinding,
        this.formGroup.controls.tvFormGroup as FormGroup,
        this.tvNonTranslatableFields,
        this.tvTranslatableFields,
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
      ((this.formGroup.controls.tvFormGroup as FormGroup).controls[
        this.selectedTvRegion.code
      ] as FormGroup).invalid ||
      ((this.formGroup.controls.tvFormGroup as FormGroup).controls[
        this.selectedTvRegion.code
      ] as FormGroup).pristine ||
      this.rokuFormsUtils.isRegionEmpty(
        this.selectedTvRegion,
        this.formGroup.controls.tvFormGroup as FormGroup,
        this.tvFields,
      )
    );
  }

  getClassArray(region, index: number): string[] {
    const regionStatus = region.active ? region.status : this.status.DEFAULT;
    const classArray: string[] = [];
    if (this.selectedTab.value === 1) {
      classArray.push(regionStatus);
      if (this.tvPositionArray[index]) {
        classArray.push('selected-region');
      }
    }
    return classArray;
  }

  isClearALLButtonDisabled(): boolean {
    if (this.regionsLanguagesBinding.length && this.defaultAppCopy) {
      return this.rokuFormsUtils.isModuleDataDefault(
        this.regionsLanguagesBinding,
        this.defaultAppCopy.platforms.tv,
        this.formGroup.controls.tvFormGroup as FormGroup,
        this.tvFields,
      );
    }

    return true;
  }

  isClearRegionButtonDisabled(): boolean {
    if (this.regionsLanguagesBinding.length && this.defaultAppCopy) {
      if (this.selectedTab.value === 1) {
        return this.rokuFormsUtils.isRegionDefault(
          this.selectedTvRegion,
          this.defaultAppCopy.platforms.tv,
          this.formGroup.controls.tvFormGroup as FormGroup,
          this.tvFields,
        );
      }
    }

    return true;
  }

  getPackageNameErrorMessage(): string {
    if (this.formGroup.controls.appCopyName.hasError('required')) {
      return 'Please enter App Copy Name';
    } else if (
      this.formGroup.controls.appCopyName.hasError('fieldValueIsNotUnique')
    ) {
      return 'This App Copy Name already exists';
    } else {
      return '';
    }
  }

  regionButtonClick(index: number): void {
    if (this.selectedTab.value === 1) {
      this.tvRegionPosition = index;
      this.tvPositionArray = this.tvPositionArray.map(() => false);
      this.tvPositionArray[index] = true;
      this.selectedTvRegion = this.regionsLanguagesBinding[
        this.tvRegionPosition
      ];
    }
  }

  copyFields(regionCode: string, language: string): void {
    let rokuAppCopyFormCopyObj = {};
    if (this.selectedTab.value === 1) {
      this.rokuFormsUtils.copyFields(
        rokuAppCopyFormCopyObj,
        this.tvTranslatableFields,
        this.formGroup.controls.tvFormGroup as FormGroup,
        regionCode,
        language,
      );
    }
    localStorage.setItem(
      'rokuAppCopyFormCopy',
      JSON.stringify(rokuAppCopyFormCopyObj),
    );
  }

  pasteFields(regionCode: string, language: string, index: number): void {
    const rokuAppCopyFormCopyObj = JSON.parse(
      localStorage.getItem('rokuAppCopyFormCopy') as string,
    );
    if (this.selectedTab.value === 1) {
      this.rokuFormsUtils.pasteFields(
        this.regionsLanguagesBinding,
        rokuAppCopyFormCopyObj,
        this.tvTranslatableFields,
        this.formGroup.controls.tvFormGroup as FormGroup,
        index,
        regionCode,
        language,
        'status',
      );
    }
  }

  changeModuleRegionStatus(index: number) {
    if (this.selectedTab.value === 1) {
      this.rokuFormsUtils.modifiedChangeRegionStatus(
        index,
        this.formGroup.controls.tvFormGroup as FormGroup,
        this.tvNonTranslatableFields,
        this.tvTranslatableFields,
        'tvStatus',
        this.regionsLanguagesBinding,
      );
    }
  }

  noMissingRequiredFields(): boolean {
    return this.regionsLanguagesBinding.every((region: any) => {
      return region.status !== this.status.RED;
    });
  }

  getAppCopyFormData() {
    const formData: any = {
      name: this.formGroup.controls.appCopyName.value,
      createdBy: null,
      platforms: {
        tv: {},
      },
    };
    if (!!localStorage.getItem('username')) {
      formData.createdBy = localStorage.getItem('username');
    }

    const activeRegionsLanguagesBinding = this.regionsLanguagesBinding.filter(
      (region) => region.active,
    );
    this.rokuFormsUtils.makeFormDataKeys(
      formData.platforms.tv,
      activeRegionsLanguagesBinding,
    );

    this.rokuFormsUtils.modifiedFillFormData(
      this.tvNonTranslatableFields,
      this.tvTranslatableFields,
      formData.platforms.tv,
      this.formGroup.controls.tvFormGroup as FormGroup,
      this.regionsLanguagesBinding,
      'tvStatus',
      this.importedModuleData,
      this.pageQuery,
    );

    if (Object.keys(formData.platforms.tv).length < 1) {
      delete formData.platforms.tv;
    }

    return formData;
  }

  saveAll(): void {
    try {
      this.loaderService.show();
      this.saveModule();
    } catch (err) {
      this.showErrorSnackbar(err);
    }
  }

  async saveModule() {
    if (this.pageQuery === 'create' || this.pageQuery === 'duplicate') {
      this.rokuService
        .saveAppCopy(
          this.rokuService.getStore().code,
          this.rokuService.getProduct().code,
          this.getAppCopyFormData(),
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (res) => {
          this.moduleID = res.data.appCopyId;
          this.pageQuery = 'view';
          await this.getAppCopyById();
          this.formGroup.markAsPristine();

          if (JSON.parse(localStorage.getItem('campaign') as string)) {
            this.rokuFormsUtils.editCampaignObjectInLocalStorage(
              'appCopyId',
              this.moduleID,
            );
            this.router.navigate(['roku/campaigns/create']);
          } else {
            this.showResponseSnackbar(res);
            this.loaderService.hide();
          }
        });
    } else if (this.pageQuery === 'view') {
      this.rokuService
        .updateAppCopy(this.moduleID, this.getAppCopyFormData())
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (res) => {
          await this.getAppCopyById();
          this.formGroup.markAsPristine();
          this.showResponseSnackbar(res);
          this.loaderService.hide();
        });
    }
  }

  async updateRegion() {
    try {
      this.loaderService.show();
      if (this.selectedTab.value === 1) {
        this.rokuService
          .updateRegionInAppCopy(
            this.platforms[1],
            this.selectedTvRegion.code,
            this.moduleID,
            this.rokuFormsUtils.getModifiedSelectedRegionData(
              this.tvNonTranslatableFields,
              this.tvTranslatableFields,
              this.formGroup.controls.tvFormGroup as FormGroup,
              this.selectedTvRegion,
              'status',
              this.importedModuleData,
            ),
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe(async (res) => {
            await this.getAppCopyById();
            (this.formGroup.controls.tvFormGroup as FormGroup).controls[
              this.selectedTvRegion.code
            ].markAsPristine();
            this.showResponseSnackbar(res);
            this.loaderService.hide();
          });
      } else {
        this.loaderService.hide();
      }
    } catch (err) {
      this.showErrorSnackbar(err);
    }
  }

  clearAll(): void {
    const action = {
      message: PROCEED_MESSAGE + 'CLEAR ALL?',
      action: 'prompt',
    };

    this.openActionDialog(action).subscribe(() => {
      this.formGroup.markAsDirty();
      this.fillTable(this.defaultAppCopy, this.pageQuery, 'clear');
    });
  }

  clearRegion(): void {
    const action = {
      message:
        PROCEED_MESSAGE +
        'CLEAR? All data linked with selected region will be lost.',
      action: 'prompt',
    };
    this.openActionDialog(action).subscribe(() => {
      if (this.selectedTab.value === 1) {
        this.rokuFormsUtils.fillRegion(
          this.selectedTvRegion,
          this.tvFields,
          this.formGroup.controls.tvFormGroup as FormGroup,
          'status',
          this.defaultAppCopy.platforms.tv,
          this.regionsLanguagesBinding,
          this.tvRegionPosition,
        );
        (this.formGroup.controls.tvFormGroup as FormGroup).controls[
          this.selectedTvRegion.code
        ].markAsDirty();
      }
    });
  }

  noUnsavedOrRedRegions(): boolean {
    return this.regionsLanguagesBinding.every((region: any) => {
      return (
        region.status !== this.status.UNSAVED &&
        region.status !== this.status.RED
      );
    });
  }

  noUnsavedRegions(): boolean {
    return this.regionsLanguagesBinding.every((region: any) => {
      return region.status !== this.status.UNSAVED;
    });
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

  async getAppCopyById() {
    const res = await this.rokuService.getAppCopy(this.moduleID).toPromise();
    this.importedModuleData = res.data;
    this.formGroup.controls.appCopyName.setValidators([
      Validators.required,
      identityCheckValidator(
        this.allEnvAppCopyModules,
        'name',
        this.importedModuleData.name,
        this.pageQuery,
      ),
    ]);

    if (this.importedModuleData.isDefault) {
      this.defaultAppCopy = this.importedModuleData;
    }
  }

  canNotNavigateBack(): boolean {
    if (this.ignoreDialog) {
      return false;
    } else {
      return (
        !this.noUnsavedRegions() && this.formGroup.controls.appCopyName.valid
      );
    }
  }

  navigateBack(): void {
    if (!this.noUnsavedRegions() && this.formGroup.controls.appCopyName.valid) {
      const action = {
        message:
          'There are unsaved changes that will be lost. Do you wish to save changes?',
        action: 'rokuSave',
      };
      this.openActionDialog(action).subscribe((res) => {
        switch (res) {
          case 'save':
            this.subject.next(false);
            this.rokuFormsUtils.setProperHistory('app-copy', this.router);
            this.saveAll();
            break;
          case 'leave':
            this.ignoreDialog = true;
            this.subject.next(true);
            this.rokuFormsUtils.navigateBack('app-copy');
            break;
          case 'cancel':
            this.subject.next(false);
            this.rokuFormsUtils.setProperHistory('app-copy', this.router);
            break;
        }
      });
    } else {
      this.rokuFormsUtils.navigateBack('app-copy');
    }
  }

  toggleRegionState(index: number) {
    this.regionsLanguagesBinding[index].active = !this.regionsLanguagesBinding[
      index
    ].active;
    this.formGroup.markAsDirty();
  }

  showResponseSnackbar(res: any) {
    this.snackbarService.show(
      res.message,
      'OK',
      `/roku/app-copy/view/${
        !!this.moduleID ? this.moduleID : res.data.appCopyId
      }`,
      this.router,
      5000,
    );
  }

  showErrorSnackbar(err: any) {
    this.snackbarService.show(
      `${err.message}`,
      'ERROR',
      `/roku/app-copy`,
      this.router,
      10000,
    );
  }

  checkInputText(region, language, formControlName) {
    const regionFormGroup = (this.formGroup.controls.tvFormGroup as FormGroup)
      .controls[region.code] as FormGroup;
    let formControl;
    if (!!language) {
      formControl = (regionFormGroup?.controls[language.code] as FormGroup)
        ?.controls[formControlName];
    } else {
      formControl = regionFormGroup?.controls[formControlName];
    }
    const newValue = formControl?.value.replace(/(?:\\n)/g, '\n');
    if (newValue !== formControl?.value) {
      formControl?.setValue(newValue, { emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loaderService.hide();
  }
}
