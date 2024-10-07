import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogInfo } from '../../types/payload';
import { AndroidService } from '../../service/android.service';
import { RokuService } from '../../service/roku.service';
import { Observable, Subject, Subscription } from 'rxjs';
import { elementAt, filter, takeUntil } from 'rxjs/operators';
import { getFileSizeInBytes } from '../../helpers/string-utils';
import { LoaderService } from '../../service/loader.service';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
})
export class DialogComponent implements OnInit {
  action: string;
  errors: string[];

  public androidEnv: string = 'dev';
  public rokuEnv: string = 'dev';
  public password: string = '';
  public passwordError: string = '';
  public envArr: any[] = [];
  public uploadError: string = '';
  public uploadedImages: any[];
  public overwriting: any = {
    warningNames: [],
    warningLists: [],
    warningListName: '',
  };
  public deleting: any = {
    warningNames: [],
  };
  public campaignName = '';
  public uploadUrl = '';
  public uploadButtonDisabled = true;
  public uploadPending = false;
  public uploadMultipleImages: boolean;
  public dimensions: string = '';
  public maxSizeStr: string = '';
  public maxSize: number = 0;
  public showPasswordField: boolean = false;
  public spanChanges: any = {};

  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogInfo,
    private dialogRef: MatDialogRef<DialogComponent>,
    private androidService: AndroidService,
    private rokuService: RokuService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.action = this.data.action;
    this.errors = this.data.errors;
    if (this.data.env) {
      this.androidEnv = this.data.env;
      this.rokuEnv = this.data.env;
    }
    if (
      this.action === 'androidUploadImage' ||
      this.action === 'rokuUploadImage'
    ) {
      this.uploadMultipleImages = this.data.multiple as boolean;
      this.dimensions = !!this.data.dimensions ? this.data.dimensions : '';
      this.maxSizeStr = !!this.data.maxSize
        ? (this.data.maxSize as string)
        : '';
      this.maxSize = !!this.data.maxSize
        ? (getFileSizeInBytes(this.data.maxSize) as number)
        : 0;
    }
    if (
      this.action === 'androidPublish' ||
      this.action === 'androidListPublish' ||
      (this.action === 'androidDefault' && this.data.env === 'prod')
    ) {
      this.setAndroidEnv();
    }
    if (
      this.action === 'rokuPublish' ||
      this.action === 'rokuListPublish' ||
      (this.action === 'rokuDefault' && this.data.env === 'prod')
    ) {
      this.setRokuEnv();
    }
    if (
      this.action === 'androidDelete' ||
      this.action === 'androidArchive' ||
      this.action === 'rokuDelete' ||
      this.action === 'rokuArchive'
    ) {
      this.setDeleteWarningMessage();
    }
  }

  setAndroidEnv(): void {
    this.androidService
      .getAllEnv()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.envArr = res.data;
        this.showPasswordField = !!this.data.showPasswordField;
        this.spanChanges = this.data.changes;
        if (this.action === 'androidPublish') {
          this.setPublishOverwritingMessage();
        }
      });
  }

  setRokuEnv(): void {
    this.rokuService
      .getAllEnv()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.envArr = res.data;
        this.showPasswordField = !!this.data.showPasswordField;
        this.spanChanges = this.data.changes;
        if (this.action === 'rokuPublish') {
          this.setRokuPublishOverwritingMessage();
        }
      });
  }

  setRokuPublishOverwritingMessage(): void {
    this.loaderService.show('Getting overwriting message...');
    this.rokuService
      .getPublishWarning(
        this.data.module as string,
        this.data.id as number,
        this.rokuEnv,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.overwriting.warningNames = [];
        this.overwriting.warningLists = [];
        this.overwriting.warningListName = '';
        this.campaignName = '';
        if (res.data) {
          if (this.data['module'] === 'campaign') {
            this.campaignName = res.data.name;
          } else {
            res.data.forEach((elem) => {
              this.overwriting.warningNames.push(elem.name);
              this.overwriting.warningLists.push(elem.list);
            });
            this.overwriting.warningListName = res.data[0].listName;
          }
        }
        this.loaderService.hide();
      });
  }

  setPublishOverwritingMessage(): void {
    this.loaderService.show('Getting overwriting message...');
    this.androidService
      .getPublishWarning(
        this.data.module as string,
        this.data.id as number,
        this.androidEnv,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.overwriting.warningNames = [];
        this.overwriting.warningLists = [];
        this.overwriting.warningListName = '';
        this.campaignName = '';
        if (res.data) {
          if (this.data['module'] === 'campaign') {
            this.campaignName = res.data.name;
          } else {
            res.data.forEach((elem) => {
              this.overwriting.warningNames.push(elem.name);
              this.overwriting.warningLists.push(elem.list);
            });
            this.overwriting.warningListName = res.data[0].listName;
          }
        }
        this.loaderService.hide();
      });
  }

  androidEnvChange(env: string): void {
    this.androidEnv = env;
    // this.setPublishOverwritingMessage();
  }

  rokuEnvChange(env: string): void {
    this.rokuEnv = env;
    this.setRokuPublishOverwritingMessage();
  }

  androidSendEnv(): void {
    if (this.androidEnv === 'prod' || !!this.showPasswordField) {
      this.androidService.validatePassword(this.password).subscribe(
        (res) => {
          if (res.data) {
            this.passwordError = res.data.error;
          } else {
            this.passwordError = '';
            this.dialogRef.close(this.androidEnv);
          }
        },
        (err) => {
          this.passwordError = 'Please enter password';
        },
      );
    } else {
      this.dialogRef.close(this.androidEnv);
    }
  }

  rokuSendEnv(): void {
    if (this.rokuEnv === 'prod' || !!this.showPasswordField) {
      this.rokuService.validatePassword(this.password).subscribe(
        (res) => {
          if (res.data) {
            this.passwordError = res.data.error;
          } else {
            this.passwordError = '';
            this.dialogRef.close(this.rokuEnv);
          }
        },
        (err) => {
          this.passwordError = 'Please enter password';
        },
      );
    } else {
      this.dialogRef.close(this.rokuEnv);
    }
  }

  setDeleteWarningMessage(): void {
    if (this.data['id']) {
      this.getProperServiceEndpoint(this.data['id'])
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.deleting.warningNames = [];
          if (res.data) {
            res.data.forEach((elem) => {
              this.deleting.warningNames.push(elem);
            });
          }
        });
    }
  }

  getProperServiceEndpoint(id: number): any {
    switch (this.data['module']) {
      case 'app-copy':
        return this.androidService.getAppCopyUsageData(id);
      case 'sku':
        return this.androidService.getSkuUsageData(id);
      case 'selector-config':
        return this.androidService.getSelectorConfigUsageData(id);
      case 'image-collection':
        return this.androidService.getImageCollectionUsageData(id);
      case 'store-copy':
        return this.androidService.getStoreCopyUsageData(id);
    }
  }

  androidSave(): void {
    this.dialogRef.close('save');
  }

  rokuSave(): void {
    this.dialogRef.close('save');
  }

  androidUploadImage(): void {
    this.dialogRef.close(this.uploadedImages);
  }

  rokuUploadImage(): void {
    this.dialogRef.close(this.uploadedImages);
  }

  leavePage(): void {
    this.dialogRef.close('leave');
  }

  closeDialog(): void {
    this.dialogRef.close('cancel');
  }

  pullPromotionModule(acceptChanges: string): void {
    this.dialogRef.close(acceptChanges);
  }

  onFilesSelected(files: any[]): void {
    this.uploadedImages = files;
    this.uploadButtonDisabled = false;
  }

  getFirstCharUpperCaseString(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  getCurrentAndroidStore() {
    return this.androidService.store.getValue();
  }

  getCurrentAndroidProduct() {
    return this.androidService.product.getValue();
  }

  getCurrentRokuStore() {
    return this.rokuService.store.getValue();
  }

  getCurrentRokuProduct() {
    return this.rokuService.product.getValue();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
