import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { AndroidService } from '../../../../service/android.service';
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
import { AndroidFormsService } from '../../../../service/android-forms.service';
import { identityCheckValidator } from '../../../../validators/identity-check-validator';
import { ModuleStatus } from '../../../../types/androidEnum';

@Component({
  selector: 'app-copy-form',
  templateUrl: './app-copy-form.component.html',
  styleUrls: ['./app-copy-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AndroidAppCopyFormComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  @ViewChild('mobileImgContainer')
  private mobileImgContainer: ElementRef;
  @ViewChild('tvImgContainer')
  private tvImgContainer: ElementRef;

  public formGroup: FormGroup;
  public mobileFields = [];
  public tvFields = [];
  public regionsLanguagesBinding: any[] = [];
  public selectedTab = new FormControl(0);
  public mobilePositionArray: boolean[] = [];
  public tvPositionArray: boolean[] = [];
  public mobileRegionPosition = 0;
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
  public mobileImgSpinnerPosition;
  public tvImgSpinnerPosition;
  public isFormFocused = false;
  public mobileImgCanBeLoaded = true;
  public tvImgCanBeLoaded = true;
  public mobileNonTranslatableFields: any[] = [];
  public mobileTranslatableFields: any[] = [];
  public tvNonTranslatableFields: any[] = [];
  public tvTranslatableFields: any[] = [];
  public isFormVisible: boolean = false;
  public platforms: string[] = ['mobile', 'tv'];

  private destroy$ = new Subject<void>();
  private selectedMobileRegion;
  private selectedTvRegion;
  private defaultAppCopy;
  private allAppCopyNames = new Set<string>();
  private moduleID: number;
  private isCreateMode: boolean;
  private subject = new Subject<boolean>();
  private ignoreDialog = false;
  private currentEnv: any;
  private currentStore: any;
  private currentProduct: any;
  private allEnvAppCopyModules: any;
  private allAppCopyModules: any;
  private currentEnvAllAppCopyModules: any;

  constructor(
    public loaderService: LoaderService,
    public router: Router,
    public dialog: MatDialog,
    private androidService: AndroidService,
    private configurationService: ConfigurationService,
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private androidFormsService: AndroidFormsService,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.currentStore = this.androidService.getStore();
    this.currentProduct = this.androidService.getProduct();
    this.currentEnv = this.androidService.getEnv();

    this.loaderService.show();

    forkJoin([
      this.androidService.getAllAppCopies(),
      this.androidService.getAppCopyFields(
        this.currentStore.code,
        this.platforms[0],
        this.currentProduct.code,
      ),
      this.androidService.getAppCopyFields(
        this.currentStore.code,
        this.platforms[1],
        this.currentProduct.code,
      ),
      this.androidService.getRegionsLanguages(
        this.currentStore.code,
        this.currentProduct.code,
      ),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArray) => {
        const [allAppCopiesRes, mobileRes, tvRes, regionsRes] = resultArray;
        if (!!allAppCopiesRes.data && !!allAppCopiesRes.data.length) {
          this.allEnvAppCopyModules = allAppCopiesRes.data.filter((el) => {
            return (
              el.envId === this.currentEnv.envId &&
              el.productId === this.currentProduct.productId &&
              el.storeId === this.currentStore.storeId
            );
          });
          this.allAppCopyModules = allAppCopiesRes.data.filter((el) => {
            return (
              el.productId === this.currentProduct.productId &&
              el.storeId === this.currentStore.storeId
            );
          });
          this.currentEnvAllAppCopyModules = allAppCopiesRes.data.filter(
            (el) => {
              return (
                el.envId === this.currentEnv.envId &&
                el.productId === this.currentProduct.productId &&
                el.storeId === this.currentStore.storeId
              );
            },
          );
        }

        this.formGroup = this.formBuilder.group({
          mobileFormGroup: this.formBuilder.group({}),
          tvFormGroup: this.formBuilder.group({}),
          appCopyName: [
            null,
            [
              Validators.required,
              identityCheckValidator(this.allEnvAppCopyModules, 'name'),
            ],
          ],
        });

        this.getAppCopyFormFields(mobileRes, tvRes);
        this.getRegionsLanguagesBinding(regionsRes);
      });
  }

  setTemplateElementsPositions(): void {
    if (this.mobileImgContainer) {
      this.mobileImgSpinnerPosition =
        this.mobileImgContainer.nativeElement.offsetWidth / 2 - 50 + 'px';
    }
    if (this.tvImgContainer) {
      this.tvImgSpinnerPosition =
        this.tvImgContainer.nativeElement.offsetWidth / 2 - 50 + 'px';
    }
  }

  isFieldValuePresent(field, region, selectedTab, language, type) {
    let formGroup;
    if (selectedTab === 0) {
      formGroup = this.formGroup.controls.mobileFormGroup;
    } else if (selectedTab === 1) {
      formGroup = this.formGroup.controls.tvFormGroup;
    }
    let formValue =
      formGroup.value[region.code][language.code][field.fieldName];

    if (type === 'string') {
      return formValue?.length;
    } else {
      return formValue?.toString().replace(/\s/g, '').length;
    }
  }

  isRequiredFieldEmpty(field, region): boolean {
    if (!field.required) {
      return false;
    }
    if (this.selectedTab.value !== 0 && this.selectedTab.value !== 1) {
      return false;
    }
    return !region.languages.every((language) => {
      if (
        this.isFieldValuePresent(
          field,
          region,
          this.selectedTab.value,
          language,
          field.dataType,
        )
      ) {
        return true;
      } else {
        return false;
      }
    });
  }

  doesRegionHaveOneLanguage(region): boolean {
    return region.languages.length === 1;
  }

  getAppCopyFormFields(mobileRes, tvRes) {
    this.mobileFields = mobileRes.data;
    this.mobileFields.forEach((field: any) => {
      if (!!field.translatable) {
        this.mobileTranslatableFields.push(field);
      } else {
        this.mobileNonTranslatableFields.push(field);
      }
    });
    this.tvFields = tvRes.data;
    this.tvFields.forEach((field: any) => {
      if (!!field.translatable) {
        this.tvTranslatableFields.push(field);
      } else {
        this.tvNonTranslatableFields.push(field);
      }
    });
    this.mobileTranslatableFields.sort(
      (a, b) => Number(a.order) - Number(b.order),
    );
    this.mobileNonTranslatableFields.sort(
      (a, b) => Number(a.order) - Number(b.order),
    );
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
          code: region.code,
          mobileStatus: this.status.RED,
          tvStatus: this.status.RED,
          name: region.name,
          languages,
        };
      },
    );

    this.androidFormsService.setFormGroup(
      this.formGroup.controls.mobileFormGroup as FormGroup,
      this.mobileTranslatableFields,
      this.regionsLanguagesBinding,
    );
    this.androidFormsService.setFormGroup(
      this.formGroup.controls.tvFormGroup as FormGroup,
      this.tvTranslatableFields,
      this.regionsLanguagesBinding,
    );

    this.editRegionsFormGroup();

    this.androidFormsService.fillRegionPositionArray(
      this.regionsLanguagesBinding,
      this.mobilePositionArray,
    );

    this.androidFormsService.fillRegionPositionArray(
      this.regionsLanguagesBinding,
      this.tvPositionArray,
    );

    this.selectedMobileRegion = this.regionsLanguagesBinding[
      this.mobileRegionPosition
    ];
    this.selectedTvRegion = this.regionsLanguagesBinding[this.tvRegionPosition];

    this.pageQuery =
      this.activatedRoute.snapshot.paramMap['params']['action'] ?? 'create';
    this.moduleID =
      Number(this.activatedRoute.snapshot.paramMap['params']['id']) ?? null;
    this.isCreateMode = this.activatedRoute.snapshot.queryParams['create'];

    if (!!this.moduleID) {
      const foundModule = this.allAppCopyModules.find(
        (module) => module.appCopyId === this.moduleID,
      );
      if (!!foundModule) {
        this.importedModuleData = foundModule;

        this.formGroup.controls.appCopyName.setValidators([
          Validators.required,
          identityCheckValidator(
            this.allEnvAppCopyModules,
            'name',
            this.importedModuleData.name,
            this.pageQuery,
          ),
        ]);
        this.getDefaultAppCopy();
      }
    }
    this.isFormVisible = true;
    this.setTemplateElementsPositions();
    this.loaderService.hide();
  }

  getPlanSelectorValue(region): boolean {
    let flag;
    if (this.selectedTab.value === 0) {
      flag = this.formGroup.controls.mobileFormGroup.value[region.code][
        region.languages[0].code
      ].showPurchaseTermSelector;
    } else if (this.selectedTab.value === 1) {
      flag = this.formGroup.controls.tvFormGroup.value[region.code][
        region.languages[0].code
      ].showPurchaseTermSelector;
    }

    return flag;
  }

  getDefaultAppCopy(): void {
    this.allEnvAppCopyModules.forEach((elem) => {
      this.allAppCopyNames.add(elem.name);
    });

    const defaultAppCopy = this.allEnvAppCopyModules.find((el) => {
      return el.isDefault === true;
    });

    if (!!defaultAppCopy) {
      this.defaultAppCopy = defaultAppCopy;
      this.fillTable(this.importedModuleData, this.pageQuery);
    }
  }

  editRegionsFormGroup(): void {
    this.regionsLanguagesBinding.forEach((region) => {
      const mobileRegionFormGroup = (this.formGroup.controls
        .mobileFormGroup as FormGroup).controls[region.code] as FormGroup;
      this.mobileNonTranslatableFields.forEach((field) => {
        mobileRegionFormGroup.addControl(field.fieldName, new FormControl());
      });
      ((this.formGroup.controls.mobileFormGroup as FormGroup).controls[
        region.code
      ] as FormGroup).addControl('img', new FormControl());
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

  fillTable(data, pageQuery: string, action?: string): void {
    const mobileImportedData = data.platforms.mobile;
    const tvImportedData = data.platforms.tv;

    if (action !== 'clear' && !this.isCreateMode) {
      if (pageQuery === 'duplicate') {
        let newName: string = data.name;
        let nameIndex = 1;
        while (this.allAppCopyNames.has(newName)) {
          if (newName.startsWith('COPY')) {
            nameIndex++;
          }
          newName = this.getNewName(newName, nameIndex);
        }
        this.formGroup.controls.appCopyName.setValue(newName);
      } else {
        this.formGroup.controls.appCopyName.setValue(data.name);
      }
    }

    if (mobileImportedData && tvImportedData) {
      this.selectedTab.setValue(0);

      this.androidFormsService.modifiedFillModule(
        mobileImportedData,
        this.formGroup.controls.mobileFormGroup as FormGroup,
        this.mobileNonTranslatableFields,
        this.mobileTranslatableFields,
        'mobileStatus',
        this.regionsLanguagesBinding,
        'app-copy',
        this.defaultAppCopy.platforms.mobile,
        action,
      );
      this.androidFormsService.modifiedFillModule(
        tvImportedData,
        this.formGroup.controls.tvFormGroup as FormGroup,
        this.tvNonTranslatableFields,
        this.tvTranslatableFields,
        'tvStatus',
        this.regionsLanguagesBinding,
        'app-copy',
        this.defaultAppCopy.platforms.tv,
        action,
      );
    } else if (mobileImportedData) {
      this.selectedTab.setValue(0);
      this.androidFormsService.modifiedFillModule(
        mobileImportedData,
        this.formGroup.controls.mobileFormGroup as FormGroup,
        this.mobileNonTranslatableFields,
        this.mobileTranslatableFields,
        'mobileStatus',
        this.regionsLanguagesBinding,
        'app-copy',
        this.defaultAppCopy.platforms.mobile,
        action,
      );
    } else if (tvImportedData) {
      this.selectedTab.setValue(1);
      this.androidFormsService.modifiedFillModule(
        tvImportedData,
        this.formGroup.controls.tvFormGroup as FormGroup,
        this.tvNonTranslatableFields,
        this.tvTranslatableFields,
        'tvStatus',
        this.regionsLanguagesBinding,
        'app-copy',
        this.defaultAppCopy.platforms.tv,
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
      this.androidFormsService.modifiedIsModuleEmpty(
        this.regionsLanguagesBinding,
        this.formGroup.controls.mobileFormGroup as FormGroup,
        this.mobileNonTranslatableFields,
        this.mobileTranslatableFields,
      ) ||
      this.androidFormsService.modifiedIsModuleEmpty(
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
    if (this.selectedTab.value === 0) {
      return (
        this.pageQuery !== 'view' ||
        ((this.formGroup.controls.mobileFormGroup as FormGroup).controls[
          this.selectedMobileRegion.code
        ] as FormGroup).invalid ||
        ((this.formGroup.controls.mobileFormGroup as FormGroup).controls[
          this.selectedMobileRegion.code
        ] as FormGroup).pristine ||
        this.androidFormsService.isRegionEmpty(
          this.selectedMobileRegion,
          this.formGroup.controls.mobileFormGroup as FormGroup,
          this.mobileFields,
        )
      );
    } else if (this.selectedTab.value === 1) {
      return (
        this.pageQuery !== 'view' ||
        ((this.formGroup.controls.tvFormGroup as FormGroup).controls[
          this.selectedTvRegion.code
        ] as FormGroup).invalid ||
        ((this.formGroup.controls.tvFormGroup as FormGroup).controls[
          this.selectedTvRegion.code
        ] as FormGroup).pristine ||
        this.androidFormsService.isRegionEmpty(
          this.selectedTvRegion,
          this.formGroup.controls.tvFormGroup as FormGroup,
          this.tvFields,
        )
      );
    } else {
      return true;
    }
  }

  getClassArray(region, index: number): string[] {
    const classArray: string[] = [];
    if (this.selectedTab.value === 0) {
      classArray.push(region.mobileStatus);
      if (this.mobilePositionArray[index]) {
        classArray.push('selected-region');
      }
    } else if (this.selectedTab.value === 1) {
      classArray.push(region.tvStatus);
      if (this.tvPositionArray[index]) {
        classArray.push('selected-region');
      }
    }
    return classArray;
  }

  isClearALLButtonDisabled(): boolean {
    if (this.regionsLanguagesBinding.length && this.defaultAppCopy) {
      return (
        this.androidFormsService.isModuleDataDefault(
          this.regionsLanguagesBinding,
          this.defaultAppCopy.platforms.mobile,
          this.formGroup.controls.mobileFormGroup as FormGroup,
          this.mobileFields,
        ) &&
        this.androidFormsService.isModuleDataDefault(
          this.regionsLanguagesBinding,
          this.defaultAppCopy.platforms.tv,
          this.formGroup.controls.tvFormGroup as FormGroup,
          this.tvFields,
        )
      );
    }
    return true;
  }

  isClearRegionButtonDisabled(): boolean {
    if (this.regionsLanguagesBinding.length && this.defaultAppCopy) {
      if (this.selectedTab.value === 0) {
        return this.androidFormsService.isRegionDefault(
          this.selectedMobileRegion,
          this.defaultAppCopy.platforms.mobile,
          this.formGroup.controls.mobileFormGroup as FormGroup,
          this.mobileFields,
        );
      } else if (this.selectedTab.value === 1) {
        return this.androidFormsService.isRegionDefault(
          this.selectedTvRegion,
          this.defaultAppCopy.platforms.tv,
          this.formGroup.controls.tvFormGroup as FormGroup,
          this.tvFields,
        );
      }
    }

    return true;
  }

  getAppCopyNameErrorMessage(): string {
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
    if (this.selectedTab.value === 0) {
      this.mobileRegionPosition = index;
      this.mobilePositionArray = this.mobilePositionArray.map(() => false);
      this.mobilePositionArray[index] = true;
      this.selectedMobileRegion = this.regionsLanguagesBinding[
        this.mobileRegionPosition
      ];
    } else if (this.selectedTab.value === 1) {
      this.tvRegionPosition = index;
      this.tvPositionArray = this.tvPositionArray.map(() => false);
      this.tvPositionArray[index] = true;
      this.selectedTvRegion = this.regionsLanguagesBinding[
        this.tvRegionPosition
      ];
    }
  }

  copyFields(regionCode: string, language: string): void {
    let androidAppCopyFormCopyObj = {};
    if (this.selectedTab.value === 0) {
      this.androidFormsService.copyFields(
        androidAppCopyFormCopyObj,
        this.mobileTranslatableFields,
        this.formGroup.controls.mobileFormGroup as FormGroup,
        regionCode,
        language,
      );
    } else if (this.selectedTab.value === 1) {
      this.androidFormsService.copyFields(
        androidAppCopyFormCopyObj,
        this.tvTranslatableFields,
        this.formGroup.controls.tvFormGroup as FormGroup,
        regionCode,
        language,
      );
    }
    localStorage.setItem(
      'androidAppCopyFormCopy',
      JSON.stringify(androidAppCopyFormCopyObj),
    );
  }

  pasteFields(regionCode: string, language: string, index: number): void {
    const androidAppCopyFormCopyObj = JSON.parse(
      localStorage.getItem('androidAppCopyFormCopy') as string,
    );
    if (this.selectedTab.value === 0) {
      this.androidFormsService.pasteFields(
        this.regionsLanguagesBinding,
        androidAppCopyFormCopyObj,
        this.mobileTranslatableFields,
        this.formGroup.controls.mobileFormGroup as FormGroup,
        index,
        regionCode,
        language,
        'mobileStatus',
      );
    } else if (this.selectedTab.value === 1) {
      this.androidFormsService.pasteFields(
        this.regionsLanguagesBinding,
        androidAppCopyFormCopyObj,
        this.tvTranslatableFields,
        this.formGroup.controls.tvFormGroup as FormGroup,
        index,
        regionCode,
        language,
        'tvStatus',
      );
    }
  }

  changeModuleRegionStatus(index: number) {
    if (this.selectedTab.value === 0) {
      this.androidFormsService.modifiedChangeRegionStatus(
        index,
        this.formGroup.controls.mobileFormGroup as FormGroup,
        this.mobileNonTranslatableFields,
        this.mobileTranslatableFields,
        'mobileStatus',
        this.regionsLanguagesBinding,
      );
    } else if (this.selectedTab.value === 1) {
      this.androidFormsService.modifiedChangeRegionStatus(
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
    return this.regionsLanguagesBinding.every((region) => {
      return (
        region.mobileStatus !== this.status.RED &&
        region.tvStatus !== this.status.RED
      );
    });
  }

  getAppCopyFormData() {
    let formData: any = {
      name: this.formGroup.controls.appCopyName.value,
      createdBy: null,
      platforms: {
        mobile: {},
        tv: {},
      },
    };
    if (!!localStorage.getItem('username')) {
      formData.createdBy = localStorage.getItem('username');
    }

    this.androidFormsService.makeFormDataKeys(
      formData.platforms.mobile,
      this.regionsLanguagesBinding,
    );
    this.androidFormsService.makeFormDataKeys(
      formData.platforms.tv,
      this.regionsLanguagesBinding,
    );

    this.androidFormsService.modifiedFillFormData(
      this.mobileNonTranslatableFields,
      this.mobileTranslatableFields,
      formData.platforms.mobile,
      this.formGroup.controls.mobileFormGroup as FormGroup,
      this.regionsLanguagesBinding,
      'mobileStatus',
      this.importedModuleData,
      this.pageQuery,
    );
    this.androidFormsService.modifiedFillFormData(
      this.tvNonTranslatableFields,
      this.tvTranslatableFields,
      formData.platforms.tv,
      this.formGroup.controls.tvFormGroup as FormGroup,
      this.regionsLanguagesBinding,
      'tvStatus',
      this.importedModuleData,
      this.pageQuery,
    );

    if (Object.keys(formData.platforms.mobile).length < 1) {
      delete formData.platforms.mobile;
    }

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
      this.openErrorDialog(err);
    }
  }

  async saveModule() {
    if (this.pageQuery === 'create' || this.pageQuery === 'duplicate') {
      this.androidService
        .saveAppCopy(
          this.androidService.getStore().code,
          this.androidService.getProduct().code,
          this.currentEnv.code,
          this.getAppCopyFormData(),
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (res) => {
          this.moduleID = res.data.appCopyId;
          this.pageQuery = 'view';
          await this.getAppCopyById();
          this.formGroup.markAsPristine();

          if (JSON.parse(localStorage.getItem('campaign') as string)) {
            this.androidFormsService.editCampaignObjectInLocalStorage(
              'appCopyId',
              this.moduleID,
            );
            this.router.navigate(['android/campaigns/create']);
          } else {
            this.openResponseDialog(res);
          }
        });
    } else if (this.pageQuery === 'view') {
      this.androidService
        .updateAppCopy(this.moduleID, this.getAppCopyFormData())
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (res) => {
          await this.getAppCopyById();
          this.formGroup.markAsPristine();
          this.androidFormsService.navigateBackOrOpenDialog(
            this.openResponseDialog,
            res,
            this,
          );
        });
    }
  }

  async updateRegion() {
    try {
      this.loaderService.show();
      if (this.selectedTab.value === 0) {
        this.androidService
          .updateRegionInAppCopy(
            this.platforms[0],
            this.selectedMobileRegion.code,
            this.moduleID,
            this.androidFormsService.getModifiedSelectedRegionData(
              this.mobileNonTranslatableFields,
              this.mobileTranslatableFields,
              this.formGroup.controls.mobileFormGroup as FormGroup,
              this.selectedMobileRegion,
              'mobileStatus',
              this.importedModuleData,
            ),
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe(async (res) => {
            await this.getAppCopyById();
            (this.formGroup.controls.mobileFormGroup as FormGroup).controls[
              this.selectedMobileRegion.code
            ].markAsPristine();
            this.openResponseDialog(res);
          });
      } else if (this.selectedTab.value === 1) {
        this.androidService
          .updateRegionInAppCopy(
            this.platforms[1],
            this.selectedTvRegion.code,
            this.moduleID,
            this.androidFormsService.getModifiedSelectedRegionData(
              this.tvNonTranslatableFields,
              this.tvTranslatableFields,
              this.formGroup.controls.tvFormGroup as FormGroup,
              this.selectedTvRegion,
              'tvStatus',
              this.importedModuleData,
            ),
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe(async (res) => {
            await this.getAppCopyById();
            (this.formGroup.controls.tvFormGroup as FormGroup).controls[
              this.selectedTvRegion.code
            ].markAsPristine();
            this.androidFormsService.navigateBackOrOpenDialog(
              this.openResponseDialog,
              res,
              this,
            );
          });
      }
    } catch (err) {
      this.openErrorDialog(err);
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
      if (this.selectedTab.value === 0) {
        this.androidFormsService.fillRegion(
          this.selectedMobileRegion,
          this.mobileFields,
          this.formGroup.controls.mobileFormGroup as FormGroup,
          'mobileStatus',
          this.defaultAppCopy.platforms.mobile,
          this.regionsLanguagesBinding,
          this.mobileRegionPosition,
        );
        (this.formGroup.controls.mobileFormGroup as FormGroup).controls[
          this.selectedMobileRegion.code
        ].markAsDirty();
      } else if (this.selectedTab.value === 1) {
        this.androidFormsService.fillRegion(
          this.selectedTvRegion,
          this.tvFields,
          this.formGroup.controls.tvFormGroup as FormGroup,
          'tvStatus',
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
    return this.regionsLanguagesBinding.every((region) => {
      return (
        region.mobileStatus !== this.status.UNSAVED &&
        region.tvStatus !== this.status.UNSAVED &&
        region.mobileStatus !== this.status.RED &&
        region.tvStatus !== this.status.RED
      );
    });
  }

  noUnsavedRegions(): boolean {
    return this.regionsLanguagesBinding.every((region) => {
      return (
        region.mobileStatus !== this.status.UNSAVED &&
        region.tvStatus !== this.status.UNSAVED
      );
    });
  }

  isPublishButtonDisabled(): boolean {
    return (
      this.formGroup.dirty ||
      this.isFormFocused ||
      this.pageQuery !== 'view' ||
      this.formGroup.invalid ||
      !this.noUnsavedOrRedRegions()
    );
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
    super.openResponse(response);
  }

  async getAppCopyById() {
    const res = await this.androidService.getAppCopy(this.moduleID).toPromise();
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
        action: 'androidSave',
      };
      this.openActionDialog(action).subscribe((res) => {
        switch (res) {
          case 'save':
            this.subject.next(false);
            this.androidFormsService.setProperHistory('app-copy', this.router);
            this.saveAll();
            break;
          case 'leave':
            this.ignoreDialog = true;
            this.subject.next(true);
            this.androidFormsService.navigateBack('app-copy');
            break;
          case 'cancel':
            this.subject.next(false);
            this.androidFormsService.setProperHistory('app-copy', this.router);
            break;
        }
      });
    } else {
      this.androidFormsService.navigateBack('app-copy');
    }
  }

  getRegionFieldValue(platform: string, region, fieldName: string): string {
    switch (platform) {
      case this.platforms[0]:
        const mobileFieldValue = this.formGroup.value.mobileFormGroup[
          region.code
        ][region.languages[0].code][fieldName] as string;
        return mobileFieldValue ?? '';
      case this.platforms[1]:
        const tvFieldValue = this.formGroup.value.mobileFormGroup[region.code][
          region.languages[0].code
        ][fieldName] as string;
        return tvFieldValue ?? '';
      default:
        return '';
    }
  }

  fieldFocus(region, imgUrl: string): void {
    switch (this.selectedTab.value) {
      case 0:
        if (
          this.formGroup.controls.mobileFormGroup.value[region.code].img !==
          imgUrl
        ) {
          this.showImgSpinner = true;
          this.mobileImgCanBeLoaded = true;
          ((this.formGroup.controls.mobileFormGroup as FormGroup).controls[
            region.code
          ] as FormGroup).controls.img.setValue(imgUrl);
        }
        break;
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loaderService.hide();
  }
}
