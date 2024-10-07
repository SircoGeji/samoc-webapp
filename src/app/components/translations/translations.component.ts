import { Subject, Subscription } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { MatSelectChange } from '@angular/material/select';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

import { BaseComponent } from '../../components/base/base.component';
import { MatDialog } from '@angular/material/dialog';
import { LoaderService } from '../../service/loader.service';
import { Router } from '@angular/router';
import { TranslationsService } from '../../service/translations.service';
import { StoreTranslatedPayload, StoreTranslatedStatus } from '../../types/payload';
import { getServerDateTime } from '../../helpers/date-utils';
import { getStatusColor } from '../../helpers/color-utils';
import { StatusEnum } from '../../types/enum';

@Component({
  selector: 'app-translations',
  templateUrl: './translations.component.html',
  styleUrls: ['./translations.component.scss'],
})
export class TranslationsComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  dialogResponseSubscription: Subscription;
  public store: any;

  translationsPayload: StoreTranslatedPayload;
  countries = [];
  storeOffers = [];
  selectedCountry = '';
  selectedStoreOffer = '';
  translations = [];
  stockColumns: string[] = ['key', 'delete-button'];
  displayedColumns: string[] = [];
  changes = new Array();
  dynamicColumns = [];
  // tableTranslations = new MatTableDataSource<any>();
  tableTranslations = [];

  description: string;
  canEdit: boolean;
  canRollback: boolean;
  canPublish: boolean;
  canUpdate: boolean;
  canCreate: boolean;
  stateStatus: StoreTranslatedStatus = StoreTranslatedStatus.NEW;
  status: StatusEnum = StatusEnum.DFT;

  private destroy$ = new Subject<void>();

  constructor(
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public translationService: TranslationsService,
    public router: Router,
    private _ngZone: NgZone,
  ) {
    super(dialog, loaderService, router);
  }

  @ViewChild('autosize') autosize: CdkTextareaAutosize;

  ngOnInit(): void {
    this.loadCountries();
  }

  loadCountries() {
    this.loaderService.show('Loading translations...');
    this.translationService
      .getStoreTranslations()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        console.log('Translations payload: ', res);
        this.translationsPayload = res;
        this.loaderService.hide();
        this.countries = this.translationsPayload.translations.countries;
        this.stateStatus = this.translationsPayload.translatedState.status;
        switch (this.stateStatus) {
          case StoreTranslatedStatus.STG:
            this.status = StatusEnum.STG;
            break;
          case StoreTranslatedStatus.PROD:
            this.status = StatusEnum.PROD;
        }
        this.canEdit = true;
        this.canRollback = res.translatedState.canRetire;
        this.canPublish = res.translatedState.status === StoreTranslatedStatus.STG; // && !this.canEdit;
        this.canUpdate = this.canEdit && res.translatedState.status === StoreTranslatedStatus.STG;
        this.canCreate = this.canEdit && res.translatedState.status !== StoreTranslatedStatus.STG;
        if (res.translatedState.status === StoreTranslatedStatus.STG) {
          this.description = `Created by ${res.translatedState.updatedBy} at ${this.formatTs(res.translatedState.updatedAt)}`;
        } else if (res.translatedState.status === StoreTranslatedStatus.PROD) {
          this.description = `Published by ${res.translatedState.updatedBy} at ${this.formatTs(res.translatedState.updatedAt)}`;
        }
      });
  }

  countriesChangeHandler(event: MatSelectChange) {
    this.countries.forEach((country) => {
      if (event.value !== '') {
        if (country.countries[0] === event.value) {
          this.storeOffers = [...country.promotionOffers];
          this.selectedStoreOffer = '';
        }
      } else {
        this.storeOffers = [];
      }
    });
  }

  storeOffersChangeHandler(event: MatSelectChange) {
    // console.log(event)
    this.storeOffers.forEach((offer) => {
      if (event.value !== '') {
        if (offer.storeOfferType === event.value) {
          this.translations = [...offer.translations];
          this.setTableDataSource();
          this.setDynamicColumns();
        }
      } else {
        this.translations = [];
      }
    });
  }

  updateTranslations() {
    this.tableTranslations = this.tableTranslations.filter(value => Object.keys(value).length !== 0 && value['keyName'] !== '' && value['keyName'] !== undefined);
    let data = [...this.tableTranslations];
    this.changes = JSON.parse(JSON.stringify(this.translations));
    let keys = [];
    data.forEach((trans: object) => {
      keys.push(trans['keyName']);
    });
    for (let i = 0; i < Object.keys(data[0]).length - 1; i++) {
      let values = [];
      data.forEach((trans: object) => {
        if (trans[i] === 'true' || trans[i] === 'false') {
          const enterValue = (trans[i] === 'true');
          values.push(enterValue);
        } else {
          values.push(trans[i]);
        }
      });
      var result = values.reduce((result, field, index) => {
        result[keys[index]] = field;
        return result;
      }, {});
      this.changes[i]['storeOffers'][0] = result;
    }
    this.tableTranslations = [...this.tableTranslations, {}];
  }

  changesWereMade(): boolean {
    if (this.translations.length === 0 || this.changes.length === 0) {
      return false;
    } else {
      return !this.objectsAreSame(this.translations, this.changes);
    }
  }

  objectsAreSame(a: object, b: object): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  saveChanges() {
    this.updateTranslationsPayload();
    this.translations = JSON.parse(JSON.stringify(this.changes));
  }

  canChangeTranslation() {
    return this.stateStatus !== StoreTranslatedStatus.STG;
  }

  getKeylessTooltip(element) {
    if (Object.keys(element).length === 0) {
      return 'Please enter key of translation first'
    }
    return null;
  }

  setTableDataSource() {
    let keys = Object.keys(this.translations[0].storeOffers[0]).map((obj) => {
      return {
        keyName: obj
      }
    });
    this.translations.forEach((lang, i) => {
      let values = Object.values(lang.storeOffers[0]);
      keys = keys.map((obj, j) => {
        return {
          ...obj,
          [i]: values[j]
        }
      })
    })
    this.tableTranslations = [...keys, {}];
  }

  deleteTranslation(elem): void {
    const type = 'DELETE';
    const action = {};
    action['message'] = 'Do you wish to ' + type + ' translation?';
    action['action'] = 'prompt';
    this.openActionDialog(action, type, elem);
  }

  openActionDialog(action, type, elem) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            if (type === 'DELETE') {
              this.deleteRowData(elem);
            }
          }
        });
    }
  }

  deleteRowData(row_obj){
    this.tableTranslations = this.tableTranslations.filter((value, key) => {
      return value.keyName != row_obj.keyName;
    });
    this.updateTranslations();
  }

  triggerResize() {
    // Wait for changes to be applied, then trigger textarea resize.
    this._ngZone.onStable
      .pipe(take(1))
      .subscribe(() => this.autosize.resizeToFitContent(true));
  }

  switchCheckbox(element, row) {
    this.tableTranslations.forEach(trans => {
      if (trans['keyName'] === element['keyName']) {
        trans[row] = !trans[row]
      }
    })
    this.updateTranslations()
  }

  setDynamicColumns() {
    this.dynamicColumns = [];
    this.displayedColumns = [...this.stockColumns];
    this.translations.forEach(elem => {
      this.dynamicColumns.push(elem.lang);
    });
    this.displayedColumns.splice(1, 0, ...this.dynamicColumns);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openUpdateResponse(response) {
    super
      .openResponse(response)
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        location.reload();
      });
  }

  updateTranslationsPayload() {
    this.translationsPayload.translations.countries.forEach(country => {
      if (country.countries[0] === this.selectedCountry) {
        country.promotionOffers.forEach(offer => {
          if (offer.storeOfferType === this.selectedStoreOffer) {
            offer.translations = [...this.changes];
          }
        })
      }
    })
  }

  async doSave(publish: boolean) {
    try {
      this.loaderService.show();
      const response = await this.translationService.updateStoreTranslations(
        this.translationsPayload, publish).toPromise();
      this.openUpdateResponse(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async doRollback() {
    try {
      this.loaderService.show();
      const response = await this.translationService.rollbackStoreTranslations(
        this.translationsPayload.translatedState).toPromise();
      this.openUpdateResponse(response);
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  update(publish: boolean): void {
    const action = {};
    if (publish) {
      action['message'] = 'Publish changes to PROD?';
    } else {
      action['message'] = 'Put changes to STG?';
    }
    action['action'] = 'prompt';
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      this.dialogResponseSubscription = dialogActionRef
        .afterClosed()
        .subscribe((result) => {
          if (result) {
            this.doSave(publish);
          }
        });
    }
  }

  stage() {
    this.update(false);
  }

  publish() {
    this.update(true);
  }

  getStatusTitle() {
    switch (this.stateStatus) {
      case StoreTranslatedStatus.NEW:
        return 'NEW';
      case StoreTranslatedStatus.STG:
        return 'STG';
      case StoreTranslatedStatus.PROD:
        return 'PROD';
    }
  }

  formatTs(isoTs: string) {
    const date = getServerDateTime(isoTs, 'date');
    const time = getServerDateTime(isoTs, 'time');
    return `${date} ${time}`;
  }

  getStatusColor(): string {
    return getStatusColor(this.status);
  }

}
