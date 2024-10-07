import {
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ViewChild,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { RokuService } from '../../../../service/roku.service';
import { LoaderService } from '../../../../service/loader.service';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BaseComponent } from '../../../base/base.component';
import { takeUntil } from 'rxjs/operators';
import { PROCEED_MESSAGE } from '../../../../constants';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { ModuleStatus } from '../../../../types/rokuEnum';
import { RokuManagementUtils } from '../../../../utils/rokuManagement.utils';
import { RokuFormsUtils } from '../../../../utils/roku-forms.utils';

@Component({
  selector: 'app-copy-grid',
  templateUrl: './app-copy-grid.component.html',
  styleUrls: ['./app-copy-grid.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RokuAppCopyGridComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public regionsLanguagesBinding: any[];
  public modulePackages: any[] = [];
  public regionsArray: string[] = [];
  public tableHeaders: string[] = [
    'COPY PACKAGE NAME',
    'REGIONS',
    'PUBLISH',
    'ACTIVE',
    '',
  ];
  public dataKeys: string[] = [
    'appCopyName',
    'supportedRegions',
    'isPublished',
    'isActive',
    'actions',
  ];
  public filtersHeaders: string[] = [
    'COPY PACKAGE NAME',
    'REGIONS',
    'PUBLISH',
    'PROMOTED',
    'ACTIVE',
  ];
  public filtersKeys: string[] = [
    'appCopyName',
    'supportedRegions',
    'isPublished',
    'isActive',
  ];
  public data: MatTableDataSource<any>;
  public showFiltersBlock: boolean = false;
  public searchFilter = '';
  public statusCheckboxesValues: string[] = [];
  public regionsCheckboxesValues: string[] = [];
  public statusCheckedValues: string[] = [];
  public regionsCheckedValues: string[] = [];
  public envCheckedValue: string = '';
  public promoteCheckedValue: string = '';
  public activeCheckedValue: string = '';
  public publishOptions: string[] = ['published', 'not-published'];
  public promotionOptions: string[] = ['promoted', 'not-promoted'];
  public activeOptions: string[] = ['active', 'not-promoted'];
  public currentEnv;

  private dialogResponseSubscription: Subscription;
  private regionsLanguagesSubscription: Subscription;
  private modulePackagesSubscription: Subscription;
  private defaultModule: any;
  private defaultCountries: string[] = [];
  private destroy$ = new Subject<void>();
  private currentStore;
  private currentProduct;
  private allAppCopyModuleData: any[] = [];

  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild('listViewPaginator') paginator: MatPaginator;

  constructor(
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    private formBuilder: FormBuilder,
    private rokuService: RokuService,
    private rokuManagementUtils: RokuManagementUtils,
    private rokuFormsUtils: RokuFormsUtils,
  ) {
    super(dialog, loaderService, router);
    this.data = new MatTableDataSource();
  }

  ngOnInit(): void {
    combineLatest([
      this.rokuService.env,
      this.rokuService.store,
      this.rokuService.product,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArr) => {
        this.currentEnv = resultArr[0];
        this.currentStore = resultArr[1];
        this.currentProduct = resultArr[2];
        this.loaderService.show();
        this.setRegionsLanguages();
      });
  }

  changeCheckedFilters(filterName, element) {
    const checkedValuesSet = new Set<string>(
      this[filterName + 'CheckedValues'],
    );

    if (checkedValuesSet.has(element)) {
      checkedValuesSet.delete(element);
    } else {
      checkedValuesSet.add(element);
    }

    this[filterName + 'CheckedValues'] = Array.from(checkedValuesSet);
    this.reCheckFilters();
    this.setAppCopyFiltersInLocalStorage();
  }

  setRegionsLanguages() {
    this.regionsLanguagesSubscription = this.rokuService
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
        this.setTableData();
      });
  }

  setTableData() {
    this.modulePackagesSubscription = this.rokuService
      .getAllAppCopies()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res && res.data.length) {
          let data: any[] = res.data;
          data.reverse();
          this.allAppCopyModuleData = [...data];
          this.allAppCopyModuleData.forEach(
            (module) => (module.appCopyName = module.name),
          );

          data = data.filter(
            (elem) =>
              elem.envId === this.currentEnv.envId &&
              elem.storeId === this.currentStore.storeId &&
              elem.productId === this.currentProduct.productId,
          );

          if (data.length) {
            this.defaultModule = data.find(
              (module) => module.isDefault === true,
            );
            const defaultCountries = new Set<string>();
            if (!!this.defaultModule) {
              Object.values(this.defaultModule.platforms).forEach(
                (platform: any) => {
                  Object.keys(platform).forEach((country: any) => {
                    defaultCountries.add(country);
                  });
                },
              );
              this.defaultCountries = Array.from(defaultCountries);
            }
            this.setAppCopyData(data, defaultCountries);
            this.updateUI();
          } else {
            this.data = new MatTableDataSource();
            this.data.paginator = this.paginator;
            this.defaultModule = null;
          }
          this.getAppCopyFiltersFromLocalStorage();
          this.reCheckFilters();
          this.loaderService.hide();
        } else {
          this.defaultModule = null;
          this.loaderService.hide();
        }
      });
  }

  setAppCopyData(data: any[], defaultCountries: Set<string>): void {
    this.modulePackages = data.map((module) => {
      let supportedRegionsSet = new Set<string>();
      let regionsSet = new Set<string>();
      let tooltipText: string = '';
      if (!module.isDefault) {
        const platformsCodes = Object.keys(module.platforms);
        Object.values(module.platforms).forEach((platform: any, i) => {
          const countryCodes = Object.keys(platform);
          Object.values(platform).forEach((country: any, j) => {
            regionsSet.add(countryCodes[j]);
            if (
              !this.isCountryEqualToDeafult(
                platformsCodes[i],
                countryCodes[j],
                country,
              )
            ) {
              supportedRegionsSet.add(countryCodes[j]);
            }
          });
        });
        if (regionsSet.size && !supportedRegionsSet.size) {
          supportedRegionsSet = new Set<string>(['All Regions']);
        }
      } else {
        regionsSet = defaultCountries;
        supportedRegionsSet = defaultCountries;
      }
      tooltipText = Array.from(regionsSet).sort().join(', ');

      return {
        appCopyName: module.name,
        status: module.status,
        supportedRegions: Array.from(supportedRegionsSet).sort().join(', '),
        regions: Array.from(regionsSet).sort(),
        isDefault: module.isDefault,
        appCopyId: module.appCopyId,
        tooltipText,
        envId: module.envId,
        promotionId: module.promotionId,
        hasChanges: module.hasChanges,
        isPublished: module.isPublished,
        isActive: module.isActive,
        needToPromote: module.needToPromote,
        promotedAt: module.promotedAt,
      };
    });
  }

  pullPromotionAction(element) {
    const promotionModule = this.allAppCopyModuleData.find(
      (module) => module.appCopyId === element.promotionId,
    );
    const action = {
      message: `Do you wish to ACCEPT or DISCARD changes made in "${promotionModule.name}" Client Dev AppCopy module?`,
      action: 'rokuPullPromotionModule',
    };
    this.openActionDialog('PULL-PROMOTION', element, action);
  }

  isCountryEqualToDeafult(
    platformCode: string,
    countryCode: string,
    country: any,
  ): boolean {
    if (!!this.defaultModule) {
      const defaultPlatformsCodes: any = Object.keys(
        this.defaultModule.platforms,
      );
      const platformIndex: any = defaultPlatformsCodes.indexOf(platformCode);
      if (platformIndex !== -1) {
        const defaultPlatform: any = Object.values(
          this.defaultModule.platforms,
        )[platformIndex];
        const defaultCountriesCodes: any = Object.keys(defaultPlatform);
        const countryIndex: any = defaultCountriesCodes.indexOf(countryCode);
        const defaultCountry: any = Object.values(defaultPlatform)[
          countryIndex
        ];
        if (defaultPlatform && defaultCountry) {
          const countryJSON = this.getJSONFromCountry(country);
          const defaultCountryJSON = this.getJSONFromCountry(defaultCountry);
          return countryJSON === defaultCountryJSON;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  getJSONFromCountry(country: any): string {
    const languagesCodes: any[] = Object.keys(country.languages);
    const languagesValues = Object.values(country.languages).map((lang: any) =>
      JSON.stringify(lang, Object.keys(lang).sort()),
    );
    const resultArr: string[] = [];
    languagesCodes.forEach((code, i) => {
      resultArr.push(`${code}/${languagesValues[i]}`);
    });
    return resultArr.join('//');
  }

  menuAction(type, element) {
    switch (type) {
      case 'DUPLICATE':
        if (this.currentEnv.code === 'prod') {
          this.rokuService.setEnv(this.rokuService.devEnv);
        }
        this.router.navigate(['/roku/app-copy/duplicate', element.appCopyId]);
        break;
      case 'DEFAULT':
        this.openActionDialog(type, element, {
          message: `${PROCEED_MESSAGE}${type}?`,
          action: 'rokuListPublish',
          showPasswordField: this.currentEnv.code === 'prod',
        });
        break;
      case 'VIEW':
        this.router.navigate(['/roku/app-copy/view', element.appCopyId]);
        break;
      case 'PROMOTE':
        const promoteAction = {
          message: `${PROCEED_MESSAGE}PROMOTE "${element.appCopyName}" AppCopy module?`,
          action: 'prompt',
        };
        this.openActionDialog(type, element, promoteAction);
        break;
      case 'DELETE':
        const deleteAction = {
          message: `${PROCEED_MESSAGE}${type} "${element.appCopyName}"?`,
          action: 'rokuDelete',
          module: 'app-copy',
          id: element.appCopyId,
        };
        this.openActionDialog(type, element, deleteAction);
        break;
    }
  }

  defaultMenuAction(element: any): void {
    this.loaderService.show();
    this.rokuService
      .setAppCopyDefault(element.appCopyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (setRes) => {
          if (setRes) {
            const publishPayload = this.getPublishPayload();
            if (
              !!publishPayload &&
              !!publishPayload.data &&
              !!!!publishPayload.data.length
            ) {
              this.rokuService
                .publishAppCopy(this.getPublishPayload())
                .subscribe(() => {
                  this.openResponseDialog(setRes);
                });
            } else {
              this.openResponseDialog(setRes);
            }
          } else {
            this.loaderService.hide();
          }
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  getDefaultModule(): any {
    if (this.modulePackages.length) {
      let result: any;
      this.modulePackages.forEach((elem) => {
        if (elem.isDefault) {
          result = elem;
        }
      });
      return result;
    } else {
      return false;
    }
  }

  createNewCopy() {
    if (!!this.getDefaultModule()) {
      this.router.navigate(
        ['/roku/app-copy/duplicate', this.getDefaultModule().appCopyId],
        { queryParams: { create: true } },
      );
    } else {
      this.router.navigate(['/roku/app-copy/create']);
    }
  }

  async deleteModule(appCopyId: number) {
    try {
      this.loaderService.show();
      const response = await this.rokuService
        .deleteAppCopy(appCopyId)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async publishModule(payload) {
    try {
      this.loaderService.show();
      const response = await this.rokuService
        .publishAppCopy(payload)
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

  async activateModule(appCopyId: number, env: string) {
    try {
      this.loaderService.show();
      const tardisToken = localStorage.getItem('tardisToken');
      const tardisTokenExpiresAt = localStorage.getItem('tardisTokenExpiresAt');
      const response = await this.rokuService
        .activateAppCopy(appCopyId, env, {
          tardisToken,
          tardisTokenExpiresAt,
        })
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  toggleFiltersBlock() {
    this.showFiltersBlock = !this.showFiltersBlock;
  }

  openActionDialog(type, element, receivedAction?: any) {
    let action = {};
    if (receivedAction) {
      action = receivedAction;
    } else {
      action['message'] = `${PROCEED_MESSAGE} ${type}?`;
      action['action'] = 'prompt';
    }
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            switch (type) {
              case 'VIEW':
                this.router.navigate([
                  '/roku/app-copy/view',
                  element.appCopyId,
                ]);
                break;
              case 'DELETE':
                this.deleteModule(element.appCopyId);
                break;
              case 'PUBLISH':
                this.publishModule(this.getPublishPayload());
                break;
              case 'DEFAULT':
                this.defaultMenuAction(element);
                break;
              case 'PROMOTE':
                this.promoteAppCopyModule(element.appCopyId);
                break;
              case 'PULL-PROMOTION':
                this.pullPromotionAppCopy(element.appCopyId, result);
                break;
            }
          }
        });
    }
  }

  async promoteAppCopyModule(appCopyId: number) {
    try {
      this.loaderService.show();
      const response = await this.rokuService
        .promoteAppCopy(appCopyId)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async pullPromotionAppCopy(appCopyId: number, acceptChanges: string) {
    try {
      this.loaderService.show();
      const response = await this.rokuService
        .pullPromotionAppCopy(appCopyId, acceptChanges === 'true')
        .toPromise();
      this.openResponseDialog(response);
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
          this.rokuManagementUtils.refreshTablePageNavigation(this.router);
        }
      });
  }

  updateUI(): void {
    this.data = new MatTableDataSource(this.modulePackages);
    this.setUpSort();
    this.setupFilter();
    this.data.paginator = this.paginator;
  }

  setupFilter(): void {
    const records = this.modulePackages;

    // Getting status checkboxes array
    const statusSet = new Set<string>();
    for (const record of records) {
      if (!statusSet.has(record.statusTitle)) {
        statusSet.add(record.statusTitle);
      }
    }
    this.statusCheckboxesValues = Array.from(statusSet).sort();

    // Getting status checkboxes array
    const regionsSet = new Set<string>();
    for (const record of records) {
      for (const region of record.regions) {
        if (!regionsSet.has(region)) {
          regionsSet.add(region);
        }
      }
    }
    this.regionsCheckboxesValues = Array.from(regionsSet).sort();

    // setup mat table filter
    this.data.filterPredicate = (elem, filter: string) => {
      const columns = ['appCopyName'];

      const includeAppCopyNameSearch: boolean =
        this.searchFilter !== ''
          ? !!this.includesSearch(columns, elem, this.searchFilter)
          : true;
      const includeStatusesSearch: boolean =
        this.statusCheckedValues.length !== 0
          ? this.statusCheckedValues.some(
              (status) => elem['statusTitle'] === status,
            )
          : true;
      const includeRegionsSearch: boolean = this.regionsCheckedValues.length
        ? this.regionsCheckedValues.every((region) =>
            elem['regions'].includes(region),
          )
        : true;
      const foundImportedModule = this.allAppCopyModuleData.find(
        (module) => module.appCopyId === elem.appCopyId,
      );
      const includeEnv = !!this.envCheckedValue
        ? this.envCheckedValue === this.publishOptions[0]
          ? !!foundImportedModule.isPublished
          : !foundImportedModule.isPublished
        : true;
      const includePromote = !!this.promoteCheckedValue
        ? this.promoteCheckedValue === this.promotionOptions[0]
          ? !!elem.promotedAt
          : !elem.promotedAt
        : true;
      const includeActive = !!this.activeCheckedValue
        ? this.activeCheckedValue === this.activeOptions[0]
          ? !!foundImportedModule.isActive
          : !foundImportedModule.isActive
        : true;
      return (
        includeAppCopyNameSearch &&
        includeStatusesSearch &&
        includeRegionsSearch &&
        includeEnv &&
        includePromote &&
        includeActive
      );
    };
  }

  includesSearch(columns, data, filter) {
    for (const key of columns) {
      if (data[key]) {
        if (data[key].toString().toLowerCase().indexOf(filter) !== -1) {
          return true;
        }
      }
    }
  }

  setUpSort() {
    this.data.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'appCopyName':
          return item.appCopyName.toLowerCase();
        default:
          return item[property];
      }
    };
    this.data.sort = this.sort;
  }

  applyFilter($event, filterName: string): void {
    const filterValue =
      filterName === 'search' ? $event.currentTarget.value : $event.value;
    if (filterValue === 'ALL') {
      this[filterName + 'Filter'] = 'ALL';
    } else {
      this[filterName + 'Filter'] =
        filterName === 'search' ? filterValue.toLowerCase() : filterValue;
    }
    this.reCheckFilters();
    this.setAppCopyFiltersInLocalStorage();
  }

  clearSearchInput(): void {
    this.searchFilter = '';
    this.reCheckFilters();
    this.setAppCopyFiltersInLocalStorage();
  }

  canDeleteModule(module: any): boolean {
    const foundModule = this.allAppCopyModuleData.find(
      (importedModule) => module.appCopyId === importedModule.appCopyId,
    );
    return !module.isDefault && !foundModule.isPublished;
  }

  canSetDefaultModule(module: any): boolean {
    return !module.isDefault;
  }

  canPromoteModule(module: any): boolean {
    const foundModule = this.allAppCopyModuleData.find(
      (importedModule) => module.appCopyId === importedModule.appCopyId,
    );
    return (
      this.currentEnv.code !== 'prod' &&
      !!foundModule &&
      !!foundModule.isPublished
    );
  }

  clearAllFilters(): void {
    this.searchFilter = '';
    this.statusCheckedValues = [];
    this.envCheckedValue = '';
    this.promoteCheckedValue = '';
    this.activeCheckedValue = '';
    this.regionsCheckedValues = [];
    this.data.filter = '';
    this.setAppCopyFiltersInLocalStorage();
  }

  changeTableCheckbox(action: string, appCopyId: number) {
    switch (action) {
      case 'publish':
        this.modulePackages.forEach((module) => {
          if (module.appCopyId === appCopyId) {
            module.isPublished = !module.isPublished;
          }
        });
        break;
      case 'active':
        this.modulePackages.forEach((module) => {
          if (module.appCopyId === appCopyId) {
            module.isActive = !module.isActive;
          }
        });
        break;
    }
    this.reCheckFilters();
    this.setAppCopyFiltersInLocalStorage();
  }

  checkCheckboxAction(event, filter: string, option: string): void {
    switch (filter) {
      case 'env':
        if (event.checked) {
          this.envCheckedValue = option;
        } else {
          this.envCheckedValue = '';
        }
        break;
      case 'promote':
        if (event.checked) {
          this.promoteCheckedValue = option;
        } else {
          this.promoteCheckedValue = '';
        }
        break;
      case 'active':
        if (event.checked) {
          this.activeCheckedValue = option;
        } else {
          this.activeCheckedValue = '';
        }
        break;
    }
    this.reCheckFilters();
    this.setAppCopyFiltersInLocalStorage();
  }

  reCheckFilters(): void {
    this.data.filter = !this.searchFilter
      ? this.data.filter
      : this.searchFilter;
    this.data.filter = this.statusCheckedValues.length
      ? JSON.stringify(this.statusCheckedValues)
      : this.data.filter;
    this.data.filter = this.regionsCheckedValues.length
      ? JSON.stringify(this.regionsCheckedValues)
      : this.data.filter;
    this.data.filter = !!this.envCheckedValue
      ? this.envCheckedValue
      : this.data.filter;
    this.data.filter = !!this.promoteCheckedValue
      ? this.promoteCheckedValue
      : this.data.filter;
    this.data.filter = !!this.activeCheckedValue
      ? this.activeCheckedValue
      : this.data.filter;
  }

  getFiltersConfigName(): string {
    return `${this.currentStore.code}-${this.currentProduct.code}-${this.currentEnv.code}-app-copy-filters`;
  }

  getAppCopyFiltersFromLocalStorage(): void {
    const appCopyFiltersStr = localStorage.getItem(this.getFiltersConfigName());
    if (!!appCopyFiltersStr) {
      const appCopyFilterObj = JSON.parse(appCopyFiltersStr);
      this.searchFilter =
        !!appCopyFilterObj && !!appCopyFilterObj.searchFilter
          ? appCopyFilterObj.searchFilter
          : '';
      this.statusCheckedValues =
        !!appCopyFilterObj && !!appCopyFilterObj.statusCheckedValues
          ? JSON.parse(appCopyFilterObj.statusCheckedValues)
          : [];
      this.regionsCheckedValues =
        !!appCopyFilterObj && !!appCopyFilterObj.regionsCheckedValues
          ? JSON.parse(appCopyFilterObj.regionsCheckedValues)
          : [];
      this.envCheckedValue =
        !!appCopyFilterObj && !!appCopyFilterObj.envCheckedValue
          ? appCopyFilterObj.envCheckedValue
          : '';
      this.promoteCheckedValue =
        !!appCopyFilterObj && !!appCopyFilterObj.promoteCheckedValue
          ? appCopyFilterObj.promoteCheckedValue
          : '';
      this.activeCheckedValue =
        !!appCopyFilterObj && !!appCopyFilterObj.activeCheckedValue
          ? appCopyFilterObj.activeCheckedValue
          : '';
    } else {
      this.clearAllFilters();
    }
  }

  setAppCopyFiltersInLocalStorage(): void {
    const appCopyFilterObj = {
      searchFilter: this.searchFilter,
      statusCheckedValues: JSON.stringify(this.statusCheckedValues),
      regionsCheckedValues: JSON.stringify(this.regionsCheckedValues),
      envCheckedValue: this.envCheckedValue,
      promoteCheckedValue: this.promoteCheckedValue,
      activeCheckedValue: this.activeCheckedValue,
    };
    localStorage.setItem(
      this.getFiltersConfigName(),
      JSON.stringify(appCopyFilterObj),
    );
  }

  isElementChecked(elem: any, checkedValuesArr: any[]): boolean {
    const checkedSet = new Set<string>(checkedValuesArr);
    return checkedSet.has(elem);
  }

  getEditHRef(element): string {
    return `/#/roku/app-copy/view/${element.appCopyId}`;
  }

  isEnvChecked(env: string, value): boolean {
    switch (env) {
      case 'dev':
        return !!value && value.includes(env);
      case 'prod':
        return !!value && value.includes(env);
      default:
        return false;
    }
  }

  changeModuleCheckbox(index: number, param: string, env: string) {
    let newValue;
    let newValueArr;
    const value = this.modulePackages[index][param];
    if (!!value) {
      const valueArr = value.split('-');
      if (valueArr.includes(env)) {
        newValueArr = valueArr.filter((elem) => elem !== env);
      } else {
        valueArr.push(env);
        newValueArr = valueArr;
      }
      newValue =
        newValueArr.length > 1
          ? newValueArr.join('-')
          : !!newValueArr[0]
          ? newValueArr[0]
          : null;
    } else {
      newValue = env;
    }
    this.modulePackages[index][param] = newValue;
    this.updateUI();
  }

  publishList() {
    this.openActionDialog('PUBLISH', null, {
      message: `${PROCEED_MESSAGE}the changes below?`,
      action: 'rokuListPublish',
      showPasswordField: this.currentEnv.code === 'prod',
      changes: this.rokuManagementUtils.getModulesListChanges(
        this.allAppCopyModuleData.filter(
          (elem) =>
            elem.envId === this.currentEnv.envId &&
            elem.storeId === this.currentStore.storeId &&
            elem.productId === this.currentProduct.productId,
        ),
        this.modulePackages,
        'appCopyId',
        'appCopyName',
      ),
      envTitle: this.currentEnv.name,
    });
  }

  isModuleEnded(value: string, env: string): boolean {
    return value.includes(env);
  }

  getPublishPayload(doNotChangeActive?) {
    const tardisToken = localStorage.getItem('tardisToken');
    const tardisTokenExpiresAt = localStorage.getItem('tardisTokenExpiresAt');
    const publishAppCopyModules = this.modulePackages.filter((module) => {
      return !!module.isPublished;
    });
    const data = publishAppCopyModules.map((module) => {
      return {
        appCopyId: module.appCopyId,
        isActive: module.isActive,
      };
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
    return this.rokuManagementUtils.getPageSizeOptions();
  }

  getPageSize(module: string): number {
    return this.rokuManagementUtils.getPageSize(module);
  }

  setPageSize(event, module: string): void {
    this.rokuManagementUtils.setPageSize(module, event.pageSize);
  }

  getPromotionIconTooltipText(element: any): string {
    if (!!element.hasChanges) {
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
    if (this.currentEnv.code !== 'prod' && !this.canPromoteModule(element)) {
      return 'disabled';
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

  getRemovedModuleTooltipText(element: any): string {
    if (this.currentEnv.code === 'prod') {
      return !!element.promotionId && !this.isOriginalModuleExist(element)
        ? 'Client Dev record was deleted'
        : '';
    } else {
      return !!element.promotedAt && !this.isPromotedModuleExist(element)
        ? 'Production record was deleted'
        : '';
    }
  }

  isOriginalModuleExist(element): boolean {
    const foundOriginalAppCopyModule = this.allAppCopyModuleData.find(
      (module) => module.appCopyId === element.promotionId,
    );
    return !!foundOriginalAppCopyModule;
  }

  isPromotedModuleExist(element): boolean {
    const foundPromotedAppCopyModule = this.allAppCopyModuleData.find(
      (module) => module.promotionId === element.appCopyId,
    );
    return !!foundPromotedAppCopyModule;
  }

  ngOnDestroy(): void {
    this.regionsLanguagesSubscription.unsubscribe();
    this.modulePackagesSubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
