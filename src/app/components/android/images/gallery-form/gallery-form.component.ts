import { Component, OnInit, ViewEncapsulation, Inject, Injectable, Input, OnDestroy } from '@angular/core';
import { AndroidService } from '../../../../service/android.service';
import { Subject, Subscription, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormControl, FormGroup } from '@angular/forms';
import { LoaderService } from '../../../../service/loader.service';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BaseComponent } from '../../../base/base.component';
import { PROCEED_MESSAGE } from '../../../../constants';
import { DialogComponent } from '../../../dialog/dialog.component';
import { AndroidImageService } from '../../../../service/android-image.service';
import { getFileSizeInBytes } from '../../../../helpers/string-utils';

@Injectable({ providedIn: 'root' })
@Component({
  selector: 'gallery-form',
  templateUrl: './gallery-form.component.html',
  styleUrls: ['./gallery-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AndroidGalleryFormComponent extends BaseComponent implements OnInit, OnDestroy {
  @Input() isInTab: boolean;
  @Input() loadingEnded: boolean;
  public mobileFields: any[] = [];
  public ftFields: any[] = [];
  public regionsLanguagesBinding: any[] = [];
  public mobileFormGroup: FormGroup;
  public ftFormGroup: FormGroup;
  public selectedTab = new FormControl(0);
  public mobilePositionArray: boolean[] = [];
  public ftPositionArray: boolean[] = [];
  public mobileRegionPosition = 0;
  public ftRegionPosition = 0;
  public pageQuery = 'create';

  public activeSort: string = '';
  public galleryModuleData: any[] = [];

  public mobileCopyImages: any[] = [];
  public ftCopyImages: any[] = [];

  public isInDialog: boolean = false;
  public selectedImageUrl: string = '';
  public selectedImageId: number;
  public galleryPending: boolean = false;

  private dialogResponseSubscription: Subscription;
  private gallerySubscription: Subscription;
  private destroy$ = new Subject<void>();
  private _reqDimen: string = '';
  private _reqMaxSize: number = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public injectedData: any,
    public loaderService: LoaderService,
    public router: Router,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<AndroidGalleryFormComponent>,
    private androidService: AndroidService,
    private androidImageService: AndroidImageService,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    if (this.injectedData.isInDialog === true) {
      this.isInDialog = true;
    }
    combineLatest([
      this.androidService.store,
      this.androidService.product,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultArr) => {
        if (this.isInDialog) {
          this._reqDimen = this.injectedData.reqDimen;
          this._reqMaxSize = getFileSizeInBytes(this.injectedData.reqMaxSize) as number;
        }
        this.getGalleryDefaultData(resultArr[0], resultArr[1]);
      });
  }

  getGalleryDefaultData(store: any, product: any): void {
    this.galleryPending = true;
    this.gallerySubscription =
      this.androidService
        .getAllImageGallery(store.code, product.code)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          if (res && res.data.length) {
            let data = res.data;
            data.reverse();

            this.galleryModuleData = data.map((module) => {
              return {
                name: module.name,
                size: module.size,
                type: module.type,
                path: module.path,
                dimensions: module.dimensions,
                imageId: module.imageId,
                tooltipText: module.name,
                created: module.created,
              };
            });
          } else {
            this.galleryModuleData = [];
          }
            this.galleryPending = false;
        });
  }

  isImageDisabled(image: any): boolean {
    if (this._reqMaxSize !== 0 && this._reqDimen !== '') {
      return (
        image.size > this._reqMaxSize ||
        image.dimensions !== this._reqDimen
      );
    } else {
      return false;
    }
  }

  isImageChecked(image: any): boolean {
    if (this.galleryModuleData.length) {
      return this.selectedImageId === image.imageId;
    } else {
      return false;
    }
  }

  select(): void {
    this.dialogRef.close({
      url: this.selectedImageUrl,
      imageId: this.selectedImageId,
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  selectImage(image: any): void {
    if (!this.isImageDisabled(image)) {
      this.selectedImageUrl = this.selectedImageUrl === image.path ? '' : image.path;
      this.selectedImageId = this.selectedImageId === image.imageId ? '' : image.imageId;
    }
  }

  openDeleteActionDialog(element) {
    this.androidService
      .getImageGalleryUsageInImageCollections(element.imageId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        let deleteAction = {
          message: `${PROCEED_MESSAGE}DELETE "${element.name}"?`,
          action: 'androidDelete',
        };
        if (res.data) {
          deleteAction['warningMessage'] = "Warning: you will delete an image used in a bundle";
        }
        this.openActionDialog('DELETE', element, deleteAction);
      });
  }

  openActionDialog(type, element, actionObj?) {
    let action = {};
    if (actionObj) {
      action = actionObj;
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
              case 'UPLOAD':
                this.uploadImage();
              case 'DELETE':
                this.deleteImage(element.imageId);
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
          const currentStore = this.androidService.getStore();
          const currentProduct = this.androidService.getProduct();
          this.getGalleryDefaultData(currentStore, currentProduct);
        }
      });
  }

  uploadImage(): void {
    try {
      const galleryNames: string[] = this.galleryModuleData.map((image) => image.name);
      const dialogRef = this.dialog.open(DialogComponent, {
        data: { 
          action: 'androidUploadImage',
          errors: [], galleryNames,
          multiple: true,
        },
        closeOnNavigation: true,
        width: '500px',
      });
      dialogRef
        .afterClosed()
        .subscribe((res) => {
          if (res) {
            this.saveImageGallery(res);
          }
        });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async saveImageGallery(images: any[]) {
    try {
      this.loaderService.show();
      const currentStore = this.androidService.store.getValue();
      const currentProduct = this.androidService.product.getValue();
      const createdBy = !!localStorage.getItem('username') ? localStorage.getItem('username') : null;
      this.androidService
        .saveImageGallery(currentStore.code, currentProduct.code, { images, createdBy })
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.openResponseDialog(res);
        },
        (err) => {
          this.openErrorDialog(err);
        });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  deleteImage(imageId: number): void {
    try {
      this.loaderService.show();
      this.androidService
        .deleteImageGallery(imageId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.openResponseDialog(res);
          this.androidImageService.setImage({ imageId });
        },
          (err) => {
            this.openErrorDialog(err);
          });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  toggleSort(sortName: string): void {
    this.activeSort = sortName;
    this.sortGallery(sortName);
  }

  sortGallery(sortName: string): void {
    switch (sortName) {
      case 'asc':
        this.galleryModuleData = this.galleryModuleData.sort((a, b) => a.created < b.created ? -1 : 1);
        break;
      case 'desc':
        this.galleryModuleData = this.galleryModuleData.sort((a, b) => a.created < b.created ? 1 : -1);
        break;
      case 'a-z':
        this.galleryModuleData = this.galleryModuleData.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
        break;
      case 'z-a':
        this.galleryModuleData = this.galleryModuleData.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? 1 : -1);
        break;
    }
  }

  openImageInTab(url: string): void {
    window.open(url, '_blank');
  }

  navigateBack(): void {
    this.router.navigate(['android/images']);
  }

  ngOnDestroy() {
    this.gallerySubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
