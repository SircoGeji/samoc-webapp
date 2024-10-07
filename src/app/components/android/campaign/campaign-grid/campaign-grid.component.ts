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
import * as moment from 'moment-timezone';
import { AndroidManagementService } from '../../../../service/androidManagement.service';
import { ModuleStatus } from '../../../../types/androidEnum';
import { SnackbarService } from '../../../../service/snackbar.service';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

@Component({
  selector: 'campaign-grid',
  templateUrl: './campaign-grid.component.html',
  styleUrls: ['./campaign-grid.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AndroidCampaignGridComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public regionsLanguagesBinding: any[];
  public campaignsModuleData: any[] = [];
  public campaignsHistoryModuleData: any[] = [];
  public regionsArray: string[] = [];
  public selectedTab = new FormControl(0);

  public campaignsTableHeaders: string[] = [
    'NAME',
    'START DATE',
    'END DATE',
    'STATUS',
    'SCHEDULED REGIONS',
    '',
  ];
  public campaignsDataKeys: string[] = [
    'name',
    'startDate',
    'endDate',
    'statusTitle',
    'scheduledRegions',
    'actions',
  ];
  public campaignsFiltersHeaders: string[] = [
    'NAME',
    'START DATE',
    'END DATE',
    'STATUS',
    'SCHEDULED REGIONS',
  ];
  public campaignsHistoryTableHeaders: string[] = [
    'NAME',
    'SCHEDULED REGIONS',
    'START DATE',
    'END DATE',
    '',
  ];
  public campaignsHistoryDataKeys: string[] = [
    'name',
    'scheduledRegions',
    'startDate',
    'endDate',
    'actions',
  ];
  public campaignsHistoryFiltersHeaders: string[] = [
    'NAME',
    'SCHEDULED REGIONS',
    'START DATE',
    'END DATE',
  ];
  public campaignsData: MatTableDataSource<any>;
  public campaignsHistoryData: MatTableDataSource<any>;
  public showFiltersBlock: boolean = false;
  public campaignsNameSearchFilter = '';
  public campaignsStartDateSearchFilter = '';
  public campaignsEndDateSearchFilter = '';
  public campaignsStatusCheckboxesValues: string[] = [];
  public campaignsStatusCheckedValues: string[] = [];
  public campaignsScheduledRegionsCheckboxesValues: string[] = [];
  public campaignsScheduledRegionsCheckedValues: string[] = [];
  public campaignsHistoryNameSearchFilter = '';
  public campaignsHistoryStartDateSearchFilter = '';
  public campaignsHistoryEndDateSearchFilter = '';
  public campaignsHistoryScheduledRegionsCheckboxesValues: string[] = [];
  public campaignsHistoryScheduledRegionsCheckedValues: string[] = [];
  public pageQuery: string;
  public defaultCampaign: any = {};
  public defaultCampaignCountries: any[] = [];

  private dialogResponseSubscription: Subscription;
  private regionsLanguagesSubscription: Subscription;
  private campaignModuleSubscription: Subscription;
  private campaignHistoryModuleSubscription: Subscription;
  private destroy$ = new Subject<void>();
  private currentStore;
  private currentProduct;

  @ViewChild('campaignsTable', { read: MatSort, static: true })
  campaignsSort: MatSort;
  @ViewChild('campaignsHistoryable', { read: MatSort, static: true })
  campaignsHistorySort: MatSort;
  @ViewChild('campaignsListViewPaginator') campaignsPaginator: MatPaginator;
  @ViewChild('campaignsHistoryListViewPaginator')
  campaignsHistoryPaginator: MatPaginator;

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
    this.campaignsData = new MatTableDataSource();
    this.campaignsHistoryData = new MatTableDataSource();
  }

  ngOnInit(): void {
    combineLatest([this.androidService.store, this.androidService.product])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArr) => {
        this.loaderService.show();
        this.currentStore = resultArr[0];
        this.currentProduct = resultArr[1];
        this.startUp();
      });
  }

  startUp(): void {
    this.setRegionsLanguages();
    this.pageQuery = this.activatedRoute.snapshot.paramMap['params']['tab'];
    const selectedTab = JSON.parse(
      localStorage.getItem('androidCampaignsTab') as string,
    );
    if (selectedTab) {
      this.selectedTab.setValue(selectedTab);
    }
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

        this.setCampaignTableData();
      });
  }

  setCampaignTableData() {
    this.campaignModuleSubscription = this.androidService
      .getAllCampaigns()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res && res.data) {
          let data: any[] = res.data;
          data.reverse();

          data = data.filter(
            (elem) =>
              elem.storeId === this.currentStore.storeId &&
              elem.productId === this.currentProduct.productId,
          );

          if (data.length) {
            this.defaultCampaign = data.find(
              (module) => module.isDefault === true,
            );
            const defaultCountries = new Set<string>();
            if (this.defaultCampaign && this.defaultCampaign.appCopy) {
              Object.values(this.defaultCampaign.appCopy.platforms).forEach(
                (platform: any) => {
                  Object.keys(platform).forEach((country: any) => {
                    defaultCountries.add(country);
                  });
                },
              );
            }
            this.defaultCampaignCountries = Array.from(defaultCountries);
            this.setCampaignData(data, defaultCountries);
          } else {
            this.campaignsStatusCheckboxesValues = [];
            this.campaignsScheduledRegionsCheckboxesValues = [];
            this.campaignsModuleData = [];
            this.campaignsData = new MatTableDataSource();
            this.defaultCampaign = null;
          }
        } else {
          this.defaultCampaign = null;
        }
        this.getCampaignFiltersFromLocalStorage();
        this.applyFilter(0);
        this.setCampaignHistoryTableData();
      });
  }

  setCampaignData(data: any[], defaultCountries: Set<string>): void {
    const statusSet = new Set<string>();
    const campaignsAllRegionsSet = new Set<string>();

    this.campaignsModuleData = data.map((module) => {
      const statusTitle: string = this.androidManagementService.getStatusTitle(
        module.status,
      );
      let environments: string = '';
      if (module.status === ModuleStatus.LIVE && !!module.deployedTo) {
        environments = ` - ${this.androidManagementService.getModuleDeploymentString(
          module.deployedTo,
        )}`;
      }
      let scheduledRegionsSet = new Set<string>();
      let regionsSet = new Set<string>();
      let tooltipText: string = '';
      if (module.appCopy) {
        if (!module.isDefault) {
          const platformsCodes = Object.keys(module.appCopy.platforms);
          Object.values(module.appCopy.platforms).forEach(
            (platform: any, i) => {
              const countryCodes = Object.keys(platform);
              Object.values(platform).forEach((country: any, j) => {
                regionsSet.add(countryCodes[j]);
                campaignsAllRegionsSet.add(countryCodes[j]);
                if (
                  !this.isCountryEqualToDeafult(
                    platformsCodes[i],
                    countryCodes[j],
                    country,
                  )
                ) {
                  scheduledRegionsSet.add(countryCodes[j]);
                }
              });
            },
          );
          if (regionsSet.size && !scheduledRegionsSet.size) {
            scheduledRegionsSet = new Set<string>(['All Regions']);
          }
        } else {
          regionsSet = defaultCountries;
          scheduledRegionsSet = defaultCountries;
        }
      }
      tooltipText = Array.from(regionsSet).sort().join(', ');
      statusSet.add(statusTitle);
      let endedOn: string = '';
      if (!!module.endedOn && module.status === ModuleStatus.LIVE) {
        endedOn = `Ended - ${this.androidManagementService.getModuleDeploymentString(
          module.endedOn,
        )}`;
      }

      return {
        campaignId: module.campaignId,
        name: module.name,
        statusTitle,
        status: module.status,
        startDate: moment(module.startDate).format('MM.DD.YYYY'),
        endDate: moment(module.endDate).format('MM.DD.YYYY'),
        isDefault: module.isDefault,
        scheduledRegions: Array.from(scheduledRegionsSet).sort().join(', '),
        regions: Array.from(regionsSet).sort(),
        tooltipText,
        environments,
        deployedTo: module.deployedTo,
        endedOn,
        countries: module.countries,
      };
    });
    this.campaignsStatusCheckboxesValues = Array.from(statusSet).sort();
    this.campaignsScheduledRegionsCheckboxesValues = Array.from(
      campaignsAllRegionsSet,
    ).sort();
    this.campaignsData = new MatTableDataSource(this.campaignsModuleData);
  }

  setCampaignHistoryTableData() {
    this.campaignHistoryModuleSubscription = this.androidService
      .getAllCampaignHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res && res.data) {
          let data: any[] = res.data;
          data.reverse();

          data = data.filter(
            (elem) =>
              elem.storeId === this.currentStore.storeId &&
              elem.productId === this.currentProduct.productId,
          );

          if (data.length) {
            this.setCampaignHistoryData(data);
          } else {
            this.campaignsHistoryScheduledRegionsCheckboxesValues = [];
            this.campaignsHistoryModuleData = [];
            this.campaignsHistoryData = new MatTableDataSource();
          }
        }
        this.getCampaignHistoryFiltersFromLocalStorage();
        this.applyFilter(1);
        this.loaderService.hide();
      });
  }

  setCampaignHistoryData(data: any[]): void {
    const campaignsHistoryAllRegionsSet = new Set<string>();
    this.campaignsHistoryModuleData = data.map((module) => {
      let regionsSet = new Set<string>();
      let tooltipText: string = '';
      if (module.appCopy) {
        Object.values(module.appCopy.platforms).forEach((platform: any) => {
          Object.keys(platform).forEach((country: any) => {
            regionsSet.add(country);
            campaignsHistoryAllRegionsSet.add(country);
          });
        });
        tooltipText = Array.from(regionsSet).sort().join(', ');
      }

      return {
        campaignHistoryId: module.campaignHistoryId,
        name: module.name,
        startDate: moment(module.startDate).format('MM.DD.YYYY'),
        endDate: moment(module.endDate).format('MM.DD.YYYY'),
        regions: Array.from(regionsSet).sort(),
        scheduledRegions: Array.from(regionsSet).sort().join(', '),
        tooltipText,
      };
    });
    this.campaignsHistoryScheduledRegionsCheckboxesValues = Array.from(
      campaignsHistoryAllRegionsSet,
    ).sort();
    this.campaignsHistoryData = new MatTableDataSource(
      this.campaignsModuleData,
    );
  }

  editFilterValue(event, columnName: string, value?: string): void {
    const filterValue = event.target?.value;
    if (this.selectedTab.value === 0) {
      switch (columnName) {
        case 'name':
          this.campaignsNameSearchFilter = filterValue;
          break;
        case 'startDate':
          this.campaignsStartDateSearchFilter = filterValue;
          break;
        case 'endDate':
          this.campaignsEndDateSearchFilter = filterValue;
          break;
        case 'campaignsStatus':
          if (event.checked) {
            this.campaignsStatusCheckedValues.push(value as string);
          } else {
            const index = this.campaignsStatusCheckedValues.indexOf(
              value as string,
            );
            if (index !== -1) {
              this.campaignsStatusCheckedValues.splice(index, 1);
            }
          }
          break;
        case 'scheduledRegions':
          if (event.checked) {
            this.campaignsScheduledRegionsCheckedValues.push(value as string);
          } else {
            const index = this.campaignsScheduledRegionsCheckedValues.indexOf(
              value as string,
            );
            if (index !== -1) {
              this.campaignsScheduledRegionsCheckedValues.splice(index, 1);
            }
          }
          break;
      }
    } else if (this.selectedTab.value === 1) {
      switch (columnName) {
        case 'name':
          this.campaignsHistoryNameSearchFilter = filterValue;
          break;
        case 'startDate':
          this.campaignsHistoryStartDateSearchFilter = filterValue;
          break;
        case 'endDate':
          this.campaignsHistoryEndDateSearchFilter = filterValue;
          break;
        case 'scheduledRegions':
          if (event.checked) {
            this.campaignsHistoryScheduledRegionsCheckedValues.push(
              value as string,
            );
          } else {
            const index = this.campaignsHistoryScheduledRegionsCheckedValues.indexOf(
              value as string,
            );
            if (index !== -1) {
              this.campaignsHistoryScheduledRegionsCheckedValues.splice(
                index,
                1,
              );
            }
          }
          break;
      }
    }
    this.applyFilter();
    this.setCampaignFiltersInLocalStorage();
    this.setCampaignHistoryFiltersInLocalStorage();
  }

  isCountryEqualToDeafult(
    platformCode: string,
    countryCode: string,
    country: any,
  ): boolean {
    if (this.defaultCampaign && this.defaultCampaign.appCopy) {
      const defaultPlatformsCodes: any = Object.keys(
        this.defaultCampaign.appCopy.platforms,
      );
      const platformIndex: any = defaultPlatformsCodes.indexOf(platformCode);
      const defaultPlatform: any = Object.values(
        this.defaultCampaign.appCopy.platforms,
      )[platformIndex];
      if (defaultPlatform) {
        const defaultCountriesCodes: any = Object.keys(defaultPlatform);
        const countryIndex: any = defaultCountriesCodes.indexOf(countryCode);
        const defaultCountry: any = Object.values(defaultPlatform)[
          countryIndex
        ];
        if (defaultCountry) {
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

  includesSearch(columns, data, filter) {
    for (const key of columns) {
      if (data[key]) {
        if (data[key].toString().toLowerCase().indexOf(filter) !== -1) {
          return true;
        }
      }
    }
  }

  menuAction(type, element) {
    switch (type) {
      case 'DUPLICATE':
        if (this.selectedTab.value === 1) {
          this.router.navigate(
            ['/android/campaigns/duplicate', element.campaignHistoryId],
            { queryParams: { isHistory: 'true' } },
          );
        } else {
          this.router.navigate([
            '/android/campaigns/duplicate',
            element.campaignId,
          ]);
        }
        break;
      case 'DEFAULT':
        let defaultAction;
        if (element.status === ModuleStatus.LIVE) {
          if (element.deployedTo.includes('prod')) {
            defaultAction = {
              message: `${PROCEED_MESSAGE}${type}?`,
              action: 'androidDefault',
              env: 'prod',
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
      case 'VIEW':
        if (this.selectedTab.value === 1) {
          this.router.navigate(
            ['/android/campaigns/view', element.campaignHistoryId],
            { queryParams: { isHistory: 'true' } },
          );
        } else {
          this.router.navigate(['/android/campaigns/view', element.campaignId]);
        }
        break;
      case 'PUBLISH':
        const publishAction = {
          message: PROCEED_MESSAGE + type + '?',
          action: 'androidPublish',
          module: 'campaign',
          id: element.campaignId,
        };
        this.openActionDialog(type, element, publishAction);
        break;
      case 'DELETE':
        const deleteAction = {
          message: `${PROCEED_MESSAGE}${type} "${element.name}"?`,
          action: 'prompt',
        };
        this.openActionDialog(type, element, deleteAction);
        break;
    }
  }

  createNewCampaign() {
    if (this.defaultCampaign?.campaignId) {
      this.router.navigate([
        '/android/campaigns/duplicate',
        this.defaultCampaign['campaignId'],
      ]);
    } else {
      this.router.navigate(['/android/campaigns/create']);
    }
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
                  '/android/campaigns/view',
                  element.campaignId,
                ]);
                break;
              case 'DELETE':
                this.deleteCampaign(element.campaignId);
                break;
              case 'DEFAULT':
                this.defaultMenuAction(element.campaignId);
                break;
              case 'PUBLISH':
                element.status = ModuleStatus.PUBLISH_PROGRESS;
                element.environments = null;
                element.deployedTo = null;
                element.endedOn = null;
                element.statusTitle = `${this.androidManagementService.getStatusTitle(
                  ModuleStatus.PUBLISH_PROGRESS,
                )} - ${this.androidManagementService.getModuleDeploymentString(
                  result,
                )}`;
                this.publishCampaign(element.campaignId, result);
                break;
            }
          }
        });
    }
  }

  defaultMenuAction(campaignId: number) {
    this.loaderService.show();
    this.androidService
      .setCampaignDefault(campaignId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res) => {
          this.campaignsModuleData.forEach((elem) => {
            if (elem.isDefault && elem.campaignId !== campaignId) {
              this.androidService
                .unsetCampaignDefault(elem.campaignId)
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => {
                  this.openResponseDialog(res);
                });
            }
          });
        },
        (err) => {
          this.openErrorDialog(err);
        },
      );
  }

  deleteCampaign(campaignId: number): void {
    try {
      this.loaderService.show();
      this.androidService
        .deleteCampaign(campaignId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.openResponseDialog(res);
        });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  publishCampaign(campaignId: number, env: string): void {
    const tardisToken = localStorage.getItem('tardisToken');
    const tardisTokenExpiresAt = localStorage.getItem('tardisTokenExpiresAt');
    this.androidService
      .publishCampaign(
        campaignId,
        env,
        ` - ${this.androidManagementService.getModuleDeploymentString(env)}`,
        {
          tardisToken,
          tardisTokenExpiresAt,
        },
      )
      .subscribe(
        (res) => {
          this.snackbarService.show(
            res.message,
            'OK',
            '/android/campaigns',
            this.router,
          );
        },
        (err) => {
          this.snackbarService.show(
            `${err.message}`,
            'ERROR',
            '/android/campaigns',
            this.router,
          );
        },
      );
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

  clearSearchInput(searchFilter: string, ref): void {
    ref.value = '';
    this[searchFilter] = '';
    this.applyFilter();
    this.setCampaignFiltersInLocalStorage();
    this.setCampaignHistoryFiltersInLocalStorage();
  }

  applyFilter(tabIndex?: number): void {
    if ((!tabIndex && this.selectedTab.value === 0) || tabIndex === 0) {
      if (this.campaignsModuleData.length) {
        this.campaignsData = new MatTableDataSource(
          this.campaignsModuleData.filter((elem) => {
            const includeName =
              this.campaignsNameSearchFilter !== ''
                ? elem.name
                    .toLowerCase()
                    .includes(this.campaignsNameSearchFilter.toLowerCase())
                : true;
            const includeStartDate =
              this.campaignsStartDateSearchFilter !== null
                ? elem.startDate.includes(this.campaignsStartDateSearchFilter)
                : true;
            const includeEndDate =
              this.campaignsEndDateSearchFilter !== null
                ? elem.endDate.includes(this.campaignsEndDateSearchFilter)
                : true;
            const includeStatus = this.campaignsStatusCheckedValues.length
              ? this.campaignsStatusCheckedValues.some(
                  (status) => elem['statusTitle'] === status,
                )
              : true;
            const includeScheduledRegions = this
              .campaignsScheduledRegionsCheckedValues.length
              ? this.campaignsScheduledRegionsCheckedValues.every((region) =>
                  elem['regions'].includes(region),
                )
              : true;
            return (
              includeName &&
              includeStartDate &&
              includeEndDate &&
              includeStatus &&
              includeScheduledRegions
            );
          }),
        );
      } else {
        this.campaignsData = new MatTableDataSource();
      }
      this.campaignsData.sort = this.campaignsSort;
      this.campaignsData.paginator = this.campaignsPaginator;
    }
    if ((!tabIndex && this.selectedTab.value === 1) || tabIndex === 1) {
      if (this.campaignsHistoryModuleData.length) {
        this.campaignsHistoryData = new MatTableDataSource(
          this.campaignsHistoryModuleData.filter((elem) => {
            const includeName =
              this.campaignsHistoryNameSearchFilter !== ''
                ? elem.name
                    .toLowerCase()
                    .includes(
                      this.campaignsHistoryNameSearchFilter.toLowerCase(),
                    )
                : true;
            const includeStartDate =
              this.campaignsHistoryStartDateSearchFilter !== null
                ? elem.startDate.includes(
                    this.campaignsHistoryStartDateSearchFilter,
                  )
                : true;
            const includeEndDate =
              this.campaignsHistoryEndDateSearchFilter !== null
                ? elem.endDate.includes(
                    this.campaignsHistoryEndDateSearchFilter,
                  )
                : true;
            const includeScheduledRegions = this
              .campaignsHistoryScheduledRegionsCheckedValues.length
              ? this.campaignsHistoryScheduledRegionsCheckedValues.every(
                  (region) => elem['regions'].includes(region),
                )
              : true;
            return (
              includeName &&
              includeStartDate &&
              includeEndDate &&
              includeScheduledRegions
            );
          }),
        );
      } else {
        this.campaignsHistoryData = new MatTableDataSource();
      }
      this.campaignsHistoryData.sort = this.campaignsHistorySort;
      this.campaignsHistoryData.paginator = this.campaignsHistoryPaginator;
    }
  }

  getCampaignFiltersFromLocalStorage(): void {
    const campaignFiltersStr = localStorage.getItem(
      this.getFiltersConfigName(),
    );
    if (!!campaignFiltersStr) {
      const campaignFiltersObj = JSON.parse(campaignFiltersStr);
      this.campaignsNameSearchFilter =
        !!campaignFiltersObj && !!campaignFiltersObj.campaignsNameSearchFilter
          ? campaignFiltersObj.campaignsNameSearchFilter
          : '';
      this.campaignsStartDateSearchFilter =
        !!campaignFiltersObj &&
        !!campaignFiltersObj.campaignsStartDateSearchFilter
          ? campaignFiltersObj.campaignsStartDateSearchFilter
          : '';
      this.campaignsEndDateSearchFilter =
        !!campaignFiltersObj &&
        !!campaignFiltersObj.campaignsEndDateSearchFilter
          ? campaignFiltersObj.campaignsEndDateSearchFilter
          : '';
      this.campaignsStatusCheckedValues =
        !!campaignFiltersObj &&
        !!campaignFiltersObj.campaignsStatusCheckedValues
          ? JSON.parse(campaignFiltersObj.campaignsStatusCheckedValues)
          : [];
      this.campaignsScheduledRegionsCheckedValues =
        !!campaignFiltersObj &&
        !!campaignFiltersObj.campaignsScheduledRegionsCheckedValues
          ? JSON.parse(
              campaignFiltersObj.campaignsScheduledRegionsCheckedValues,
            )
          : [];
    } else {
      this.clearAllCampaignFilters();
    }
  }

  getFiltersConfigName(): string {
    return `${this.currentStore.code}-${this.currentProduct.code}-campaigns${
      this.selectedTab.value === 0 ? '' : '-history'
    }-filters`;
  }

  setCampaignFiltersInLocalStorage(): void {
    const campaignFiltersObj = {
      campaignsNameSearchFilter: this.campaignsNameSearchFilter,
      campaignsStartDateSearchFilter: this.campaignsStartDateSearchFilter,
      campaignsEndDateSearchFilter: this.campaignsEndDateSearchFilter,
      campaignsStatusCheckedValues: JSON.stringify(
        this.campaignsStatusCheckedValues,
      ),
      campaignsScheduledRegionsCheckedValues: JSON.stringify(
        this.campaignsScheduledRegionsCheckedValues,
      ),
    };
    localStorage.setItem(
      this.getFiltersConfigName(),
      JSON.stringify(campaignFiltersObj),
    );
  }

  getCampaignHistoryFiltersFromLocalStorage(): void {
    const campaignHistoryFiltersStr = localStorage.getItem(
      this.getFiltersConfigName(),
    );
    if (!!campaignHistoryFiltersStr) {
      const campaignHistoryFiltersObj = JSON.parse(campaignHistoryFiltersStr);
      this.campaignsHistoryNameSearchFilter =
        !!campaignHistoryFiltersObj &&
        !!campaignHistoryFiltersObj.campaignsHistoryNameSearchFilter
          ? campaignHistoryFiltersObj.campaignsHistoryNameSearchFilter
          : '';
      this.campaignsHistoryStartDateSearchFilter =
        !!campaignHistoryFiltersObj &&
        !!campaignHistoryFiltersObj.campaignsHistoryStartDateSearchFilter
          ? campaignHistoryFiltersObj.campaignsHistoryStartDateSearchFilter
          : '';
      this.campaignsHistoryEndDateSearchFilter =
        !!campaignHistoryFiltersObj &&
        !!campaignHistoryFiltersObj.campaignsHistoryEndDateSearchFilter
          ? campaignHistoryFiltersObj.campaignsHistoryEndDateSearchFilter
          : '';
      this.campaignsHistoryScheduledRegionsCheckedValues =
        !!campaignHistoryFiltersObj &&
        !!campaignHistoryFiltersObj.campaignsHistoryScheduledRegionsCheckedValues
          ? JSON.parse(
              campaignHistoryFiltersObj.campaignsHistoryScheduledRegionsCheckedValues,
            )
          : [];
    } else {
      this.clearAllCampaignHistoryFilters();
    }
  }

  setCampaignHistoryFiltersInLocalStorage(): void {
    const campaignHistoryFiltersObj = {
      campaignsHistoryNameSearchFilter: this.campaignsHistoryNameSearchFilter,
      campaignsHistoryStartDateSearchFilter: this
        .campaignsHistoryStartDateSearchFilter,
      campaignsHistoryEndDateSearchFilter: this
        .campaignsHistoryEndDateSearchFilter,
      campaignsHistoryScheduledRegionsCheckedValues: JSON.stringify(
        this.campaignsHistoryScheduledRegionsCheckedValues,
      ),
    };
    localStorage.setItem(
      this.getFiltersConfigName(),
      JSON.stringify(campaignHistoryFiltersObj),
    );
  }

  getEditHRef(element) {
    if (this.selectedTab.value === 0) {
      return `/#/android/campaigns/view/${element.campaignId}`;
    } else if (this.selectedTab.value === 1) {
      return `/#/android/campaigns/view/${element.campaignHistoryId}?isHistory=true`;
    }
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

  toggleFiltersBlock() {
    this.showFiltersBlock = !this.showFiltersBlock;
  }

  changeTab(event): void {
    this.selectedTab.setValue(event);
    localStorage.setItem('androidCampaignsTab', JSON.stringify(event));
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

  clearAllCampaignFilters(): void {
    this.campaignsNameSearchFilter = '';
    this.campaignsStartDateSearchFilter = '';
    this.campaignsEndDateSearchFilter = '';
    this.campaignsStatusCheckedValues = [];
    this.campaignsScheduledRegionsCheckedValues = [];
    this.applyFilter(0);
    this.setCampaignFiltersInLocalStorage();
  }

  clearAllCampaignHistoryFilters(): void {
    this.campaignsHistoryNameSearchFilter = '';
    this.campaignsHistoryStartDateSearchFilter = '';
    this.campaignsHistoryEndDateSearchFilter = '';
    this.campaignsHistoryScheduledRegionsCheckedValues = [];
    this.applyFilter(1);
    this.setCampaignHistoryFiltersInLocalStorage();
  }

  ngOnDestroy(): void {
    this.regionsLanguagesSubscription.unsubscribe();
    this.campaignModuleSubscription.unsubscribe();
    this.campaignHistoryModuleSubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
