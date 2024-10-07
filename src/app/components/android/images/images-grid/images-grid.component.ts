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
import { BaseComponent } from '../../../base/base.component';
import { elementAt, filter, takeUntil } from 'rxjs/operators';
import { PROCEED_MESSAGE } from '../../../../constants';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { AndroidManagementService } from '../../../../service/androidManagement.service';
import { ModuleStatus } from '../../../../types/androidEnum';
import { SnackbarService } from '../../../../service/snackbar.service';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

@Component({
  selector: 'images-grid',
  templateUrl: './images-grid.component.html',
  styleUrls: ['./images-grid.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AndroidImagesGridComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public regionsLanguagesBinding: any[];
  public bundlesModuleData: any[] = [];
  public regionsArray: string[] = [];
  public bundlesTableHeaders: string[] = [
    'BUNDLE NAME',
    'STATUS',
    'REGIONS',
    '',
  ];
  public bundlesDataKeys: string[] = [
    'name',
    'statusTitle',
    'supportedRegions',
    'actions',
  ];
  public bundlesFiltersHeaders: string[] = ['BUNDLE NAME', 'STATUS', 'REGIONS'];
  public bundlesData: MatTableDataSource<any>;
  public showFiltersBlock: boolean = false;
  public bundleNameSearchFilter = '';
  public statusCheckboxesValues: string[] = [];
  public statusCheckedValues: string[] = [];
  public supportedRegionsCheckboxesValues: string[] = [];
  public supportedRegionsCheckedValues: string[] = [];
  public defaultBundle: any = {};
  public defaultBundleCountries: any[] = [];
  public selectedTab = new FormControl(0);
  public pageQuery: string;
  public loadingEnded: boolean = false;

  private dialogResponseSubscription: Subscription;
  private regionsLanguagesSubscription: Subscription;
  private modulePackagesSubscription: Subscription;
  private destroy$ = new Subject<void>();
  private currentStore;
  private currentProduct;

  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild('bundlesListViewPaginator') bundlesPaginator: MatPaginator;

  constructor(
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    private configurationService: ConfigurationService,
    private formBuilder: FormBuilder,
    private androidService: AndroidService,
    private activatedRoute: ActivatedRoute,
    private androidManagementService: AndroidManagementService,
    private snackbarService: SnackbarService,
  ) {
    super(dialog, loaderService, router);
    this.bundlesData = new MatTableDataSource();
  }

  ngOnInit(): void {
    combineLatest([this.androidService.store, this.androidService.product])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArr) => {
        this.loaderService.show();
        this.loadingEnded = false;
        this.currentStore = resultArr[0];
        this.currentProduct = resultArr[1];
        this.startUp();
      });
  }

  startUp() {
    this.pageQuery = this.activatedRoute.snapshot.paramMap['params']['tab'];
    const selectedTab = JSON.parse(
      localStorage.getItem('androidImagesTab') as string,
    );
    if (selectedTab) {
      this.selectedTab.setValue(selectedTab);
    }
    this.setRegionsLanguages();
  }

  changeCheckedFilters(filterName: string, element) {
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
    this.setBundleFiltersInLocalStorage();
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
        this.setBundlesTableData();
      });
  }

  setBundlesTableData(): void {
    this.modulePackagesSubscription = this.androidService
      .getAllImageCollections()
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
            this.setBundleData(data);
          } else {
            this.statusCheckboxesValues = [];
            this.supportedRegionsCheckboxesValues = [];
            this.defaultBundle = null;
            this.bundlesModuleData = [];
            this.updateUI();
          }
        } else {
          this.defaultBundle = null;
          this.bundlesModuleData = [];
          this.updateUI();
        }
        this.getBundleFiltersFromLocalStorage();
        this.reCheckFilters();
        this.loadingEnded = true;
      });
  }

  setBundleData(data: any[]): void {
    const statusSet = new Set<string>();
    const allRegionsSet = new Set<string>();

    this.bundlesModuleData = data.map((module) => {
      const statusTitle: string = this.androidManagementService.getStatusTitle(
        module.status,
      );
      let environments: string = '';
      if (module.status === ModuleStatus.LIVE) {
        environments = ` - ${this.androidManagementService.getModuleDeploymentString(
          module.deployedTo,
        )}`;
      }
      let supportedRegionsSet = new Set<string>();
      let tooltipText: string = '';
      module.countries.forEach((country: string) => {
        supportedRegionsSet.add(country);
        allRegionsSet.add(country);
      });
      if (supportedRegionsSet.size && !supportedRegionsSet.size) {
        supportedRegionsSet = new Set<string>(['All Regions']);
      }
      tooltipText = Array.from(supportedRegionsSet).sort().join(', ');
      statusSet.add(statusTitle);
      let endedOn: string = '';
      if (!!module.endedOn && module.status === ModuleStatus.LIVE) {
        endedOn = `Ended - ${this.androidManagementService.getModuleDeploymentString(
          module.endedOn,
        )}`;
      }

      return {
        imageCollectionId: module.imageCollectionId,
        name: module.name,
        statusTitle,
        status: module.status,
        supportedRegions: Array.from(supportedRegionsSet).sort().join(', '),
        regions: module.countries.sort(),
        deployedTo: module.deployedTo,
        environments,
        tooltipText,
        endedOn,
      };
    });
    this.updateUI();
    this.statusCheckboxesValues = Array.from(statusSet).sort();
    this.supportedRegionsCheckboxesValues = Array.from(allRegionsSet).sort();
  }

  getJSONFromCountry(country: any): string {
    const imagesCodes: any[] = Object.keys(country.images);
    const imagesValues = Object.values(country.images)
      .sort()
      .map((elem: any) => JSON.stringify(elem));
    const resultArr: string[] = [];
    imagesCodes.forEach((code, i) => {
      resultArr.push(`${code}/${imagesValues[i]}`);
    });
    return resultArr.join('//');
  }

  menuAction(type, element) {
    switch (type) {
      case 'DUPLICATE':
        this.router.navigate([
          '/android/images/collection/duplicate',
          element.imageCollectionId,
        ]);
        break;
      case 'VIEW':
        this.router.navigate([
          '/android/images/collection/view',
          element.imageCollectionId,
        ]);
        break;
      case 'PUBLISH':
        const action = {
          message: PROCEED_MESSAGE + type + '?',
          action: 'androidPublish',
          module: 'image-collection',
          id: element.imageCollectionId,
        };
        this.openActionDialog(type, element, action);
        break;
      case 'DELETE':
        const deleteAction = {
          message: `${PROCEED_MESSAGE}${type} "${element.name}"?`,
          action: 'androidDelete',
          module: 'image-collection',
          id: element.imageCollectionId,
        };
        this.openActionDialog(type, element, deleteAction);
        break;
    }
  }

  createNewBundle() {
    if (this.defaultBundle?.imageCollectionId) {
      this.router.navigate([
        '/android/images/collection/duplicate',
        this.defaultBundle['imageCollectionId'],
      ]);
    } else {
      this.router.navigate(['/android/images/collection/create']);
    }
  }

  async deleteModule(imageCollectionId: number) {
    try {
      this.loaderService.show();
      const response = await this.androidService
        .deleteImageCollection(imageCollectionId)
        .toPromise();
      this.openResponseDialog(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async publishModule(imageCollectionId: number, env: string) {
    this.androidService
      .publishImageCollection(
        imageCollectionId,
        env,
        ` - ${this.androidManagementService.getModuleDeploymentString(env)}`,
      )
      .subscribe(
        (res) => {
          this.snackbarService.show(
            res.message,
            'OK',
            '/android/images',
            this.router,
          );
        },
        (err) => {
          this.snackbarService.show(
            `${err.message}`,
            'ERROR',
            '/android/images',
            this.router,
          );
        },
      );
  }

  toggleFiltersBlock() {
    this.showFiltersBlock = !this.showFiltersBlock;
  }

  changeTab(event): void {
    this.selectedTab.setValue(event);
    localStorage.setItem('androidImagesTab', JSON.stringify(event));
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
              case 'VIEW':
                this.router.navigate([
                  '/android/images/collection/view',
                  element.imageCollectionId,
                ]);
                break;
              case 'DELETE':
                this.deleteModule(element.imageCollectionId);
                break;
              case 'PUBLISH':
                element.status = ModuleStatus.PUBLISH_PROGRESS;
                element.environments = null;
                element.deployedTo = null;
                element.endedOn = null;
                element.statusTitle = `${this.androidManagementService.getStatusTitle(
                  ModuleStatus.PUBLISH_PROGRESS,
                )} - ${this.androidManagementService.getModuleDeploymentString(
                  result.code,
                )}`;
                this.publishModule(element.imageCollectionId, result.code);
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

  updateUI(): void {
    this.bundlesData = new MatTableDataSource(this.bundlesModuleData);
    this.setUpBundlesSort();
    this.setUpBundlesFilter();
    this.bundlesData.paginator = this.bundlesPaginator;
    this.loaderService.hide();
  }

  setUpBundlesFilter(): void {
    const records = this.bundlesModuleData;

    // Getting "status" checkboxes array
    const statusSet = new Set<string>();
    for (const record of records) {
      if (!statusSet.has(record.status)) {
        statusSet.add(record.status);
      }
    }
    this.statusCheckboxesValues = Array.from(statusSet);

    // Getting "status" checkboxes array
    const regionsSet = new Set<string>();
    for (const record of records) {
      if (!regionsSet.has(record.regions)) {
        regionsSet.add(record.regions);
      }
    }
    this.supportedRegionsCheckboxesValues = Array.from(regionsSet);

    // setup mat table filter
    this.bundlesData.filterPredicate = (data: Element, filter: string) => {
      const includeBundleNameSearch: boolean =
        this.bundleNameSearchFilter !== ''
          ? !!this.includesSearch(['name'], data, this.bundleNameSearchFilter)
          : true;
      const includeRegionsSearch: boolean = this.supportedRegionsCheckedValues
        .length
        ? this.supportedRegionsCheckedValues.every((region) =>
            data['regions'].includes(region),
          )
        : true;
      const includeStatusSearch: boolean = this.statusCheckedValues.length
        ? this.statusCheckedValues.some(
            (status) => data['statusTitle'] === status,
          )
        : true;

      return (
        includeBundleNameSearch && includeRegionsSearch && includeStatusSearch
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

  setUpBundlesSort() {
    this.bundlesData.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'name':
        case 'statusTitle':
          return item[property].toLowerCase();
        default:
          return item[property];
      }
    };
    this.bundlesData.sort = this.sort;
  }

  applyBundleFilter($event): void {
    const filterValue = $event.currentTarget.value;
    if (filterValue === '') {
      this.bundleNameSearchFilter = '';
    } else {
      this.bundleNameSearchFilter = filterValue.toLowerCase();
    }
    this.reCheckFilters();
    this.setBundleFiltersInLocalStorage();
  }

  getFiltersConfigName(): string {
    return `${this.currentStore.code}-${this.currentProduct.code}-bundles-filters`;
  }

  getBundleFiltersFromLocalStorage(): void {
    const bundleFiltersStr = localStorage.getItem(this.getFiltersConfigName());
    if (!!bundleFiltersStr) {
      const bundleFiltersObj = JSON.parse(bundleFiltersStr);
      this.bundleNameSearchFilter =
        !!bundleFiltersObj && !!bundleFiltersObj.bundleNameSearchFilter
          ? bundleFiltersObj.bundleNameSearchFilter
          : '';
      this.statusCheckedValues =
        !!bundleFiltersObj && !!bundleFiltersObj.statusCheckedValues
          ? JSON.parse(bundleFiltersObj.statusCheckedValues)
          : [];
      this.supportedRegionsCheckedValues =
        !!bundleFiltersObj && !!bundleFiltersObj.supportedRegionsCheckedValues
          ? JSON.parse(bundleFiltersObj.supportedRegionsCheckedValues)
          : [];
    } else {
      this.clearAllFilters();
    }
  }

  setBundleFiltersInLocalStorage(): void {
    const bundleFilterObj = {
      bundleNameSearchFilter: this.bundleNameSearchFilter,
      supportedRegionsCheckedValues: JSON.stringify(
        this.supportedRegionsCheckedValues,
      ),
      statusCheckedValues: JSON.stringify(this.statusCheckedValues),
    };
    localStorage.setItem(
      this.getFiltersConfigName(),
      JSON.stringify(bundleFilterObj),
    );
  }

  clearSearchInput(ref): void {
    ref.value = '';
    this.bundleNameSearchFilter = '';
    this.reCheckFilters();
    this.setBundleFiltersInLocalStorage();
  }

  getEditHRef(element) {
    if (this.selectedTab.value === 0) {
      return `/#/android/images/collection/view/${element.imageCollectionId}`;
    } else if (this.selectedTab.value === 1) {
      return `/#/android/images/gallery/view/${element.imageId}`;
    }
  }

  canDeleteModule(module: any): boolean {
    return module.status !== ModuleStatus.LIVE;
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

  reCheckFilters(): void {
    this.bundlesData.filter = this.statusCheckedValues.length
      ? JSON.stringify(this.statusCheckedValues)
      : this.bundlesData.filter;
    this.bundlesData.filter = this.supportedRegionsCheckedValues.length
      ? JSON.stringify(this.supportedRegionsCheckedValues)
      : this.bundlesData.filter;
    this.bundlesData.filter = !this.bundleNameSearchFilter
      ? this.bundlesData.filter
      : this.bundleNameSearchFilter;
  }

  actionsDisabled(status: string): boolean {
    return status.includes(ModuleStatus.PUBLISH_PROGRESS) ? true : false;
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

  isElementChecked(elem: any, checkedValuesArr: any[]): boolean {
    const checkedSet = new Set<string>(checkedValuesArr);
    return checkedSet.has(elem);
  }

  clearAllFilters(): void {
    this.statusCheckedValues = [];
    this.supportedRegionsCheckedValues = [];
    this.bundleNameSearchFilter = '';
    this.bundlesData.filter = '';
    this.setBundleFiltersInLocalStorage();
  }

  ngOnDestroy(): void {
    this.regionsLanguagesSubscription.unsubscribe();
    this.modulePackagesSubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
