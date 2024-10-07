import {
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ViewChild,
} from '@angular/core';
import { AndroidService } from '../../../../service/android.service';
import { LoaderService } from '../../../../service/loader.service';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BaseComponent } from '../../../base/base.component';
import { takeUntil } from 'rxjs/operators';
import { PROCEED_MESSAGE } from '../../../../constants';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { AndroidManagementService } from '../../../../service/androidManagement.service';
import { ModuleStatus } from '../../../../types/androidEnum';

@Component({
  selector: 'store-copy-grid',
  templateUrl: './store-copy-grid.component.html',
  styleUrls: ['./store-copy-grid.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AndroidStoreCopyGridComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public modulePackages: any[] = [];
  public languagesArray: string[] = [];

  public tableHeaders: string[] = ['TITLE', 'STATUS', 'LANGUAGES', ''];
  public dataKeys: string[] = [
    'name',
    'statusTitle',
    'supportedLanguages',
    'actions',
  ];
  public filtersHeaders: string[] = ['TITLE', 'STATUS', 'LANGUAGES'];
  public filtersKeys: string[] = ['name', 'statusTitle', 'supportedLanguages'];
  public data: MatTableDataSource<any>;
  public showFiltersBlock: boolean = false;
  public searchFilter = '';
  public statusCheckboxesValues: string[] = [];
  public languagesCheckboxesValues: string[] = [];
  public statusCheckedValues: string[] = [];
  public languagesCheckedValues: string[] = [];

  private defaultModule: any;
  private defaultLanguages: string[] = [];
  private destroy$ = new Subject<void>();
  private languagesSubscription: Subscription;
  private allLanguages: any[] = [];
  private modulePackageSubscription: Subscription;
  private currentStore;
  private currentProduct;

  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild('listViewPaginator') paginator: MatPaginator;

  constructor(
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    private androidService: AndroidService,
    private androidManagementService: AndroidManagementService,
  ) {
    super(dialog, loaderService, router);
    this.data = new MatTableDataSource();
  }

  ngOnInit(): void {
    combineLatest([this.androidService.store, this.androidService.product])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArr) => {
        this.loaderService.show();
        this.currentStore = resultArr[0];
        this.currentProduct = resultArr[1];
        this.setLanguages();
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
    this.setStoreCopyFiltersInLocalStorage();
  }

  setLanguages() {
    this.loaderService.show();
    this.languagesSubscription = this.androidService
      .getLanguages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.allLanguages = res.data;
        this.setTableData();
      });
  }

  setTableData() {
    this.modulePackageSubscription = this.androidService
      .getAllStoreCopies()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res && res.data?.length) {
          let data: any[] = res.data;
          data.reverse();

          data = data.filter(
            (elem) =>
              elem.storeId === this.currentStore.storeId &&
              elem.productId === this.currentProduct.productId,
          );

          if (data.length) {
            this.defaultModule = data.find(
              (module) => module.isDefault === true,
            );
            const defaultLanguages = new Set<string>();
            Object.keys(this.defaultModule.languages).forEach(
              (language: any) => {
                defaultLanguages.add(language);
              },
            );
            this.defaultLanguages = Array.from(defaultLanguages);
            this.setStoreCopyData(data, defaultLanguages);
            this.updateUI(this.modulePackages);
          } else {
            this.data = new MatTableDataSource();
            this.data.paginator = this.paginator;
            this.defaultModule = null;
          }
          this.getStoreCopyFiltersFromLocalStorage();
          this.reCheckFilters();
          this.loaderService.hide();
        } else {
          this.defaultModule = null;
          this.loaderService.hide();
        }
      });
  }

  setStoreCopyData(data: any[], defaultLanguages: Set<string>): void {
    this.modulePackages = data.map((module) => {
      let statusTitle: string =
        module.status.charAt(0).toUpperCase() + module.status.slice(1);
      let environments: string = '';
      if (module.status === ModuleStatus.LIVE) {
        environments = ` - ${this.androidManagementService.getModuleDeploymentString(
          module.deployedTo,
        )}`;
      }
      let supportedLanguagesSet = new Set<string>();
      let languagesSet = new Set<string>();
      let tooltipText: string = '';
      if (!module.isDefault) {
        const languageCodes = Object.keys(module.languages);
        Object.values(module.languages).forEach((language: any, j) => {
          languagesSet.add(languageCodes[j]);
          if (!this.isLanguageEqualToDeafult(languageCodes[j], language)) {
            supportedLanguagesSet.add(languageCodes[j]);
          }
        });
        if (languagesSet.size && !supportedLanguagesSet.size) {
          supportedLanguagesSet = new Set<string>(['All Languages']);
        }
      } else {
        languagesSet = defaultLanguages;
        supportedLanguagesSet = defaultLanguages;
      }
      tooltipText = Array.from(languagesSet).sort().join(', ');
      let endedOn: string = '';
      if (!!module.endedOn && module.status === ModuleStatus.LIVE) {
        endedOn = `Ended - ${this.androidManagementService.getModuleDeploymentString(
          module.endedOn,
        )}`;
      }

      return {
        name: module.name,
        statusTitle,
        status: module.status,
        environments,
        supportedLanguages: Array.from(supportedLanguagesSet).sort().join(', '),
        languages: Array.from(languagesSet).sort(),
        languageData: module.languages,
        isDefault: module.isDefault,
        storeCopyId: module.storeCopyId,
        deployedTo: module.deployedTo,
        endedOn,
        tooltipText,
      };
    });
  }

  isLanguageEqualToDeafult(languageCode: string, language: any): boolean {
    if (this.defaultModule) {
      const defaultLanguagesCodes: any = Object.keys(
        this.defaultModule.languages,
      );
      const languageIndex: any = defaultLanguagesCodes.indexOf(languageCode);
      const defaultLanguage: any = Object.values(this.defaultModule.languages)[
        languageIndex
      ];
      if (defaultLanguage) {
        const countryJSON = this.getJSONFromLanguage(language);
        const defaultCountryJSON = this.getJSONFromLanguage(defaultLanguage);
        return countryJSON === defaultCountryJSON;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  getJSONFromLanguage(language: any): string {
    const fieldsCodes: any[] = Object.keys(language.tableData);
    const fieldsValues = Object.values(language.tableData).map((field: any) =>
      JSON.stringify(field, Object.keys(field).sort()),
    );
    const resultArr: string[] = [];
    fieldsCodes.forEach((code, i) => {
      resultArr.push(`${code}/${fieldsValues[i]}`);
    });
    return resultArr.join('//');
  }

  menuAction(type, element) {
    switch (type) {
      case 'DUPLICATE':
        this.router.navigate([
          '/android/store-copy/duplicate',
          element.storeCopyId,
        ]);
        break;
      case 'DEFAULT':
        this.loaderService.show();
        this.androidService
          .setStoreCopyDefault(element.storeCopyId)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.modulePackages.forEach((elem) => {
              if (elem.isDefault && elem.storeCopyId !== element.storeCopyId) {
                this.androidService
                  .unsetStoreCopyDefault(elem.storeCopyId)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe(() => {
                    this.loaderService.hide();
                    this.androidManagementService.refreshTablePageNavigation(
                      this.router,
                    );
                  });
              }
            });
          });
        break;
      case 'VIEW':
        this.router.navigate(['/android/store-copy/view', element.storeCopyId]);
        break;
      case 'PUBLISH':
        const action = {
          message: PROCEED_MESSAGE + type + '?',
          action: 'androidPublish',
          module: 'store-copy',
          id: element.storeCopyId,
        };
        this.openActionDialog(type, element, action);
        break;
      case 'DELETE':
        const deleteAction = {
          message: `${PROCEED_MESSAGE}${type} "${element.name}"?`,
          action: 'androidDelete',
          module: 'store-copy',
          id: element.storeCopyId,
        };
        this.openActionDialog(type, element, deleteAction);
        break;
    }
  }

  getEditHRef(element): string {
    return `/#/android/store-copy/view/${element.storeCopyId}`;
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
    if (this.defaultModule?.storeCopyId) {
      this.router.navigate([
        '/android/store-copy/duplicate',
        this.defaultModule['storeCopyId'],
      ]);
    } else {
      this.router.navigate(['/android/store-copy/create']);
    }
  }

  async deleteModule(storeCopyId: number) {
    try {
      this.loaderService.show();
      const response = await this.androidService
        .deleteStoreCopy(storeCopyId)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async publishModule(storeCopyId: number, env: string) {
    try {
      this.loaderService.show();
      const response = await this.androidService
        .publishStoreCopy(storeCopyId, env)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  toggleFiltersBlock() {
    this.showFiltersBlock = !this.showFiltersBlock;
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
      dialogActionRef.afterClosed().subscribe((result) => {
        if (result) {
          switch (type) {
            case 'VIEW':
              this.router.navigate([
                '/android/store-copy/view',
                element.storeCopyId,
              ]);
              break;
            case 'DELETE':
              this.deleteModule(element.storeCopyId);
              break;
            case 'PUBLISH':
              this.publishModule(element.storeCopyId, result);
              break;
          }
        }
      });
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

  updateUI(newData: any): void {
    this.data = new MatTableDataSource(newData);
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
    const languagesSet = new Set<string>();
    for (const record of records) {
      for (const language of record.languages) {
        if (!languagesSet.has(language)) {
          languagesSet.add(language);
        }
      }
    }
    this.languagesCheckboxesValues = Array.from(languagesSet).sort();

    // setup mat table filter
    this.data.filterPredicate = (data: Element, filter: string) => {
      const columns = ['name'];
      const results: boolean[] = [];

      const includePackageNameSearch: boolean =
        this.searchFilter !== ''
          ? !!this.includesSearch(columns, data, this.searchFilter)
          : true;
      const includeStatusesSearch: boolean =
        this.statusCheckedValues.length !== 0
          ? this.statusCheckedValues.some(
              (status) => data['statusTitle'] === status,
            )
          : true;
      const includeLanguagesSearch: boolean =
        this.languagesCheckedValues.length !== 0
          ? this.languagesCheckedValues.every((language) =>
              data['languages'].includes(language),
            )
          : true;

      results.push(
        includePackageNameSearch &&
          includeStatusesSearch &&
          includeLanguagesSearch,
      );
      return results.includes(true);
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
        case 'name':
          return item.name.toLowerCase();
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
    this.setStoreCopyFiltersInLocalStorage();
  }

  getFiltersConfigName(): string {
    return `${this.currentStore.code}-${this.currentProduct.code}-store-copy-filters`;
  }

  getStoreCopyFiltersFromLocalStorage(): void {
    const storeCopyFiltersStr = localStorage.getItem(
      this.getFiltersConfigName(),
    );
    if (!!storeCopyFiltersStr) {
      const storeCopyFilterObj = JSON.parse(storeCopyFiltersStr);
      this.searchFilter =
        !!storeCopyFilterObj && !!storeCopyFilterObj.searchFilter
          ? storeCopyFilterObj.searchFilter
          : '';
      this.languagesCheckedValues =
        !!storeCopyFilterObj && !!storeCopyFilterObj.languagesCheckedValues
          ? JSON.parse(storeCopyFilterObj.languagesCheckedValues)
          : [];
      this.statusCheckedValues =
        !!storeCopyFilterObj && !!storeCopyFilterObj.statusCheckedValues
          ? JSON.parse(storeCopyFilterObj.statusCheckedValues)
          : [];
    } else {
      this.clearAllFilters();
    }
  }

  setStoreCopyFiltersInLocalStorage(): void {
    const storeCopyFilterObj = {
      searchFilter: this.searchFilter,
      statusCheckedValues: JSON.stringify(this.statusCheckedValues),
      languagesCheckedValues: JSON.stringify(this.languagesCheckedValues),
    };
    localStorage.setItem(
      this.getFiltersConfigName(),
      JSON.stringify(storeCopyFilterObj),
    );
  }

  clearSearchInput(): void {
    this.searchFilter = '';
    this.reCheckFilters();
    this.setStoreCopyFiltersInLocalStorage();
  }

  canDeleteModule(module: any): boolean {
    return !module.isDefault && module.status !== ModuleStatus.LIVE;
  }

  canEditModule(module: any): boolean {
    return module.status !== ModuleStatus.ENDED;
  }

  canPublishModule(module: any): boolean {
    return (
      !this.isModulePublishedOnAllEnv(module) &&
      module.status !== ModuleStatus.DRAFT &&
      module.status !== ModuleStatus.ENDED
    );
  }

  isModulePublishedOnAllEnv(module: any): boolean {
    return (
      !!module.deployedTo &&
      module.deployedTo.includes('dev') &&
      module.deployedTo.includes('prod')
    );
  }

  canSetDefaultModule(module: any): boolean {
    return !module.isDefault && module.status !== ModuleStatus.ENDED;
  }

  clearAllFilters(): void {
    this.searchFilter = '';
    this.statusCheckedValues = [];
    this.languagesCheckedValues = [];
    this.data.filter = '';
    this.setStoreCopyFiltersInLocalStorage();
  }

  isElementChecked(elem: any, checkedValuesArr: any[]): boolean {
    const checkedSet = new Set<string>(checkedValuesArr);
    return checkedSet.has(elem);
  }

  reCheckFilters(): void {
    this.data.filter = this.statusCheckedValues.length
      ? JSON.stringify(this.statusCheckedValues)
      : this.data.filter;
    this.data.filter = this.languagesCheckedValues.length
      ? JSON.stringify(this.languagesCheckedValues)
      : this.data.filter;
    this.data.filter = !this.searchFilter
      ? this.data.filter
      : this.searchFilter;
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

  ngOnDestroy(): void {
    this.languagesSubscription.unsubscribe();
    this.modulePackageSubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
