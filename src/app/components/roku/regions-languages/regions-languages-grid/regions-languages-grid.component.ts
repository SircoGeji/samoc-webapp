import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { BaseComponent } from '../../../base/base.component';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LoaderService } from '../../../../service/loader.service';
import { RokuService } from '../../../../service/roku.service';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject, combineLatest } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { RokuRegionModalComponent } from '../region-modal/region-modal.component';
import { MatPaginator } from '@angular/material/paginator';
import { RokuLanguageModalComponent } from '../language-modal/language-modal.component';
import { PROCEED_MESSAGE } from '../../../../constants';
import { RokuManagementUtils } from '../../../../utils/rokuManagement.utils';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

@Component({
  selector: 'app-regions-languages-grid',
  templateUrl: './regions-languages-grid.component.html',
  styleUrls: ['./regions-languages-grid.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RokuRegionsLanguagesGridComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public selectedTab = new FormControl(0);
  public showFiltersBlock = false;
  public importedRegions;
  public importedLanguages;
  public languagesSet;
  public regionsSource: MatTableDataSource<any>;
  public languagesSource: MatTableDataSource<any>;
  public regionNameFilterValue = '';
  public regionCodeFilterValue = '';
  public supportedLanguagesFilterValue: string[] = [];
  public languageNameFilterValue = '';
  public languageCodeFilterValue = '';
  public allRegionsArray;
  public regionsTableHeaders: string[] = [
    'REGION NAME',
    'CODE',
    'LANGUAGES',
    '',
  ];
  public regionsDataKeys: string[] = ['name', 'code', 'languages', 'actions'];
  public regionsFiltersHeaders: string[] = ['REGION NAME', 'CODE', 'LANGUAGES'];
  public languagesTableHeaders: string[] = ['LANGUAGE NAME', 'CODE', ''];
  public languagesDataKeys: string[] = ['name', 'code', 'actions'];
  public languagesFiltersHeaders: string[] = ['LANGUAGE NAME', 'CODE'];

  @ViewChild('regionTable', { read: MatSort, static: true })
  regionsSort: MatSort;
  @ViewChild('languageTable', { read: MatSort, static: true })
  languagesSort: MatSort;
  @ViewChild('regionsPaginator') regionsPaginator: MatPaginator;
  @ViewChild('languagesPaginator') languagesPaginator: MatPaginator;

  private destroy$ = new Subject<void>();
  private currentStore: any;
  private currentProduct: any;

  constructor(
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    private rokuService: RokuService,
    private rokuManagementUtils: RokuManagementUtils,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.currentStore = this.rokuService.getStore();
    this.currentProduct = this.rokuService.getProduct();
    this.loaderService.show();
    const selectedTab = JSON.parse(
      localStorage.getItem('rokuRegionTab') as string,
    );
    if (selectedTab) {
      this.selectedTab.setValue(selectedTab);
    }
    this.getRegionsLanguagesBinding();
  }

  getRegionsLanguagesBinding(): void {
    this.rokuService
      .getRegionsLanguages(this.currentStore.code, this.currentProduct.code)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.importedRegions = Object.values(res.data).map((region: any) => {
          const languagesCodes = Object.keys(region.languages).join(', ');
          return {
            code: region.code,
            name: region.name,
            languages: languagesCodes,
            regionId: region.countryId,
            isActive: region.isActive,
            defaultLanguage: region.defaultLanguage,
          };
        });
        let languagesArray = [];
        this.importedRegions.forEach((region) => {
          languagesArray = languagesArray.concat(region.languages.split(', '));
        });
        this.languagesSet = new Set(languagesArray);

        this.regionsSource = new MatTableDataSource(this.importedRegions);
        this.regionsSource.sort = this.regionsSort;
        this.regionsSource.paginator = this.regionsPaginator;

        this.getRegionsFiltersFromLocalStorage();
        this.applyFilter(0);

        this.getLanguages();
      });
  }

  getLanguages(): void {
    this.rokuService
      .getLanguages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.importedLanguages = res.data;

        this.languagesSource = new MatTableDataSource(this.importedLanguages);
        this.languagesSource.sort = this.languagesSort;
        this.languagesSource.paginator = this.languagesPaginator;

        this.getLanguagesFiltersFromLocalStorage();
        this.applyFilter(1);

        this.rokuService
          .getAllRegions()
          .pipe(takeUntil(this.destroy$))
          .subscribe((allRegionsRes) => {
            this.allRegionsArray = allRegionsRes.data;
            this.loaderService.hide();
          });
      });
  }

  isDeleteLanguageDisabled(element): boolean {
    if (this.allRegionsArray) {
      let flag = false;
      this.allRegionsArray.forEach((region) => {
        Object.keys(region.languages).forEach((languageCode) => {
          if (languageCode === element.code) {
            flag = true;
          }
        });
      });
      return flag;
    } else {
      return false;
    }
  }

  toggleFiltersBlock() {
    this.showFiltersBlock = !this.showFiltersBlock;
  }

  changeTab(event): void {
    this.selectedTab.setValue(event);
    localStorage.setItem('rokuRegionTab', JSON.stringify(event));
  }

  editFilterValue(event, columnName: string, language?: string): void {
    const filterValue = event.target?.value;
    if (this.selectedTab.value === 0) {
      switch (columnName) {
        case 'name':
          this.regionNameFilterValue = filterValue;
          break;
        case 'code':
          this.regionCodeFilterValue = filterValue;
          break;
        case 'supportedLanguages':
          if (event.checked) {
            this.supportedLanguagesFilterValue.push(language as string);
          } else {
            const index = this.supportedLanguagesFilterValue.indexOf(
              language as string,
            );
            if (index !== -1) {
              this.supportedLanguagesFilterValue.splice(index, 1);
            }
          }
          break;
      }
    } else if (this.selectedTab.value === 1) {
      switch (columnName) {
        case 'name':
          this.languageNameFilterValue = filterValue;
          break;
        case 'code':
          this.languageCodeFilterValue = filterValue;
          break;
      }
    }
    this.applyFilter();
    this.setRegionsFiltersInLocalStorage();
    this.setLanguagesFiltersInLocalStorage();
  }

  applyFilter(tabIndex?: number): void {
    if ((!tabIndex && this.selectedTab.value === 0) || tabIndex === 0) {
      this.regionsSource = new MatTableDataSource(
        this.importedRegions.filter((region) => {
          return (
            region.name
              .toLowerCase()
              .includes(this.regionNameFilterValue.toLowerCase()) &&
            region.code
              .toLowerCase()
              .includes(this.regionCodeFilterValue.toLowerCase()) &&
            this.supportedLanguagesFilterValue.every((language) =>
              region.languages.split(', ').includes(language),
            )
          );
        }),
      );
      this.regionsSource.sort = this.regionsSort;
      this.regionsSource.paginator = this.regionsPaginator;
    } else if ((!tabIndex && this.selectedTab.value === 1) || tabIndex === 1) {
      this.languagesSource = new MatTableDataSource(
        this.importedLanguages.filter((language) => {
          return (
            language.name
              .toLowerCase()
              .includes(this.languageNameFilterValue.toLowerCase()) &&
            language.code
              .toLowerCase()
              .includes(this.languageCodeFilterValue.toLowerCase())
          );
        }),
      );
      this.languagesSource.sort = this.languagesSort;
      this.languagesSource.paginator = this.languagesPaginator;
    }
  }

  getFiltersConfigName(): string {
    return `${this.currentStore.code}-${this.currentProduct.code}-${
      this.selectedTab.value === 0 ? 'regions' : 'languages'
    }-filters`;
  }

  getRegionsFiltersFromLocalStorage(): void {
    const regionFiltersStr = localStorage.getItem(this.getFiltersConfigName());
    if (!!regionFiltersStr) {
      const regionFilterObj = JSON.parse(regionFiltersStr);
      this.regionNameFilterValue =
        !!regionFilterObj && !!regionFilterObj.regionNameFilterValue
          ? regionFilterObj.regionNameFilterValue
          : '';
      this.regionCodeFilterValue =
        !!regionFilterObj && !!regionFilterObj.regionCodeFilterValue
          ? regionFilterObj.regionCodeFilterValue
          : '';
      this.supportedLanguagesFilterValue =
        !!regionFilterObj && !!regionFilterObj.supportedLanguagesFilterValue
          ? JSON.parse(regionFilterObj.supportedLanguagesFilterValue)
          : [];
    } else {
      this.clearAllRegionsFilters();
    }
  }

  setRegionsFiltersInLocalStorage(): void {
    const regionFilterObj = {
      regionNameFilterValue: this.regionNameFilterValue,
      regionCodeFilterValue: this.regionCodeFilterValue,
      supportedLanguagesFilterValue: JSON.stringify(
        this.supportedLanguagesFilterValue,
      ),
    };
    localStorage.setItem(
      this.getFiltersConfigName(),
      JSON.stringify(regionFilterObj),
    );
  }

  getLanguagesFiltersFromLocalStorage(): void {
    const languageFiltersStr = localStorage.getItem(
      this.getFiltersConfigName(),
    );
    if (!!languageFiltersStr) {
      const languageFilterObj = JSON.parse(languageFiltersStr);
      this.languageNameFilterValue =
        !!languageFilterObj && !!languageFilterObj.languageNameFilterValue
          ? languageFilterObj.languageNameFilterValue
          : '';
      this.languageCodeFilterValue =
        !!languageFilterObj && !!languageFilterObj.languageCodeFilterValue
          ? languageFilterObj.languageCodeFilterValue
          : '';
    } else {
      this.clearAllLanguagesFilters();
    }
  }

  setLanguagesFiltersInLocalStorage(): void {
    const languageFilterObj = {
      languageNameFilterValue: this.languageNameFilterValue,
      languageCodeFilterValue: this.languageCodeFilterValue,
    };
    localStorage.setItem(
      this.getFiltersConfigName(),
      JSON.stringify(languageFilterObj),
    );
  }

  clearSearchInputs(columnName, ref): void {
    if (this.selectedTab.value === 0) {
      if (columnName === 'name') {
        this.regionNameFilterValue = '';
      } else if (columnName === 'code') {
        this.regionCodeFilterValue = '';
      }
    } else if (this.selectedTab.value === 1) {
      if (columnName === 'name') {
        this.languageNameFilterValue = '';
      } else if (columnName === 'code') {
        this.languageCodeFilterValue = '';
      }
    }
    ref.value = '';
    this.applyFilter();
    this.setRegionsFiltersInLocalStorage();
    this.setLanguagesFiltersInLocalStorage();
  }

  createRegion(): void {
    this.dialog.open(RokuRegionModalComponent, {
      width: '400px',
      height: '615px',
      panelClass: 'region-modal',
      data: {
        allRegions: this.allRegionsArray,
        allLanguages: this.importedLanguages,
        pageQuery: 'create',
      },
    });
  }

  createLanguage(): void {
    this.dialog.open(RokuLanguageModalComponent, {
      width: '385px',
      height: '320px',
      panelClass: 'language-modal',
      data: {
        allLanguages: this.importedLanguages,
        pageQuery: 'create',
      },
    });
  }

  menuAction(type, tab, element) {
    switch (type) {
      case 'EDIT':
        if (tab === 0) {
          this.openRegionDialog(element);
        } else if (tab === 1) {
          this.openLanguageDialog(element);
        }
        break;
      case 'DELETE':
        this.openActionDialog(type, tab, element);
        break;
    }
  }

  openRegionDialog(element) {
    this.dialog.open(RokuRegionModalComponent, {
      width: '500px',
      height: '615px',
      panelClass: 'region-modal',
      data: {
        allRegions: this.allRegionsArray,
        allLanguages: this.importedLanguages,
        pageQuery: 'view',
        region: element,
      },
    });
  }

  openLanguageDialog(element) {
    this.dialog.open(RokuLanguageModalComponent, {
      width: '385px',
      height: '320px',
      panelClass: 'language-modal',
      data: {
        allLanguages: this.importedLanguages,
        pageQuery: 'view',
        language: element,
      },
    });
  }

  openActionDialog(type, tab, element) {
    const action = {};
    const tabTitle = tab === 0 ? 'region' : 'language';
    const warning = element.isActive
      ? `This ${tabTitle} is active, thus the deletion will affect modules where it is used.`
      : '';
    action[
      'message'
    ] = `${warning} ${PROCEED_MESSAGE}${type} "${element.name}"?`;
    action['action'] = 'prompt';
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      dialogActionRef.afterClosed().subscribe((result) => {
        if (result) {
          if (tab === 0) {
            this.deleteRegion(element.regionId);
          } else if (tab === 1) {
            this.deleteLanguage(element.languageId);
          }
        }
      });
    }
  }

  deleteRegion(regionId): void {
    try {
      this.loaderService.show();
      this.rokuService
        .deleteRegion(regionId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.openResponseDialog(res);
        });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  deleteLanguage(languageId): void {
    try {
      this.loaderService.show();
      this.rokuService
        .deleteLanguage(languageId)
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
          this.rokuManagementUtils.refreshTablePageNavigation(this.router);
        }
      });
  }

  isElementChecked(elem: any, checkedValuesArr: any[]): boolean {
    const checkedSet = new Set<string>(checkedValuesArr);
    return checkedSet.has(elem);
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

  clearAllRegionsFilters(): void {
    this.regionNameFilterValue = '';
    this.regionCodeFilterValue = '';
    this.supportedLanguagesFilterValue = [];
    this.applyFilter(0);
    this.setRegionsFiltersInLocalStorage();
  }

  clearAllLanguagesFilters(): void {
    this.languageNameFilterValue = '';
    this.languageCodeFilterValue = '';
    this.applyFilter(1);
    this.setLanguagesFiltersInLocalStorage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
