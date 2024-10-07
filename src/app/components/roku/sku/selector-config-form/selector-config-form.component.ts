import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ConfigurationService } from '../../../../service/configuration.service';
import { RokuService } from '../../../../service/roku.service';
import { BaseComponent } from '../../../base/base.component';
import { MatDialog } from '@angular/material/dialog';
import { LoaderService } from '../../../../service/loader.service';
import { RokuFormsUtils } from '../../../../utils/roku-forms.utils';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { PROCEED_MESSAGE } from '../../../../constants';
import { identityCheckValidator } from '../../../../validators/identity-check-validator';
import { ModuleStatus } from '../../../../types/rokuEnum';
import { SnackbarService } from '../../../../service/snackbar.service';

@Component({
  selector: 'app-selector-config-form',
  templateUrl: './selector-config-form.component.html',
  styleUrls: ['./selector-config-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RokuSelectorConfigFormComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public formGroup: FormGroup;
  private destroy$ = new Subject<void>();
  public regionsLanguagesBinding: any[] = [];
  public pageQuery = 'create';
  private moduleId: number;
  public importedModuleData: any = {
    status: 'null',
  };
  public regionPositionArray: boolean[] = [];
  public selectedRegion;
  public regionPosition = 0;
  public rowsOrderObject = {};
  public skuImportedDataArray;
  public defaultSelectorConfig;
  public currentStore;
  public currentProduct;
  public isFormVisible: boolean = false;

  public status = {
    DEFAULT: 'default',
    DUPLICATE: 'duplicate',
    UNSAVED: 'unsaved',
    SAVED: 'saved',
    PUBLISHED: 'published',
  } as const;
  private rowFieldsArray = [
    'skuId',
    'isDefault',
    'defaultInSelector',
    'showInSelector',
    'showInSettings',
    'price',
  ];
  private compareFieldsArray = [
    'isDefault',
    'defaultInSelector',
    'showInSelector',
    'showInSettings',
    'price',
  ];
  private subject = new Subject<boolean>();
  private ignoreDialog = false;
  private allSelectorConfigModules: any;

  constructor(
    private formBuilder: FormBuilder,
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    private activatedRoute: ActivatedRoute,
    private rokuFormsUtils: RokuFormsUtils,
    private rokuService: RokuService,
    private snackbarService: SnackbarService,
  ) {
    super(dialog, loaderService, router);
    this.formGroup = this.formBuilder.group({});
  }

  ngOnInit(): void {
    this.currentStore = this.rokuService.getStore();
    this.currentProduct = this.rokuService.getProduct();

    forkJoin([
      this.rokuService.getAllSelectorConfigs(),
      this.rokuService.getRegionsLanguages(
        this.currentStore.code,
        this.currentProduct.code,
      ),
      this.rokuService.getAllSkus(),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArray) => {
        const [allSelectorConfigsRes, regionsRes, skusRes] = resultArray;
        if (
          !!allSelectorConfigsRes.data &&
          !!allSelectorConfigsRes.data.length
        ) {
          this.allSelectorConfigModules = allSelectorConfigsRes.data.filter(
            (el) => {
              return (
                el.productId === this.currentProduct.productId &&
                el.storeId === this.currentStore.storeId
              );
            },
          );
        }
        this.formGroup = this.formBuilder.group({
          selectorConfigName: [
            null,
            identityCheckValidator(this.allSelectorConfigModules, 'name'),
          ],
          regions: this.formBuilder.group({}),
        });
        this.getSKUImportedDataArray(skusRes);
        this.getRegionsLanguagesBinding(regionsRes);
      });
  }

  getRegionsLanguagesBinding(regionsRes): void {
    this.loaderService.show();
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
          status: this.status.DEFAULT,
          name: region.name,
          languages,
        };
      },
    );

    this.selectedRegion = this.regionsLanguagesBinding[this.regionPosition];

    this.rokuFormsUtils.fillRegionPositionArray(
      this.regionsLanguagesBinding,
      this.regionPositionArray,
    );

    this.setRowsOrderObject();
    this.setRegionsFormGroup();

    this.pageQuery =
      this.activatedRoute.snapshot.paramMap['params']['action'] ?? 'create';
    this.moduleId =
      Number(this.activatedRoute.snapshot.paramMap['params']['id']) ?? null;

    if (this.moduleId) {
      const foundModule = this.allSelectorConfigModules.find(
        (module) => module.selectorConfigId === this.moduleId,
      );
      if (!!foundModule) {
        this.importedModuleData = foundModule;
        this.formGroup.controls.selectorConfigName.setValidators([
          identityCheckValidator(
            this.allSelectorConfigModules,
            'name',
            this.importedModuleData.name,
            this.pageQuery,
          ),
        ]);
        this.getDefaultSelectorConfig();
      } else {
        this.showErrorSnackbar({ message: 'Selector-Config module not found' });
      }
    }
    this.isFormVisible = true;
    this.loaderService.hide();
  }

  getDefaultSelectorConfig(): void {
    const defaultSelectorConfig = this.allSelectorConfigModules.find((el) => {
      return (
        el.productId === this.currentProduct.productId &&
        el.storeId === this.currentStore.storeId &&
        el.isDefault === true
      );
    });
    if (!!defaultSelectorConfig) {
      this.defaultSelectorConfig = defaultSelectorConfig;
      this.fillTable(this.importedModuleData);
    }
  }

  getSKUImportedDataArray(skusRes): void {
    this.skuImportedDataArray = skusRes.data;
    this.skuImportedDataArray = this.skuImportedDataArray.filter((sku) => {
      return (
        sku.storeId === this.currentStore.storeId &&
        sku.productId === this.currentProduct.productId &&
        sku.status !== 'archived'
      );
    });
  }

  createFromGroup(skuId: number, price): FormGroup {
    return this.formBuilder.group({
      skuId: [skuId],
      isDefault: [false],
      defaultInSelector: [false],
      showInSelector: [false],
      showInSettings: [false],
      price: [{ value: price, disabled: true }],
    });
  }

  setRegionsFormGroup(): void {
    this.regionsLanguagesBinding.forEach((region) => {
      (this.formGroup.controls.regions as FormGroup).addControl(
        region.code,
        this.formBuilder.group({}),
      );

      if (this.regionHasSkus(region)) {
        this.getSKUOptionsForSelectedRegion(region).forEach((sku) => {
          ((this.formGroup.controls.regions as FormGroup).controls[
            region.code
          ] as FormGroup).addControl(
            sku.skuId.toString(),
            this.createFromGroup(
              sku.skuId,
              (Object.values(sku.countries[region.code].languages) as any[])[0][
                'price'
              ],
            ),
          );
        });
      }
    });
  }

  setRowsOrderObject(): void {
    this.regionsLanguagesBinding.forEach((region) => {
      if (this.regionHasSkus(region)) {
        this.rowsOrderObject[region.code] = this.getSKUOptionsForSelectedRegion(
          region,
        ).map((sku) => sku.skuId);
      }
    });
  }

  disableColumn(regionCode: string, fieldName: string): void {
    if (
      this.rowsOrderObject[regionCode].every((sku) => {
        return !this.formGroup.value.regions[regionCode][sku][fieldName];
      })
    ) {
      this.rowsOrderObject[regionCode].forEach((skuId) => {
        const fieldControl = this.formGroup.get([
          'regions',
          regionCode,
          skuId,
          fieldName,
        ]) as FormGroup;
        fieldControl.enable();
      });
    } else {
      this.rowsOrderObject[regionCode].forEach((skuId) => {
        if (!this.formGroup.value.regions[regionCode][skuId][fieldName]) {
          const fieldControl = this.formGroup.get([
            'regions',
            regionCode,
            skuId,
            fieldName,
          ]) as FormGroup;
          fieldControl.disable();
        }
      });
    }
  }

  getSKUOptionsForSelectedRegion(region) {
    return this.skuImportedDataArray.filter((sku) => {
      return Object.keys(sku.countries).includes(region.code);
    });
  }

  regionHasSkus(region): boolean {
    return this.getSKUOptionsForSelectedRegion(region).length > 0;
  }

  areAllRegionsDefault(): boolean {
    return this.regionsLanguagesBinding.every((region) => {
      return this.regionHasSkus(region)
        ? this.isRegionDefault(region.code)
        : true;
    });
  }

  getSkuBySkuId(skuId: number) {
    return this.skuImportedDataArray.find((sku) => sku.skuId === skuId);
  }

  fillTable(importedModuleData, action?: string): void {
    if (action !== 'clear') {
      this.formGroup.controls.selectorConfigName.setValue(
        this.pageQuery === 'view'
          ? importedModuleData.name
          : importedModuleData.name + ' Copy',
      );
    }
    this.regionsLanguagesBinding.forEach((region) => {
      if (this.regionHasSkus(region)) {
        const isDefault: boolean = this.isRegionDefault(region.code);

        this.fillRegion(importedModuleData, region);

        if (action !== 'clear') {
          if (this.isRegionDefault(region.code)) {
            region.status = this.status.DEFAULT;
          } else {
            region.status = this.status.DUPLICATE;
          }
        } else {
          if (!isDefault) {
            region.status = this.status.UNSAVED;
          }
        }
      }
    });
  }

  fillRegion(data, region): void {
    if (data.countries[region.code]) {
      this.rowsOrderObject[region.code] = data.countries[
        region.code
      ].tableData.map((rowData) => rowData.skuId);
      this.getSKUOptionsForSelectedRegion(region).forEach((sku) => {
        if (!this.rowsOrderObject[region.code].includes(sku.skuId)) {
          this.rowsOrderObject[region.code].push(sku.skuId);
        }
      });
    }

    this.rowsOrderObject[region.code].forEach((skuId, index) => {
      this.rowFieldsArray.forEach((fieldName) => {
        const fieldControl = this.formGroup.get([
          'regions',
          region.code,
          skuId,
          fieldName,
        ]) as FormGroup;
        if (fieldName !== 'skuId' && fieldName !== 'price') {
          fieldControl.setValue(
            data.countries[region.code]?.tableData[index]?.[fieldName],
          );
        }

        this.disableColumn(region.code, 'isDefault');
        this.disableColumn(region.code, 'defaultInSelector');
      });
    });
  }

  isRegionDefault(regionCode: string): boolean {
    let isDefault = true;

    if (this.defaultSelectorConfig.countries[regionCode]) {
      isDefault = this.defaultSelectorConfig.countries[
        regionCode
      ].tableData.every((rowData, index) => {
        return rowData.skuId === this.rowsOrderObject[regionCode][index];
      });
    }

    this.rowsOrderObject[regionCode].forEach((skuId, index) => {
      this.compareFieldsArray.forEach((fieldName) => {
        const fieldValue =
          this.formGroup.value.regions[regionCode][skuId][fieldName] ?? false;
        const defaultFieldValue =
          this.defaultSelectorConfig.countries[regionCode]?.tableData[index]?.[
            fieldName
          ] ?? false;
        if (fieldValue !== defaultFieldValue) {
          isDefault = false;
        }
      });
    });

    return isDefault;
  }

  drop(event: CdkDragDrop<string[]>, regionCode: string) {
    const oldOrderArray = this.rowsOrderObject[regionCode].slice();

    moveItemInArray(
      this.rowsOrderObject[regionCode],
      event.previousIndex,
      event.currentIndex,
    );

    const arraysAreTheSame = this.rowsOrderObject[regionCode].every(
      (sku, index) => {
        return sku === oldOrderArray[index];
      },
    );

    if (!arraysAreTheSame) {
      ((this.formGroup.controls.regions as FormGroup).controls[
        regionCode
      ] as FormGroup).markAsDirty();
      this.changeRegionStatus();
    }
  }

  getSelectorConfigNameErrorMessage(): string {
    if (this.formGroup.controls.selectorConfigName.hasError('required')) {
      return 'Please enter Selector Config Name';
    } else if (
      this.formGroup.controls.selectorConfigName.hasError(
        'fieldValueIsNotUnique',
      )
    ) {
      return 'This Selector Config Name already exists';
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

  changeRegionStatus() {
    this.selectedRegion.status = this.status.UNSAVED;
  }

  getClassArray(region, index: number): string[] {
    const classArray: string[] = [];
    classArray.push(region.status);
    if (this.regionPositionArray[index]) {
      classArray.push('selected-region');
    }
    return classArray;
  }

  isOuterSaveButtonDisabled(): boolean {
    return (
      this.importedModuleData.status === ModuleStatus.LIVE &&
      this.isSaveAllButtonDisabled() &&
      this.isUpdateSelectedRegionButtonDisabled()
    );
  }

  isSaveAllButtonDisabled(): boolean {
    if (this.pageQuery === 'view') {
      return this.formGroup.pristine || !this.formGroup.valid;
    } else {
      return !this.formGroup.valid;
    }
  }

  isUpdateSelectedRegionButtonDisabled(): boolean {
    if (this.regionsLanguagesBinding.length > 0 && this.pageQuery === 'view') {
      return (
        ((this.formGroup.controls.regions as FormGroup).controls[
          this.selectedRegion.code
        ] as FormGroup).pristine || !this.regionHasSkus(this.selectedRegion)
      );
    } else {
      return true;
    }
  }

  isClearAllDisabled(): boolean {
    if (this.regionsLanguagesBinding.length > 0 && this.defaultSelectorConfig) {
      return this.areAllRegionsDefault();
    } else {
      return true;
    }
  }

  isClearRegionDisabled(): boolean {
    if (
      this.regionsLanguagesBinding.length > 0 &&
      this.defaultSelectorConfig?.countries[this.selectedRegion.code]
    ) {
      return this.isRegionDefault(this.selectedRegion.code);
    } else {
      return true;
    }
  }

  saveAll(): void {
    try {
      if (
        this.pageQuery === 'view' &&
        this.importedModuleData['deployedTo']?.includes('prod')
      ) {
        const action = {
          message:
            'This is Live SELECTOR CONFIG, it is deployed on prod, thus you need to enter the password to update it, ' +
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
        .saveSelectorConfig(
          this.currentStore.code,
          this.currentProduct.code,
          this.getFormData(),
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (res) => {
          this.pageQuery = 'view';
          this.moduleId = res.data.selectorConfigId;
          await this.getSelectorConfigById();

          if (JSON.parse(localStorage.getItem('campaign') as string)) {
            this.rokuFormsUtils.editCampaignObjectInLocalStorage(
              'selectorConfigId',
              this.moduleId,
            );
            this.router.navigate(['roku/campaigns/create']);
          } else {
            this.showResponseSnackbar(res);
          }
          this.loaderService.hide();
        });
    } else if (this.pageQuery === 'view') {
      this.rokuService
        .updateSelectorConfig(this.moduleId, this.getFormData())
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          async (res) => {
            await this.getSelectorConfigById();

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
        this.moduleId,
        this.rokuService.publishSelectorConfig,
      )
      .subscribe(() => {
        this.showResponseSnackbar(res);
        this.loaderService.hide();
      });
  }

  getFormData() {
    const formData: any = {
      name: this.formGroup.value.selectorConfigName,
      createdBy: null,
      countries: {},
    };
    if (!!localStorage.getItem('username')) {
      formData.createdBy = localStorage.getItem('username');
    }
    this.regionsLanguagesBinding.forEach((region) => {
      if (this.regionHasSkus(region)) {
        formData.countries[region.code] = {
          tableData: [],
        };

        this.rowsOrderObject[region.code].forEach((sku, index) => {
          formData.countries[region.code].tableData[index] = {};
          const rowData = formData.countries[region.code].tableData[index];
          rowData.order = index + 1;
          this.rowFieldsArray.forEach((fieldName) => {
            const fieldValue = this.formGroup.value.regions[region.code][sku][
              fieldName
            ];
            rowData[fieldName] = fieldValue;
          });
        });

        if (formData.countries[region.code].tableData.length < 1) {
          delete formData.countries[region.code];
        } else {
          if (
            this.importedModuleData.status === 'live' &&
            this.pageQuery === 'view'
          ) {
            formData.countries[region.code].status = this.status.PUBLISHED;
            region.status = this.status.PUBLISHED;
          } else {
            formData.countries[region.code].status = this.status.SAVED;
            region.status = this.status.SAVED;
          }
        }
      }
    });

    this.formGroup.markAsPristine();

    return formData;
  }

  async updateRegion() {
    try {
      if (
        this.pageQuery === 'view' &&
        this.importedModuleData['deployedTo']?.includes('prod')
      ) {
        const action = {
          message:
            'This is Live SELECTOR CONFIG, it is deployed on prod, thus you need to enter the password to update it, ' +
            'after update it will be published automatically. ' +
            `${PROCEED_MESSAGE}UPDATE REGION?`,
          action: 'update',
          env: 'prod',
        };
        this.openActionDialog(action).subscribe(() => {
          this.loaderService.show();
          this.rokuService
            .updateRegionInSelectorConfig(
              this.moduleId,
              this.getSelectedRegionFormData(),
              this.selectedRegion.code,
            )
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              async (res) => {
                await this.getSelectorConfigById();
                if (this.importedModuleData.status === 'live') {
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
          .updateRegionInSelectorConfig(
            this.moduleId,
            this.getSelectedRegionFormData(),
            this.selectedRegion.code,
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            async (res) => {
              await this.getSelectorConfigById();
              if (this.importedModuleData.status === 'live') {
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

  getSelectedRegionFormData() {
    let regionData: any = {
      tableData: [],
      status: null,
    };
    this.rowsOrderObject[this.selectedRegion.code].forEach((sku, index) => {
      regionData.tableData[index] = {};
      const rowData = regionData.tableData[index];
      rowData.order = index + 1;
      this.rowFieldsArray.forEach((fieldName) => {
        const fieldValue = this.formGroup.value.regions[
          this.selectedRegion.code
        ][sku][fieldName];
        rowData[fieldName] = !!fieldValue;
      });
    });

    if (this.importedModuleData.status === 'live') {
      regionData.status = this.status.PUBLISHED;
      this.selectedRegion.status = this.status.PUBLISHED;
    } else {
      regionData.status = this.status.SAVED;
      this.selectedRegion.status = this.status.SAVED;
    }

    ((this.formGroup.controls.regions as FormGroup).controls[
      this.selectedRegion.code
    ] as FormGroup).markAsPristine();

    return regionData;
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

  clearAll(): void {
    const action = {
      message: PROCEED_MESSAGE + 'CLEAR ALL?',
      action: 'prompt',
    };

    this.openActionDialog(action).subscribe(() => {
      this.fillTable(this.defaultSelectorConfig, 'clear');
      this.formGroup.markAsDirty();
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
      this.fillRegion(this.defaultSelectorConfig, this.selectedRegion);
      this.selectedRegion.status = this.status.UNSAVED;
      (this.formGroup.get([
        'regions',
        this.selectedRegion.code,
      ]) as FormGroup).markAsDirty();
    });
  }

  noUnsavedRegions(): boolean {
    return this.regionsLanguagesBinding.every((region) => {
      return region.status !== this.status.UNSAVED;
    });
  }

  isPublishButtonDisabled(): boolean {
    return (
      this.pageQuery !== 'view' ||
      this.formGroup.invalid ||
      !this.noUnsavedRegions()
    );
  }

  async publish() {
    const action = {
      message: PROCEED_MESSAGE + 'PUBLISH?',
      action: 'rokuPublish',
      module: 'selector-config',
      id: this.moduleId,
    };
    this.openActionDialog(action).subscribe((res) => {
      this.publishModule(this.moduleId, res);
    });
  }

  async publishModule(selectorConfigId: number, env: string) {
    try {
      this.loaderService.show();
      const tardisToken = localStorage.getItem('tardisToken');
      const tardisTokenExpiresAt = localStorage.getItem('tardisTokenExpiresAt');
      this.rokuService
        .publishSelectorConfig(selectorConfigId, env, {
          tardisToken,
          tardisTokenExpiresAt,
        })
        .subscribe(
          async (res) => {
            this.showResponseSnackbar(res);
            await this.getSelectorConfigById();
            this.regionsLanguagesBinding.forEach((region) => {
              if (this.importedModuleData['countries'][region.code]) {
                region.status = this.status.PUBLISHED;
              }
            });
            this.loaderService.hide();
          },
          (err) => {
            this.showErrorSnackbar(err);
            this.loaderService.hide();
          },
        );
    } catch (err) {
      this.showErrorSnackbar(err);
      this.loaderService.hide();
    }
  }

  async getSelectorConfigById() {
    const res = await this.rokuService
      .getSelectorConfig(this.moduleId)
      .toPromise();
    this.importedModuleData = res.data;
    this.formGroup.controls.selectorConfigName.setValidators(
      identityCheckValidator(
        this.allSelectorConfigModules,
        'name',
        this.importedModuleData.name,
        this.pageQuery,
      ),
    );

    if (this.importedModuleData.isDefault) {
      this.defaultSelectorConfig = this.importedModuleData;
    }
  }

  canNotNavigateBack(): boolean {
    if (this.ignoreDialog) {
      return false;
    } else {
      return this.formGroup.valid && this.formGroup.dirty;
    }
  }

  navigateBack(): void {
    if (
      this.formGroup.valid &&
      this.formGroup.dirty &&
      !this.isOuterSaveButtonDisabled()
    ) {
      const action = {
        message:
          'There are unsaved changes that will be lost. Do you wish to save changes?' +
          `${
            this.importedModuleData.status === ModuleStatus.LIVE &&
            this.pageQuery === 'view'
              ? ' This is Live SELECTOR CONFIG, after save it will be published automatically. '
              : ''
          }`,
        action: 'rokuSave',
      };
      this.openActionDialog(action).subscribe((res) => {
        switch (res) {
          case 'save':
            this.subject.next(false);
            this.rokuFormsUtils.setProperHistory(
              'sku/selector-config',
              this.router,
            );
            this.saveAll();
            break;
          case 'leave':
            this.ignoreDialog = true;
            this.subject.next(true);
            this.rokuFormsUtils.navigateBack('sku/selector-config');
            break;
          case 'cancel':
            this.subject.next(false);
            this.rokuFormsUtils.setProperHistory(
              'sku/selector-config',
              this.router,
            );
            break;
        }
      });
    } else {
      this.ignoreDialog = true;
      this.subject.next(true);
      this.rokuFormsUtils.navigateBack('sku/selector-config');
    }
  }

  showPublishButton() {
    return (
      this.importedModuleData.status !== ModuleStatus.DRAFT &&
      !(
        this.importedModuleData.status === ModuleStatus.LIVE &&
        this.pageQuery === 'view'
      )
    );
  }

  showResponseSnackbar(res: any) {
    this.snackbarService.show(
      res.message,
      'OK',
      `/roku/sku/selector-config/view/${
        !!this.moduleId ? this.moduleId : res.data.selectorConfigId
      }`,
      this.router,
      5000,
    );
  }

  showErrorSnackbar(err: any) {
    this.snackbarService.show(
      `${err.message}`,
      'ERROR',
      `/roku/sku/selector-config`,
      this.router,
      10000,
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.loaderService.hide();
  }
}
