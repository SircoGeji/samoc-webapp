import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { forkJoin, Subject } from 'rxjs';
import { LoaderService } from '../../../../service/loader.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { RokuService } from '../../../../service/roku.service';
import { BaseComponent } from '../../../base/base.component';
import { filter, takeUntil } from 'rxjs/operators';
import { identityCheckValidator } from '../../../../validators/identity-check-validator';
import { RokuFormsUtils } from '../../../../utils/roku-forms.utils';
import { PROCEED_MESSAGE } from '../../../../constants';
import { ModuleStatus } from '../../../../types/rokuEnum';
import { SnackbarService } from '../../../../service/snackbar.service';

@Component({
  selector: 'app-store-copy-form',
  templateUrl: './store-copy-form.component.html',
  styleUrls: ['./store-copy-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RokuStoreCopyFormComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public formGroup: FormGroup;
  public pageQuery: string;
  public storeCopyFields: any[] = [];
  public languages = [];
  public languagePositionArray: boolean[] = [];
  public languagePosition = 0;
  public selectedLanguage;
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
  public currentStore;
  public isFormVisible: boolean = false;

  private destroy$ = new Subject<void>();
  private moduleID: number;
  private currentProduct;
  private defaultStoreCopy;
  private subject = new Subject<boolean>();
  private ignoreDialog = false;
  private allStoreCopyModules: any;

  constructor(
    public loaderService: LoaderService,
    public router: Router,
    public dialog: MatDialog,
    private rokuService: RokuService,
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
    this.pageQuery =
      this.activatedRoute.snapshot.paramMap['params']['action'] ?? 'create';
    this.moduleID =
      Number(this.activatedRoute.snapshot.paramMap['params']['id']) ?? null;

    this.loaderService.show();
    forkJoin([
      this.rokuService.getAllStoreCopies(),
      this.rokuService.getStoreCopyFields(this.currentStore.code),
      this.rokuService.getLanguages(),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArray) => {
        const [allStoreCopiesRes, fieldsRes, languagesRes] = resultArray;

        if (!!allStoreCopiesRes.data && !!allStoreCopiesRes.data.length) {
          this.allStoreCopyModules = allStoreCopiesRes.data.filter((el) => {
            return (
              el.productId === this.currentProduct.productId &&
              el.storeId === this.currentStore.storeId
            );
          });
        }

        this.formGroup = this.formBuilder.group({
          storeCopyName: [
            null,
            [
              Validators.required,
              identityCheckValidator(this.allStoreCopyModules, 'name'),
            ],
          ],
          languages: this.formBuilder.group({}),
        });

        this.storeCopyFields = fieldsRes.data;
        this.storeCopyFields.sort(
          (a, b) => Number(a.order) - Number(b.order),
        );

        this.languages = languagesRes.data.map((language) => {
          return {
            name: language.name,
            code: language.code,
            status: this.storeCopyHasRequiredFields()
              ? this.status.RED
              : this.status.DEFAULT,
          };
        });

        this.rokuFormsUtils.fillRegionPositionArray(
          this.languages,
          this.languagePositionArray,
        );
        this.selectedLanguage = this.languages[this.languagePosition];
        this.setLanguagesFormGroup();

        if (this.moduleID) {
          const foundModule = this.allStoreCopyModules.find(
            (module) => module.storeCopyId === this.moduleID,
          );
          if (!!foundModule) {
            this.importedModuleData = foundModule;

            this.formGroup.controls.storeCopyName.setValidators([
              identityCheckValidator(
                this.allStoreCopyModules,
                'name',
                this.importedModuleData.name,
                this.pageQuery,
              ),
            ]);
            this.setDefaultStoreCopy();
          }
        } else {
          this.isFormVisible = true;
          this.loaderService.hide();
        }
      });
  }

  storeCopyHasRequiredFields(): boolean {
    return this.storeCopyFields.some((field: any) => field.required);
  }

  setLanguagesFormGroup(): void {
    this.languages.forEach((language: any) => {
      (this.formGroup.controls.languages as FormGroup).addControl(
        language.code,
        this.getLanguageFormGroup(),
      );
    });
  }

  getLanguageFormGroup(): FormGroup {
    const languageFormGroup: FormGroup = this.formBuilder.group({});
    this.storeCopyFields.forEach((field: any) => {
      if (field.dataType !== 'boolean') {
        languageFormGroup.addControl(field.fieldName, new FormControl(null));
      } else {
        languageFormGroup.addControl(field.fieldName, new FormControl(false));
      }
    });
    return languageFormGroup;
  }

  setDefaultStoreCopy(): void {
    const defaultStoreCopy = this.allStoreCopyModules.find((el) => {
      return (
        el.productId === this.currentProduct.productId &&
        el.storeId === this.currentStore.storeId &&
        el.isDefault === true
      );
    });

    if (!!defaultStoreCopy) {
      this.defaultStoreCopy = defaultStoreCopy;
      this.fillModule(this.importedModuleData);
    }
    this.isFormVisible = true;
    this.loaderService.hide();
  }

  fillModule(importedModuleData, action?: string): void {
    if (action !== 'clear') {
      this.formGroup.controls.storeCopyName.setValue(
        this.pageQuery === 'view'
          ? importedModuleData.name
          : importedModuleData.name + ' Copy',
      );
    }

    this.languages.forEach((language: any) => {
      const isDefault: boolean = this.isLanguageDefault(language);

      this.storeCopyFields.forEach((field: any) => {
        const fieldControl = this.formGroup.get([
          'languages',
          language.code,
          field.fieldName,
        ]) as FormControl;
        const fieldValue =
          importedModuleData['languages'][language.code]?.tableData[
            field.fieldName
          ];

        if (fieldValue) {
          fieldControl.setValue(fieldValue);
        } else {
          if (field.dataType !== 'boolean') {
            fieldControl.reset();
          } else {
            fieldControl.setValue(false);
          }
        }
      });
      if (
        !this.isLanguageRed(language) &&
        !(
          !importedModuleData['languages'][language.code] &&
          this.storeCopyHasRequiredFields()
        )
      ) {
        if (action !== 'clear') {
          if (this.isLanguageDefault(language)) {
            language.status = this.status.DEFAULT;
          } else {
            language.status = this.status.DUPLICATE;
          }
        } else {
          if (!isDefault) {
            language.status = this.status.UNSAVED;
          }
        }
      } else {
        language.status = this.status.RED;
      }
    });
  }

  fillLanguage() {
    this.storeCopyFields.forEach((field: any) => {
      const fieldControl = this.formGroup.get([
        'languages',
        this.selectedLanguage.code,
        field.fieldName,
      ]) as FormControl;
      const fieldValue = this.defaultStoreCopy['languages'][
        this.selectedLanguage.code
      ]?.tableData[field.fieldName];

      if (fieldValue) {
        fieldControl.setValue(fieldValue);
      } else {
        if (field.dataType !== 'boolean') {
          fieldControl.reset();
        } else {
          fieldControl.setValue(false);
        }
      }
    });
    this.changeLanguageStatus(this.selectedLanguage);
  }

  isLanguageDefault(language): boolean {
    let isDefault = true;
    this.storeCopyFields.forEach((field: any) => {
      const fieldValue = this.formGroup.value.languages[language.code][
        field.fieldName
      ];
      const defaultFieldValue = this.defaultStoreCopy?.['languages'][
        language.code
      ]?.tableData[field.fieldName];
      if (fieldValue || defaultFieldValue) {
        if (fieldValue != defaultFieldValue) {
          isDefault = false;
        }
      }
    });
    return isDefault;
  }

  isLanguageRed(language): boolean {
    let isRed = false;
    this.storeCopyFields.forEach((field: any) => {
      const fieldValue = this.formGroup.value.languages[language.code][
        field.fieldName
      ];
      if (field.required && !fieldValue?.toString().replace(/\s/g, '').length) {
        isRed = true;
      }
    });
    return isRed;
  }

  isModuleDefault(): boolean {
    return this.languages.every((language) => this.isLanguageDefault(language));
  }

  getStoreCopyNameErrorMessage(): string {
    if (this.formGroup.controls.storeCopyName.hasError('required')) {
      return 'Please enter Store Copy Name';
    } else if (
      this.formGroup.controls.storeCopyName.hasError('fieldValueIsNotUnique')
    ) {
      return 'This Store Copy Name already exists';
    } else {
      return '';
    }
  }

  isSaveOuterButtonDisabled(): boolean {
    return (
      (this.isSaveAllButtonDisabled() &&
        this.isUpdateLanguageButtonDisabled()) ||
      this.isModuleEmpty()
    );
  }

  isModuleEmpty(): boolean {
    return this.languages.every((language) => this.isLanguageEmpty(language));
  }

  isSaveAllButtonDisabled(): boolean {
    if (this.pageQuery === 'duplicate') {
      return this.formGroup.invalid || this.formGroup.pending;
    } else {
      return (
        this.formGroup.pristine ||
        !this.formGroup.valid ||
        this.formGroup.pending ||
        (!this.noMissingRequiredFields() &&
          this.importedModuleData.status === ModuleStatus.LIVE &&
          this.pageQuery === 'view')
      );
    }
  }

  isUpdateLanguageButtonDisabled(): boolean {
    if (this.languages.length > 0) {
      return (
        this.pageQuery !== 'view' ||
        (this.formGroup.get([
          'languages',
          this.selectedLanguage.code,
        ]) as FormGroup).invalid ||
        (this.formGroup.get([
          'languages',
          this.selectedLanguage.code,
        ]) as FormGroup).pristine ||
        this.isLanguageEmpty(this.selectedLanguage) ||
        (this.importedModuleData.status === ModuleStatus.LIVE &&
          this.selectedLanguage.status === this.status.RED)
      );
    } else {
      return true;
    }
  }

  isLanguageEmpty(language): boolean {
    let empty = true;

    this.storeCopyFields.forEach((field: any) => {
      const fieldValue = this.formGroup.value.languages[language.code][
        field.fieldName
      ];
      if (fieldValue?.toString().replace(/\s/g, '').length) {
        empty = false;
      }
    });
    return empty;
  }

  isClearALLButtonDisabled(): boolean {
    if (this.languages.length && this.defaultStoreCopy) {
      return this.isModuleDefault();
    } else {
      return true;
    }
  }

  isClearLanguageButtonDisabled(): boolean {
    if (this.languages.length && this.defaultStoreCopy) {
      return this.isLanguageDefault(this.selectedLanguage);
    } else {
      return true;
    }
  }

  isPublishButtonDisabled(): boolean {
    return (
      this.pageQuery !== 'view' ||
      this.formGroup.invalid ||
      !this.noUnsavedOrRedRegions()
    );
  }

  noUnsavedOrRedRegions(): boolean {
    return this.languages.every((language: any) => {
      return (
        language.status !== this.status.UNSAVED &&
        language.status !== this.status.RED
      );
    });
  }

  languageButtonClick(index: number): void {
    this.languagePosition = index;
    this.languagePositionArray = this.languagePositionArray.map(() => false);
    this.languagePositionArray[index] = true;
    this.selectedLanguage = this.languages[this.languagePosition];
  }

  changeLanguageStatus(language): void {
    let red = false;

    this.storeCopyFields.forEach((field: any) => {
      const fieldValue = this.formGroup.value.languages[language.code][
        field.fieldName
      ];
      if (!fieldValue?.toString().replace(/\s/g, '').length) {
        if (field.required) {
          red = true;
        }
      }
    });
    if (red) {
      language.status = this.status.RED;
    } else {
      language.status = this.status.UNSAVED;
    }
  }

  copy(language): void {
    const rokuStoreCopyFormCopyObj = (this.formGroup.get([
      'languages',
      language.code,
    ]) as FormGroup).getRawValue();
    localStorage.setItem(
      'rokuStoreCopyFormCopy',
      JSON.stringify(rokuStoreCopyFormCopyObj),
    );
  }

  paste(language): void {
    const rokuStoreCopyFormCopyObj = JSON.parse(
      localStorage.getItem('rokuStoreCopyFormCopy') as string,
    );
    (this.formGroup.get(['languages', language.code]) as FormGroup).patchValue(
      rokuStoreCopyFormCopyObj,
    );
    (this.formGroup.get([
      'languages',
      language.code,
    ]) as FormGroup).markAsDirty();
    this.changeLanguageStatus(language);
  }

  getClassArray(language, index: number): string[] {
    const classArray: string[] = [];
    classArray.push(language.status);
    if (this.languagePositionArray[index]) {
      classArray.push('selected-region');
    }
    return classArray;
  }

  getFieldLength(language, field): number {
    return (
      ((this.formGroup.controls.languages as FormGroup).controls[
        language.code
      ] as FormGroup).controls[field.fieldName].value?.length ?? 0
    );
  }

  noMissingRequiredFields(): boolean {
    return this.languages.every((language: any) => {
      return language.status !== this.status.RED;
    });
  }

  saveAll(): void {
    try {
      if (
        this.pageQuery === 'view' &&
        this.importedModuleData['deployedTo']?.includes('prod')
      ) {
        const action = {
          message:
            'This is Live STORE COPY, it is deployed on prod, thus you need to enter the password to update it, ' +
            'after update it will be published automatically. ' +
            `${PROCEED_MESSAGE} UPDATE ALL?`,
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
    }
  }

  async saveModule() {
    if (this.pageQuery === 'create' || this.pageQuery === 'duplicate') {
      this.rokuService
        .saveStoreCopy(
          this.currentStore.code,
          this.currentProduct.code,
          this.getStoreCopyFormData(),
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (res) => {
          this.moduleID = res.data.storeCopyId;
          this.pageQuery = 'view';
          await this.getStoreCopyById();

          if (JSON.parse(localStorage.getItem('campaign') as string)) {
            this.rokuFormsUtils.editCampaignObjectInLocalStorage(
              'storeCopyId',
              this.moduleID,
            );
            this.router.navigate(['android/campaigns/create']);
          } else {
            this.showResponseSnackbar(res);
          }
          this.loaderService.hide();
        });
    } else if (this.pageQuery === 'view') {
      this.rokuService
        .updateStoreCopy(this.moduleID, this.getStoreCopyFormData())
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          async (res) => {
            await this.getStoreCopyById();

            if (this.importedModuleData.status === ModuleStatus.LIVE) {
              this.publishAfterUpdate(res);
            } else {
              this.showResponseSnackbar(res);
            }
            this.loaderService.hide();
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
        this.rokuService.publishStoreCopy,
      )
      .subscribe(() => {
        this.showResponseSnackbar(res);
        this.loaderService.hide();
      });
  }

  getStoreCopyFormData() {
    const formData: any = {
      name: this.formGroup.value.storeCopyName,
      createdBy: null,
      languages: {},
    };
    if (!!localStorage.getItem('username')) {
      formData.createdBy = localStorage.getItem('username');
    }

    this.languages.forEach((language: any) => {
      formData.languages[language.code] = {};
      formData.languages[language.code].tableData = {};
      const languageTableData = formData.languages[language.code].tableData;
      this.storeCopyFields.forEach((field: any) => {
        const fieldValue = this.formGroup.value.languages[language.code][
          field.fieldName
        ];
        if (fieldValue?.toString().replace(/\s/g, '').length && fieldValue) {
          languageTableData[field.fieldName] = fieldValue;
        }
      });
      if (Object.keys(languageTableData).length < 1) {
        delete formData.languages[language.code];
      } else {
        if (language.status === this.status.RED) {
          formData.languages[language.code].status = this.status.RED;
        } else {
          if (
            this.importedModuleData.status === ModuleStatus.LIVE &&
            this.pageQuery === 'view'
          ) {
            formData.languages[language.code].status = this.status.PUBLISHED;
            language.status = this.status.PUBLISHED;
          } else {
            formData.languages[language.code].status = this.status.SAVED;
            language.status = this.status.SAVED;
          }
        }
      }
    });
    return formData;
  }

  async updateLanguage() {
    try {
      if (
        this.pageQuery === 'view' &&
        this.importedModuleData['deployedTo']?.includes('prod')
      ) {
        const action = {
          message:
            'This is Live STORE COPY, it is deployed on prod, thus you need to enter the password to update it, ' +
            'after update it will be published automatically. ' +
            `${PROCEED_MESSAGE}UPDATE REGION?`,
          action: 'update',
          env: 'prod',
        };
        this.openActionDialog(action).subscribe(() => {
          this.loaderService.show();
          this.rokuService
            .updateLanguageInStoreCopy(
              this.selectedLanguage.code,
              this.moduleID,
              this.getSelectedLanguageData(),
            )
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              async (res) => {
                await this.getStoreCopyById();

                if (this.importedModuleData.status === ModuleStatus.LIVE) {
                  this.publishAfterUpdate(res);
                } else {
                  this.showResponseSnackbar(res);
                }
                this.loaderService.hide();
              },
              (err) => {
                this.showErrorSnackbar(err);
                this.loaderService.hide();
              },
            );
        });
      } else {
        this.loaderService.show();
        this.rokuService
          .updateLanguageInStoreCopy(
            this.selectedLanguage.code,
            this.moduleID,
            this.getSelectedLanguageData(),
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            async (res) => {
              await this.getStoreCopyById();

              if (this.importedModuleData.status === ModuleStatus.LIVE) {
                this.publishAfterUpdate(res);
              } else {
                this.showResponseSnackbar(res);
              }
              this.loaderService.hide();
            },
            (err) => {
              this.showErrorSnackbar(err);
              this.loaderService.hide();
            },
          );
      }
    } catch (err) {
      this.showErrorSnackbar(err);
    }
  }

  getSelectedLanguageData() {
    const languageData: any = {
      tableData: null,
      status: null,
    };
    languageData.tableData = {};
    this.storeCopyFields.forEach((field: any) => {
      const fieldValue = this.formGroup.value.languages[
        this.selectedLanguage.code
      ][field.fieldName];
      if (fieldValue?.toString().replace(/\s/g, '').length && fieldValue) {
        languageData.tableData[field.fieldName] = fieldValue;
      }
    });

    if (this.selectedLanguage.status === this.status.RED) {
      languageData['status'] = this.status.RED;
    } else {
      if (this.importedModuleData?.status === ModuleStatus.LIVE) {
        languageData['status'] = this.status.PUBLISHED;
        this.selectedLanguage.status = this.status.PUBLISHED;
      } else {
        languageData['status'] = this.status.SAVED;
        this.selectedLanguage.status = this.status.SAVED;
      }
    }
    return languageData;
  }

  clearAll(): void {
    const action = {
      message: PROCEED_MESSAGE + 'CLEAR ALL?',
      action: 'prompt',
    };

    this.openActionDialog(action).subscribe(() => {
      this.fillModule(this.defaultStoreCopy, 'clear');
      this.formGroup.markAsDirty();
    });
  }

  clearLanguage(): void {
    const action = {
      message:
        PROCEED_MESSAGE +
        'CLEAR? All data linked with selected region will be lost.',
      action: 'prompt',
    };
    this.openActionDialog(action).subscribe(() => {
      this.fillLanguage();
      (this.formGroup.get([
        'languages',
        this.selectedLanguage.code,
      ]) as FormGroup).markAsDirty();
    });
  }

  async publish() {
    const action = {
      message: PROCEED_MESSAGE + 'PUBLISH?',
      action: 'androidPublish',
      module: 'store-copy',
      id: this.moduleID,
    };
    this.openActionDialog(action).subscribe((res) => {
      this.publishModule(this.moduleID, res);
    });
  }

  async publishModule(storeCopyId: number, env: string) {
    try {
      this.loaderService.show();
      const res = await this.rokuService
        .publishStoreCopy(storeCopyId, env)
        .toPromise();
      this.showResponseSnackbar(res);

      await this.getStoreCopyById();

      this.languages.forEach((language: any) => {
        language.status = this.status.PUBLISHED;
      });
      this.loaderService.hide();
    } catch (err) {
      this.showErrorSnackbar(err);
      this.loaderService.hide();
    }
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

  noUnsavedRegions(): boolean {
    return this.languages.every((language: any) => {
      return language.status !== this.status.UNSAVED;
    });
  }

  async getStoreCopyById() {
    const res = await this.rokuService.getStoreCopy(this.moduleID).toPromise();
    this.importedModuleData = res.data;
    this.formGroup.controls.storeCopyName.setValidators([
      identityCheckValidator(
        this.allStoreCopyModules,
        'name',
        this.importedModuleData.name,
        this.pageQuery,
      ),
    ]);

    if (this.importedModuleData.isDefault) {
      this.defaultStoreCopy = this.importedModuleData;
    }
  }

  canNotNavigateBack(): boolean {
    if (this.ignoreDialog) {
      return false;
    } else {
      return !this.noUnsavedRegions() && this.formGroup.valid;
    }
  }

  navigateBack(): void {
    if (!this.noUnsavedRegions() && this.formGroup.valid) {
      const action = {
        message:
          'There are unsaved changes that will be lost. Do you wish to save changes?' +
          `${
            this.importedModuleData.status === ModuleStatus.LIVE &&
            this.pageQuery === 'view'
              ? ' This is Live STORE COPY, after save it will be published automatically. '
              : ''
          }`,
        action: 'androidSave',
      };
      this.openActionDialog(action).subscribe((res) => {
        switch (res) {
          case 'save':
            this.subject.next(false);
            this.rokuFormsUtils.setProperHistory('store-copy', this.router);
            this.saveAll();
            break;
          case 'leave':
            this.ignoreDialog = true;
            this.subject.next(true);
            this.rokuFormsUtils.navigateBack('store-copy');
            break;
          case 'cancel':
            this.subject.next(false);
            this.rokuFormsUtils.setProperHistory('store-copy', this.router);
            break;
        }
      });
    } else {
      this.rokuFormsUtils.navigateBack('store-copy');
    }
  }

  showResponseSnackbar(res: any) {
    this.snackbarService.show(
      res.message,
      'OK',
      `/roku/store-copy/view/${
        !!this.moduleID ? this.moduleID : res.data.storeCopyId
      }`,
      this.router,
      5000,
    );
  }

  showErrorSnackbar(err: any) {
    this.snackbarService.show(
      `${err.message}`,
      'ERROR',
      `/roku/store-copy`,
      this.router,
      10000,
    );
  }

  checkInputText(language, formControlName) {
    const formControl = ((this.formGroup.controls.languages as FormGroup)
      .controls[language.code] as FormGroup).controls[formControlName];
    const newValue = formControl.value.replace(/(?:\\n)/g, '\n');
    if (newValue !== formControl.value) {
      formControl.setValue(newValue, { emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loaderService.hide();
  }
}
