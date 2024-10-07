import {
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ViewChild,
} from '@angular/core';
import { ConfigurationService } from '../../../../service/configuration.service';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AndroidService } from '../../../../service/android.service';
import { LoaderService } from '../../../../service/loader.service';
import { Observable, Subject, Subscription, combineLatest } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseComponent } from '../../../base/base.component';
import { elementAt, filter, takeUntil } from 'rxjs/operators';
import { PROCEED_MESSAGE } from '../../../../constants';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { AndroidManagementService } from '../../../../service/androidManagement.service';
import { ModuleStatus } from '../../../../types/androidEnum';
import { AndroidEnv } from '../../../../types/enum';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

@Component({
  selector: 'sku-grid',
  templateUrl: './sku-grid.component.html',
  styleUrls: ['./sku-grid.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AndroidSKUGridComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public regionsLanguagesBinding: any[] = [];
  public skuModuleData: any[] = [];
  public regionsArray: string[] = [];
  public pageQuery: string;

  public skuTableHeaders: string[] = [
    'SKU NAME',
    'STORE SKU ID',
    'SKU ID',
    'LINK ID',
    'FLOW',
    'REGIONS',
    'PUBLISH',
    '',
  ];
  public skuDataKeys: string[] = [
    'skuName',
    'storeSkuId',
    'skuId',
    'linkId',
    'flow',
    'supportedRegions',
    'isPublished',
    'actions',
  ];
  public skuFiltersHeaders: string[] = [
    'SKU NAME',
    'STORE SKU ID',
    'SKU ID',
    'LINK ID',
    'FLOW',
    'REGIONS',
    'PUBLISH',
    'PROMOTED',
  ];
  public skuData: MatTableDataSource<any>;
  public showFiltersBlock = false;
  public skuNameSearchFilter = '';
  public skuStoreSkuIdSearchFilter = '';
  public skuSkuIdSearchFilter = '';
  public skuLinkIdSearchFilter = '';
  public skuStatusCheckboxesValues: string[] = [];
  public skuStatusCheckedValues: string[] = [];
  public skuFlowSearchFilter: string = '';
  public skuSupportedRegionsCheckboxesValues: string[] = [];
  public skuSupportedRegionsCheckedValues: string[] = [];
  public showArchivedSku: boolean = false;
  public skuEnvCheckedValue: string = '';
  public skuPromoteCheckedValue: string = '';
  public publishOptions: string[] = ['published', 'not-published'];
  public promotionOptions: string[] = ['promoted', 'not-promoted'];
  public currentEnv;

  private dialogResponseSubscription: Subscription;
  private regionsLanguagesSubscription: Subscription;
  private skuPackagesSubscription: Subscription;
  private defaultModule: any;
  private defaultCountries: string[];
  private destroy$ = new Subject<void>();
  private currentStore;
  private currentProduct;
  private allSkuModuleData: any[] = [];
  private allEnv: any[] = [];
  private prodEnv: any = null;
  private allEnvSubscription: Subscription;

  @ViewChild('skuTable', { read: MatSort, static: true }) skuSort: MatSort;
  @ViewChild('skuListViewPaginator') skuPaginator: MatPaginator;

  constructor(
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    private configurationService: ConfigurationService,
    private formBuilder: FormBuilder,
    private androidService: AndroidService,
    private activatedRoute: ActivatedRoute,
    private androidManagementService: AndroidManagementService,
  ) {
    super(dialog, loaderService, router);
    this.skuData = new MatTableDataSource();
  }

  ngOnInit(): void {
    combineLatest([
      this.androidService.env,
      this.androidService.store,
      this.androidService.product,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArr) => {
        this.loaderService.show();
        this.currentEnv = resultArr[0];
        this.currentStore = resultArr[1];
        this.currentProduct = resultArr[2];
        this.setRegionsLanguages();
      });
  }

  setRegionsLanguages() {
    this.regionsLanguagesSubscription = this.androidService
      .getRegionsLanguages(this.currentStore.code, this.currentProduct.code)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.regionsLanguagesBinding = Object.values(res.data).map(
          (region: any) => {
            const languagesCodes: any[] = Object.keys(region.languages);
            const languages: any[] = Object.values(region.languages).map(
              (language: any, index) => {
                return { code: languagesCodes[index], name: language.name };
              },
            );
            return {
              code: region.code,
              name: region.name,
              languages,
            };
          },
        );
        this.allEnvChange();
      });
  }

  allEnvChange() {
    this.allEnvSubscription = this.androidService.allEnv
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value !== null) {
          this.allEnv = value;
          if (!!this.allEnv.length) {
            this.prodEnv = this.allEnv.find(
              (module) => module.code === AndroidEnv.PROD,
            );
            this.setSKUTableData();
          }
        }
      });
  }

  setSKUTableData(): void {
    this.skuPackagesSubscription = this.androidService
      .getAllSkus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res && res.data) {
          let data: any[] = res.data;
          data.reverse();
          this.allSkuModuleData = [...data];
          this.allSkuModuleData.forEach(
            (module) => (module.skuName = module.name),
          );

          data = data.filter(
            (elem) =>
              elem.envId === this.currentEnv.envId &&
              elem.storeId === this.currentStore.storeId &&
              elem.productId === this.currentProduct.productId,
          );

          if (data.length) {
            this.setSkuData(data);
          } else {
            this.skuStatusCheckboxesValues = [];
            this.skuSupportedRegionsCheckboxesValues = [];
            this.skuModuleData = [];
            this.skuData = new MatTableDataSource();
          }
          this.getSkuFiltersFromLocalStorage();
          this.applyFilter();
          this.loaderService.hide();
        }
      });
  }

  setSkuData(data: any[]): void {
    const statusSet = new Set<string>();
    const allRegionsSet = new Set<string>();

    this.skuModuleData = data.map((module) => {
      const regionsSet = new Set<string>();
      const statusTitle: string =
        module.status.charAt(0).toUpperCase() + module.status.slice(1);
      Object.keys(module.countries).forEach((country: string) => {
        regionsSet.add(country);
        allRegionsSet.add(country);
      });
      statusSet.add(statusTitle);
      let flow = '';
      Object.values(module.countries).forEach((region: any) => {
        Object.values(region.languages).forEach((language: any) => {
          if (!!language.flow) {
            flow = language.flow;
          }
        });
      });

      return {
        skuName: module.name,
        linkId: module.linkId,
        statusTitle,
        status: module.status,
        supportedRegions: Array.from(regionsSet).sort().join(', '),
        regions: Array.from(regionsSet).sort(),
        storeSkuId: module.storeSkuId,
        skuId: module.skuId,
        active: module.active,
        envId: module.envId,
        promotionId: module.promotionId,
        hasChanges: module.hasChanges,
        isPublished: module.isPublished,
        isArchived: module.isArchived,
        usedInLiveCampaign: module.usedInLiveCampaign,
        flow,
        needToPromote: module.needToPromote,
        promotedAt: module.promotedAt,
      };
    });
    this.skuStatusCheckboxesValues = Array.from(statusSet).sort();
    this.skuSupportedRegionsCheckboxesValues = Array.from(allRegionsSet).sort();
    this.skuData = new MatTableDataSource(this.skuModuleData);
  }

  menuAction(type, element) {
    switch (type) {
      case 'DUPLICATE-SKU':
        if (this.currentEnv.code === AndroidEnv.PROD) {
          this.androidService.setEnv(this.androidService.devEnv);
        }
        this.router.navigate(['/android/sku/duplicate', element.skuId]);
        break;
      case 'VIEW-SKU':
        this.router.navigate(['/android/sku/view', element.skuId]);
        break;
      case 'PROMOTE-SKU-QA':
        const promoteQAAction = {
          message: `${PROCEED_MESSAGE}PROMOTE to QA "${element.skuName}" Sku module?`,
          action: 'prompt',
          promoteEnv: AndroidEnv.QA,
        };
        this.openActionDialog(type, element, promoteQAAction);
        break;
      case 'PROMOTE-SKU-PROD':
        const promoteProdAction = {
          message: `${PROCEED_MESSAGE}PROMOTE to Production "${element.skuName}" Sku module?`,
          action: 'prompt',
          promoteEnv: AndroidEnv.PROD,
        };
        this.openActionDialog(type, element, promoteProdAction);
        break;
      case 'DEFAULT':
        let defaultAction;
        if (element.isPublished) {
          if (this.currentEnv.code === AndroidEnv.PROD) {
            defaultAction = {
              message: `${PROCEED_MESSAGE}${type}?`,
              action: 'androidDefault',
              env: this.currentEnv.code,
            };
          }
        } else {
          defaultAction = {
            message: `${PROCEED_MESSAGE}${type}?`,
            action: 'androidDefault',
          };
        }
        this.openActionDialog(type, element, defaultAction);
        break;
      case 'ARCHIVE':
        const archiveAction = {
          message: `${PROCEED_MESSAGE}${
            !element.isArchived ? 'ARCHIVE' : 'UNARCHIVE'
          }?`,
          action: 'androidArchive',
          module: 'sku',
          id: element.skuId,
        };
        this.openActionDialog(type, element, archiveAction);
        break;
    }
  }

  pullPromotionSkuAction(element) {
    const promotionSkuModule = this.allSkuModuleData.find(
      (module) => module.skuId === element.promotionId,
    );
    const action = {
      message: `Do you wish to ACCEPT or DISCARD changes made in "${promotionSkuModule.skuName}" Client Dev Sku module?`,
      action: 'androidPullPromotionModule',
      promoteEnv: this.currentEnv.code,
    };
    this.openActionDialog('PULL-PROMOTION-SKU', element, action);
  }

  createNewSKU() {
    this.router.navigate(['/android/sku/create']);
  }

  toggleFiltersBlock() {
    this.showFiltersBlock = !this.showFiltersBlock;
  }

  editFilterValue(event, columnName: string, value?: string): void {
    const filterValue = event.target?.value;
    switch (columnName) {
      case 'name':
        this.skuNameSearchFilter = filterValue;
        break;
      case 'storeSkuId':
        this.skuStoreSkuIdSearchFilter = filterValue;
        break;
      case 'skuId':
        this.skuSkuIdSearchFilter = filterValue;
        break;
      case 'linkId':
        this.skuLinkIdSearchFilter = filterValue;
        break;
      case 'flow':
        this.skuFlowSearchFilter = filterValue;
        break;
      case 'status':
        if (event.checked) {
          this.skuStatusCheckedValues.push(value as string);
        } else {
          const index = this.skuStatusCheckedValues.indexOf(value as string);
          if (index !== -1) {
            this.skuStatusCheckedValues.splice(index, 1);
          }
        }
        break;
      case 'regions':
        if (event.checked) {
          this.skuSupportedRegionsCheckedValues.push(value as string);
        } else {
          const index = this.skuSupportedRegionsCheckedValues.indexOf(
            value as string,
          );
          if (index !== -1) {
            this.skuSupportedRegionsCheckedValues.splice(index, 1);
          }
        }
        break;
    }
    this.applyFilter();
    this.setSkuFiltersInLocalStorage();
  }

  checkSkuCheckboxAction(event, filter: string, option: string): void {
    switch (filter) {
      case 'env':
        if (event.checked) {
          this.skuEnvCheckedValue = option;
        } else {
          this.skuEnvCheckedValue = '';
        }
        break;
      case 'promote':
        if (event.checked) {
          this.skuPromoteCheckedValue = option;
        } else {
          this.skuPromoteCheckedValue = '';
        }
        break;
    }
    this.applyFilter();
    this.setSkuFiltersInLocalStorage();
  }

  applyFilter(): void {
    if (this.skuModuleData.length) {
      this.skuData = new MatTableDataSource(
        this.skuModuleData.filter((elem) => {
          const includeArchivedSku = !!this.showArchivedSku
            ? true
            : !elem.isArchived;
          const includeName =
            this.skuNameSearchFilter !== ''
              ? elem.skuName
                  .toLowerCase()
                  .includes(this.skuNameSearchFilter.toLowerCase())
              : true;
          const includeStoreSkuId =
            this.skuStoreSkuIdSearchFilter !== ''
              ? elem.storeSkuId
                  .toString()
                  .includes(this.skuStoreSkuIdSearchFilter)
              : true;
          const includeSkuId =
            this.skuSkuIdSearchFilter !== ''
              ? elem.skuId.toString().includes(this.skuSkuIdSearchFilter)
              : true;
          const includeLinkId =
            this.skuLinkIdSearchFilter !== ''
              ? elem.linkId !== null
                ? elem.linkId
                    .toLowerCase()
                    .includes(this.skuLinkIdSearchFilter.toLowerCase())
                : false
              : true;
          const includeFlow =
            this.skuFlowSearchFilter !== ''
              ? elem.flow
                  .toLowerCase()
                  .includes(this.skuFlowSearchFilter.toLowerCase())
              : true;
          const includeSupportedRegions = this.skuSupportedRegionsCheckedValues
            .length
            ? this.skuSupportedRegionsCheckedValues.every((region) =>
                elem['regions'].includes(region),
              )
            : true;
          const foundImportedModule = this.allSkuModuleData.find(
            (module) => module.skuId === elem.skuId,
          );
          const includeEnv = !!this.skuEnvCheckedValue
            ? this.skuEnvCheckedValue === this.publishOptions[0]
              ? !!foundImportedModule.isPublished
              : !foundImportedModule.isPublished
            : true;
          const includePromote = !!this.skuPromoteCheckedValue
            ? this.skuPromoteCheckedValue === this.promotionOptions[0]
              ? !!elem.promotedAt
              : !elem.promotedAt
            : true;
          return (
            includeArchivedSku &&
            includeName &&
            includeStoreSkuId &&
            includeSkuId &&
            includeLinkId &&
            includeFlow &&
            includeSupportedRegions &&
            includeEnv &&
            includePromote
          );
        }),
      );
    } else {
      this.skuData = new MatTableDataSource();
    }
    this.skuData.sort = this.skuSort;
    this.skuData.paginator = this.skuPaginator;
  }

  getSkuFiltersFromLocalStorage(): void {
    const skuFiltersStr = localStorage.getItem(this.getFiltersConfigName());
    if (!!skuFiltersStr) {
      const skuFilterObj = JSON.parse(skuFiltersStr);
      this.skuNameSearchFilter =
        !!skuFilterObj && !!skuFilterObj.skuNameSearchFilter
          ? skuFilterObj.skuNameSearchFilter
          : '';
      this.skuStoreSkuIdSearchFilter =
        !!skuFilterObj && !!skuFilterObj.skuStoreSkuIdSearchFilter
          ? skuFilterObj.skuStoreSkuIdSearchFilter
          : '';
      this.skuSkuIdSearchFilter =
        !!skuFilterObj && !!skuFilterObj.skuSkuIdSearchFilter
          ? skuFilterObj.skuSkuIdSearchFilter
          : '';
      this.skuLinkIdSearchFilter =
        !!skuFilterObj && !!skuFilterObj.skuLinkIdSearchFilter
          ? skuFilterObj.skuLinkIdSearchFilter
          : '';
      this.skuFlowSearchFilter =
        !!skuFilterObj && !!skuFilterObj.skuFlowSearchFilter
          ? skuFilterObj.skuFlowSearchFilter
          : '';
      this.skuSupportedRegionsCheckedValues =
        !!skuFilterObj && !!skuFilterObj.skuSupportedRegionsCheckedValues
          ? JSON.parse(skuFilterObj.skuSupportedRegionsCheckedValues)
          : [];
      this.skuEnvCheckedValue =
        !!skuFilterObj && !!skuFilterObj.skuEnvCheckedValue
          ? skuFilterObj.skuEnvCheckedValue
          : '';
      this.skuPromoteCheckedValue =
        !!skuFilterObj && !!skuFilterObj.skuPromoteCheckedValue
          ? skuFilterObj.skuPromoteCheckedValue
          : '';
      this.showArchivedSku =
        !!skuFilterObj && skuFilterObj.showArchivedSku !== undefined
          ? skuFilterObj.showArchivedSku
          : false;
    } else {
      this.clearAllSkuFilters();
    }
  }

  setSkuFiltersInLocalStorage(): void {
    const skuFilterObj = {
      skuNameSearchFilter: this.skuNameSearchFilter,
      skuStoreSkuIdSearchFilter: this.skuStoreSkuIdSearchFilter,
      skuSkuIdSearchFilter: this.skuSkuIdSearchFilter,
      skuLinkIdSearchFilter: this.skuLinkIdSearchFilter,
      skuFlowSearchFilter: this.skuFlowSearchFilter,
      skuSupportedRegionsCheckedValues: JSON.stringify(
        this.skuSupportedRegionsCheckedValues,
      ),
      skuEnvCheckedValue: this.skuEnvCheckedValue,
      skuPromoteCheckedValue: this.skuPromoteCheckedValue,
      showArchivedSku: this.showArchivedSku,
    };
    localStorage.setItem(
      this.getFiltersConfigName(),
      JSON.stringify(skuFilterObj),
    );
  }

  getFiltersConfigName(): string {
    return `${this.currentStore.code}-${this.currentProduct.code}-${this.currentEnv.code}-sku-filters`;
  }

  openActionDialog(type, element, receivedAction?) {
    let action = {};
    if (receivedAction) {
      action = receivedAction;
    } else {
      action['message'] = PROCEED_MESSAGE + type + '?';
      action['action'] = 'prompt';
    }
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            switch (type) {
              case 'ARCHIVE':
                this.archiveSku(element.skuId);
                break;
              case 'PUBLISH-SKU':
                this.publishSkuModule(this.getPublishPayload());
                break;
              case 'PROMOTE-SKU-QA':
              case 'PROMOTE-SKU-PROD':
                this.promoteSkuModule(element.skuId, receivedAction.promoteEnv);
                break;
              case 'PULL-PROMOTION-SKU':
                this.pullPromotionSku(
                  element.skuId,
                  receivedAction.promoteEnv,
                  result,
                );
                break;
            }
          }
        });
    }
  }

  async promoteSkuModule(skuId: number, env: string) {
    try {
      this.loaderService.show();
      const response = await this.androidService
        .promoteSku(skuId, env)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async pullPromotionSku(skuId: number, env: string, acceptChanges: string) {
    try {
      this.loaderService.show();
      const response = await this.androidService
        .pullPromotionSku(skuId, env, acceptChanges === 'true')
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async publishSkuModule(payload) {
    try {
      this.loaderService.show();
      const response = await this.androidService
        .publishSku(payload)
        .toPromise();
      if (response.status < 400) {
        localStorage.setItem('tardisToken', response.data.tardisToken);
        localStorage.setItem(
          'tardisTokenExpiresAt',
          response.data.tardisTokenExpiresAt,
        );
      }
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  archiveSku(skuId: number): void {
    try {
      this.loaderService.show();
      this.androidService
        .archiveSku(skuId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.openResponseDialog(res);
        });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  openResponseDialog(response): void {
    super
      .openResponse(response)
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result) {
          this.androidManagementService.refreshTablePageNavigation(this.router);
        }
      });
  }

  isElementChecked(elem: any, checkedValuesArr: any[]): boolean {
    const checkedSet = new Set<string>(checkedValuesArr);
    return checkedSet.has(elem);
  }

  clearSearchInput(searchFilter: string, ref): void {
    ref.value = '';
    this[searchFilter] = '';
    this.applyFilter();
    this.setSkuFiltersInLocalStorage();
  }

  isCountryEqualToDeafult(countryCode: string, country: any): boolean {
    const defaultCountriesCodes: any = Object.keys(
      this.defaultModule.countries,
    );
    const countryIndex: any = defaultCountriesCodes.indexOf(countryCode);
    const defaultCountry: any = Object.values(this.defaultModule.countries)[
      countryIndex
    ];
    if (defaultCountry) {
      const countryJSON = this.getJSONFromCountry(country);
      const defaultCountryJSON = this.getJSONFromCountry(defaultCountry);
      return countryJSON === defaultCountryJSON;
    } else {
      return false;
    }
  }

  getJSONFromCountry(country: any): string {
    const tableDataCodes: any[] = Object.keys(country.tableData);
    const tableDataValues = Object.values(country.tableData)
      .sort()
      .map((elem: any) => JSON.stringify(elem));
    const resultArr: string[] = [];
    tableDataCodes.forEach((code, i) => {
      resultArr.push(`${code}/${tableDataValues[i]}`);
    });
    return resultArr.join('//');
  }

  toggleArchivedSku(): void {
    this.showArchivedSku = !this.showArchivedSku;
    this.skuStatusCheckedValues = this.skuStatusCheckedValues.filter(
      (elem) => elem !== 'Archived',
    );
    this.applyFilter();
    this.setSkuFiltersInLocalStorage();
  }

  canArchiveSku(module: any): boolean {
    const foundModule = this.allSkuModuleData.find(
      (importedModule) => module.skuId === importedModule.skuId,
    );
    return module.status !== ModuleStatus.ARCHIVED && !foundModule.isPublished;
  }

  canEditSku(module: any): boolean {
    return !module.isArchived;
  }

  canPromoteModule(module: any): boolean {
    const foundModule = this.allSkuModuleData.find(
      (importedModule) => module.skuId === importedModule.skuId,
    );
    return (
      this.currentEnv.code !== AndroidEnv.PROD &&
      this.currentEnv.code !== AndroidEnv.QA &&
      !!foundModule &&
      !!foundModule.isPublished &&
      !foundModule.isArchived
    );
  }

  getEditHRef(element) {
    return `/#/android/sku/view/${element.skuId}`;
  }

  changePublishCheckbox(skuId: number) {
    this.skuModuleData.forEach((module) => {
      if (module.skuId === skuId) {
        module.isPublished = !module.isPublished;
      }
    });
    this.applyFilter();
    this.setSkuFiltersInLocalStorage();
  }

  publishList() {
    this.openActionDialog('PUBLISH-SKU', null, {
      message: `${PROCEED_MESSAGE}the changes below?`,
      action: 'androidListPublish',
      showPasswordField: this.currentEnv.code === AndroidEnv.PROD,
      changes: this.androidManagementService.getModulesListChanges(
        this.allSkuModuleData.filter(
          (elem) =>
            elem.envId === this.currentEnv.envId &&
            elem.storeId === this.currentStore.storeId &&
            elem.productId === this.currentProduct.productId,
        ),
        this.skuModuleData,
        'skuId',
        'storeSkuId',
      ),
      envTitle: this.currentEnv.name,
    });
  }

  getPublishPayload(doNotChangeActive?) {
    const tardisToken = localStorage.getItem('tardisToken');
    const tardisTokenExpiresAt = localStorage.getItem('tardisTokenExpiresAt');
    const publishSkuModules = this.skuModuleData.filter((module) => {
      return !!module.isPublished;
    });
    const data = publishSkuModules.map((module) => {
      return module.skuId;
    });
    return {
      data,
      envId: this.currentEnv.envId,
      storeId: this.currentStore.storeId,
      productId: this.currentProduct.productId,
      tardisToken,
      tardisTokenExpiresAt,
      doNotChangeActive: !!doNotChangeActive,
    };
  }

  getPageSizeOptions(): any[] {
    return this.androidManagementService.getPageSizeOptions();
  }

  getPageSize(module: string): number {
    return this.androidManagementService.getPageSize(module);
  }

  setPageSize(event, module: string): void {
    this.androidManagementService.setPageSize(module, event.pageSize);
  }

  clearAllSkuFilters(): void {
    this.skuNameSearchFilter = '';
    this.skuStoreSkuIdSearchFilter = '';
    this.skuSkuIdSearchFilter = '';
    this.skuLinkIdSearchFilter = '';
    this.skuFlowSearchFilter = '';
    this.skuSupportedRegionsCheckedValues = [];
    this.skuEnvCheckedValue = '';
    this.skuPromoteCheckedValue = '';
    this.showArchivedSku = false;
    this.applyFilter();
    this.setSkuFiltersInLocalStorage();
  }

  getPromotionIconTooltipText(element: any): string {
    if (
      (!!element.isArchived && !!element.hasChanges) ||
      (!!element.isArchived &&
        !!element.promotedAt &&
        !element.needToPromote) ||
      (!!element.isArchived && !!element.promotedAt && !!element.needToPromote)
    ) {
      return 'This record was archived';
    } else if (!!element.hasChanges) {
      return 'Module has unstagged changes';
    } else if (!!element.promotedAt && !element.needToPromote) {
      return 'Module has been promoted';
    } else if (!!element.promotedAt && !!element.needToPromote) {
      return 'Module needs promotion';
    } else {
      return '';
    }
  }

  getPromotionIconClass(element: any) {
    if (
      this.currentEnv.code !== AndroidEnv.PROD &&
      this.currentEnv.code !== AndroidEnv.QA &&
      !this.canPromoteModule(element)
    ) {
      return 'disabled';
    } else if (
      (!!element.isArchived && !!element.hasChanges) ||
      (!!element.isArchived &&
        !!element.promotedAt &&
        !element.needToPromote) ||
      (!!element.isArchived && !!element.promotedAt && !!element.needToPromote)
    ) {
      return 'archived';
    } else if (!!element.hasChanges) {
      return 'changes';
    } else if (!!element.promotedAt && !element.needToPromote) {
      return 'promoted';
    } else if (!!element.promotedAt && !!element.needToPromote) {
      return 'need-promote';
    } else {
      return '';
    }
  }

  getAttentionIconTooltipText(element: any): string {
    if (
      this.currentEnv.code === AndroidEnv.PROD ||
      this.currentEnv.code === AndroidEnv.QA
    ) {
      return !!element.promotionId && !this.isOriginalModuleExist(element)
        ? 'Client Dev record was deleted'
        : !!element.promotionId && !!this.isOriginalModuleArchived(element)
        ? 'Client Dev record was archived'
        : '';
    } else {
      return !!element.promotedAt && !this.isPromotedModuleExist(element)
        ? 'Production record was deleted'
        : !!element.promotedAt && !!this.isPromotedModuleArchived(element)
        ? 'Production record was archived'
        : '';
    }
  }

  isOriginalModuleExist(element): boolean {
    const foundOriginalSkuModule = this.allSkuModuleData.find(
      (module) =>
        module.skuId === element.promotionId &&
        module.envId === this.androidService.devEnv.envId,
    );
    return !!foundOriginalSkuModule;
  }

  isPromotedModuleExist(element): boolean {
    const foundPromotedAppCopyModule = this.allSkuModuleData.find(
      (module) =>
        module.promotionId === element.skuId &&
        module.envId === this.prodEnv.envId,
    );
    return !!foundPromotedAppCopyModule;
  }

  isOriginalModuleArchived(element): boolean {
    const foundOriginalSkuModule = this.allSkuModuleData.find(
      (module) =>
        module.skuId === element.promotionId &&
        module.envId === this.androidService.devEnv.envId,
    );
    return !!foundOriginalSkuModule && !!foundOriginalSkuModule.isArchived;
  }

  isPromotedModuleArchived(element): boolean {
    const foundPromotedSkuModule = this.allSkuModuleData.find(
      (module) =>
        module.promotionId === element.skuId &&
        module.envId === this.prodEnv.envId,
    );
    return !!foundPromotedSkuModule && !!foundPromotedSkuModule.isArchived;
  }

  ngOnDestroy(): void {
    this.allEnvSubscription.unsubscribe();
    this.regionsLanguagesSubscription.unsubscribe();
    this.skuPackagesSubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
