import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AndroidService } from '../../../../service/android.service';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { LoaderService } from '../../../../service/loader.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BaseComponent } from '../../../base/base.component';
import { PROCEED_MESSAGE } from '../../../../constants';
import { AndroidGalleryFormComponent } from '../gallery-form/gallery-form.component';
import { AndroidFormsService } from '../../../../service/android-forms.service';
import { ModuleStatus } from '../../../../types/androidEnum';
import { DialogComponent } from '../../../dialog/dialog.component';
import { AndroidImageService } from '../../../../service/android-image.service';
import { AndroidManagementService } from '../../../../service/androidManagement.service';
import { SnackbarService } from '../../../../service/snackbar.service';
import { identityCheckValidator } from '../../../../validators/identity-check-validator';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

interface imageObjInterface {
  platform?: string;
  region?: string;
  url?: string;
  type?: string;
}

@Component({
  selector: 'bundle-form',
  templateUrl: './bundle-form.component.html',
  styleUrls: ['./bundle-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AndroidBundleFormComponent
  extends BaseComponent
  implements OnInit {
  public bundleName: FormControl;
  public imagePlacements: any[] = [];
  public regions: any[] = [];
  public pageQuery = 'create';
  public imageURL;
  public status = {
    DEFAULT: 'default',
    INCOMPLETE: 'incomplete',
    DUPLICATE: 'duplicate',
    UNSAVED: 'unsaved',
    SAVED: 'saved',
    PUBLISHED: 'published',
  };
  public images: any[] = [];
  public fetchedModule: any;
  public defaultImageCollection;
  public checkBundleName: boolean = false;
  public fetchedRegions: any[] = [];
  public fetchedImages: any[] = [];
  public galleryModuleData: any[] = [];
  public formGroup: FormGroup;
  public isFormVisible: boolean = false;

  private dialogResponseSubscription: Subscription;
  private destroy$ = new Subject<void>();
  private moduleId: number;
  private liveImageCollection;
  private fetchedName: string = '';
  private subject = new Subject<boolean>();
  private ignoreDialog: boolean = false;
  private gallerySubscription: Subscription;
  private imageSubscription: Subscription;
  private currentStore: any;
  private currentProduct: any;
  private allBundles: any;

  constructor(
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public router: Router,
    private formBuilder: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private androidService: AndroidService,
    private androidFormsService: AndroidFormsService,
    private androidImageService: AndroidImageService,
    private androidManagementService: AndroidManagementService,
    private snackbarService: SnackbarService,
  ) {
    super(dialog, loaderService, router);
    this.formGroup = this.formBuilder.group({});
  }

  ngOnInit(): void {
    this.loaderService.show();
    this.currentStore = this.androidService.getStore();
    this.currentProduct = this.androidService.getProduct();
    
    this.androidService
      .getAllImageCollections()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (!!res.data && !!res.data.length) {
          this.allBundles = res.data.filter((el) => {
            return (
              el.productId === this.currentProduct.productId &&
              el.storeId === this.currentStore.storeId
            );
          });
        }

        this.formGroup = this.formBuilder.group({
          bundleName: [
            null,
            [
              Validators.required,
              identityCheckValidator(this.allBundles, 'name'),
            ],
          ],
        });

        this.androidImageService.image
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (res.imageId !== null) {
              this.clearFetchedImagePlacements(res.imageId);
            }
          });
        this.setRegions();
      });
  }

  clearFetchedImagePlacements(imageId: number): void {
    this.images.forEach((imagePlacement) => {
      if (imagePlacement.imageId === imageId) {
        imagePlacement.url = null;
        imagePlacement.imageId = null;
      }
    });
  }

  setRegions() {
    this.androidService
      .getAllRegions()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        if (res.data && res.data.length) {
          const tableRegions = res.data.filter(
            (elem) =>
              elem.storeId === this.currentStore.storeId &&
              elem.productId === this.currentProduct.productId,
          );

          this.regions = Object.values(tableRegions).map((region: any) => {
            return {
              code: region.code,
              checked: false,
              name: region.name,
            };
          });

          this.pageQuery =
            this.activatedRoute.snapshot.paramMap['params']['action'] ??
            'create';
          this.moduleId =
            Number(this.activatedRoute.snapshot.paramMap['params']['id']) ??
            null;

          this.getImagePlacements();
        }
      });
  }

  getImagePlacements() {
    this.androidService
      .getStoreImagePlacement(this.currentStore.code)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.imagePlacements = res.data;

        this.images = this.imagePlacements.map((elem) => {
          const placementTooltip = `${elem.reqDimen} | ${elem.reqMaxSize}`;
          return {
            name: elem.name,
            url: null,
            imageId: null,
            reqMaxSize: elem.reqMaxSize,
            reqType: elem.reqType,
            reqDimen: elem.reqDimen,
            required: elem.required,
            placementTooltip,
          };
        });

        if (this.moduleId) {
          const foundModule = this.allBundles.find(
            (module) => module.imageCollectionId === this.moduleId,
          );
          if (!!foundModule) {
            this.fetchedModule = foundModule;
            this.formGroup.controls.bundleName.setValidators([
              identityCheckValidator(
                this.allBundles,
                'name',
                foundModule.name,
                this.pageQuery,
              ),
            ]);
            this.fillModuleData(this.fetchedModule, true);
          }
        } else {
          this.formGroup.controls.bundleName.markAsTouched();
        }
        this.loaderService.hide();
        this.isFormVisible = true;
      });
  }

  fillModuleData(data, hideLoader: boolean): void {
    this.formGroup.controls.bundleName.setValue(
      this.pageQuery === 'view' ? data.name : data.name + ' Copy',
    );
    if (this.pageQuery !== 'view') {
      this.formGroup.controls.bundleName.markAsTouched();
    }
    this.checkBundleName = true;

    this.fetchedName = data.name;

    if (data.countries && data.countries.length) {
      this.fetchedRegions = data.countries;
      data.countries.forEach((regionCode) => {
        const regionIndex = this.regions.findIndex(
          (region) => region.code === regionCode,
        );
        this.regions[regionIndex].checked = true;
      });
    }

    const imagesKeys = Object.keys(data.images);
    if (imagesKeys && imagesKeys.length) {
      this.images.forEach(() => {
        this.fetchedImages.push(null);
      });
      const imagesValues = Object.values(data.images);
      imagesValues.forEach((image: any, i) => {
        const indexOfPlacement: number = this.images.findIndex(
          (elem) => elem.name === imagesKeys[i],
        );
        this.images[indexOfPlacement].url = image.path;
        this.images[indexOfPlacement].imageId = image.imageId;
        this.fetchedImages[indexOfPlacement] = image.imageId;
      });
    }

    this.getGalleryDefaultData(hideLoader);
  }

  getGalleryDefaultData(hideLoader: boolean): void {
    const currentStore = this.androidService.getStore();
    const currentProduct = this.androidService.getProduct();
    this.gallerySubscription = this.androidService
      .getAllImageGallery(currentStore.code, currentProduct.code)
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
              imageId: module.imageId,
              tooltipText: module.name,
              created: module.created,
            };
          });
        } else {
          this.galleryModuleData = [];
        }
        if (hideLoader) {
          this.loaderService.hide();
        }
      });
  }

  changeRegionCheckbox(index: number): void {
    this.regions[index].checked = !this.regions[index].checked;
  }

  isAnyRegionChecked(): boolean {
    return this.regions.some((region) => region.checked);
  }

  areRegionsChanged(): boolean {
    if (this.isAnyRegionChecked()) {
      const currentRegions = this.regions.filter((region) => region.checked);
      const currentRegionsCodes = currentRegions.map((region) => region.code);
      const currentRegionsCodesSet = new Set<string>(currentRegionsCodes);
      if (this.fetchedRegions.length) {
        const fetchedRegionsCodesSet = new Set<string>(this.fetchedRegions);
        this.fetchedRegions.forEach((regionCode) => {
          if (currentRegionsCodesSet.has(regionCode)) {
            fetchedRegionsCodesSet.delete(regionCode);
            currentRegionsCodesSet.delete(regionCode);
          } else {
            return true;
          }
        });
        return (
          currentRegionsCodesSet.size !== 0 || fetchedRegionsCodesSet.size !== 0
        );
      } else {
        return true;
      }
    } else {
      return false;
    }
  }

  areImagesChanged(): boolean {
    if (this.isAnyImageSelected()) {
      const currentImagesIndexes = this.images.map(
        (image) => image.imageId ?? image.imageId,
      );
      if (this.fetchedImages.length) {
        let allImageIndexesAreEqual = new Set<boolean>();
        this.fetchedImages.forEach((imageId, i) => {
          if (imageId !== currentImagesIndexes[i]) {
            allImageIndexesAreEqual.add(false);
          }
        });
        return allImageIndexesAreEqual.has(false);
      } else {
        return true;
      }
    } else {
      return false;
    }
  }

  isBundleNameChanged(): boolean {
    if (
      !!this.formGroup.controls.bundleName.value &&
      !this.formGroup.controls.bundleName.pending &&
      this.formGroup.controls.bundleName.valid &&
      this.checkBundleName
    ) {
      return this.fetchedName !== this.formGroup.controls.bundleName.value;
    } else {
      return false;
    }
  }

  isSaveButtonDisabled(): boolean {
    return (
      !this.isAnyRegionChecked() ||
      !this.formGroup.controls.bundleName?.value ||
      this.formGroup.controls.bundleName?.pending ||
      (this.formGroup.controls.bundleName?.invalid &&
        !!this.formGroup.controls.bundleName?.errors?.fieldValueIsNotUnique &&
        this.formGroup.controls.bundleName?.value !== this.fetchedName) ||
      (!this.areRegionsChanged() &&
        !this.isBundleNameChanged() &&
        !this.areImagesChanged())
    );
  }

  isPublishButtonDisabled(): boolean {
    return (
      !this.checkBundleName ||
      this.formGroup.controls.bundleName.pending ||
      this.formGroup.controls.bundleName.invalid ||
      !this.isSaveButtonDisabled() ||
      !this.isAnyRegionChecked() ||
      !this.isEveryRequiredImageHasImageId() ||
      this.fetchedModule.status !== ModuleStatus.READY
    );
  }

  canShowPublishButton(): boolean {
    return (
      this.fetchedModule &&
      !(
        this.fetchedModule.status === ModuleStatus.LIVE &&
        this.pageQuery === 'view'
      )
    );
  }

  isEveryRequiredImageHasImageId(): boolean {
    let notNullSet = new Set<boolean>();
    this.images.forEach((image) => {
      if (image.required && !image.imageId) {
        notNullSet.add(false);
      }
    });
    return !notNullSet.has(false);
  }

  isAnyImageSelected(): boolean {
    let notNullSet = new Set<boolean>();
    this.images.forEach((image) => {
      if (image.imageId) {
        notNullSet.add(true);
      }
    });
    return notNullSet.has(true);
  }

  getModuleFormData() {
    const moduleData: any = {
      name: this.formGroup.controls.bundleName.value,
      createdBy: null,
      countries: [],
      images: {},
    };
    if (!!localStorage.getItem('username')) {
      moduleData.createdBy = localStorage.getItem('username');
    }
    const countries = this.regions.filter((region) => region.checked);
    if (countries.length) {
      moduleData.countries = countries.map((elem) => elem.code);
    }
    const images = this.getImagesData();
    if (Object.keys(images).length) {
      moduleData.images = images;
    }
    this.formGroup.controls.bundleName.markAsPristine();
    return moduleData;
  }

  getImagesData() {
    let countriesData = {};
    this.images.forEach((image) => {
      if (image.imageId) {
        countriesData = { ...countriesData, [image.name]: image.imageId };
      }
    });
    return countriesData;
  }

  save(): void {
    try {
      let action;
      if (
        this.pageQuery === 'view' &&
        this.fetchedModule['deployedTo']?.includes('prod')
      ) {
        action = {
          message:
            'This is Live BUNDLE, it is deployed on prod, thus you need to enter the password to update it, ' +
            'after update it will be published automatically. ' +
            `${PROCEED_MESSAGE}UPDATE ALL?`,
          action: 'update',
          env: 'prod',
        };
      } else if (this.pageQuery === 'view') {
        action = {
          message:
            `${
              this.fetchedModule.status === ModuleStatus.LIVE
                ? 'This is Live BUNDLE, after update it will be published automatically. '
                : ''
            }` + `${PROCEED_MESSAGE} UPDATE ALL?`,
          action: 'prompt',
        };
      } else {
        action = {
          message: `${PROCEED_MESSAGE} SAVE ALL?`,
          action: 'prompt',
        };
      }

      this.openActionDialog(action).subscribe(() => {
        this.loaderService.show();
        this.saveModule();
      });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async saveModule() {
    const currentStore = this.androidService.getStore();
    const currentProduct = this.androidService.getProduct();
    if (this.pageQuery === 'create' || this.pageQuery === 'duplicate') {
      this.androidService
        .saveImageCollection(
          currentStore.code,
          currentProduct.code,
          this.getModuleFormData(),
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (res) => {
          this.formGroup.controls.bundleName.markAsUntouched();
          this.pageQuery = 'view';

          this.clearFormData();
          this.moduleId = Number(res.data.imageCollectionId);
          this.fetchedModule = await this.getModuleById(
            res.data.imageCollectionId,
          );
          this.formGroup.controls.bundleName.setValidators([
            identityCheckValidator(
              this.allBundles,
              'name',
              this.fetchedModule.name,
              this.pageQuery,
            ),
          ]);
          this.fillModuleData(this.fetchedModule, true);

          if (JSON.parse(localStorage.getItem('campaign') as string)) {
            this.router.navigate(['android/campaigns/create']);
          } else {
            this.openResponseDialog(res);
          }
        });
    } else if (this.pageQuery === 'view') {
      this.androidService
        .updateImageCollection(this.moduleId, this.getModuleFormData())
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          async (res) => {
            this.clearFormData();
            this.fetchedModule = await this.getModuleById();
            this.formGroup.controls.bundleName.setValidators([
              identityCheckValidator(
                this.allBundles,
                'name',
                this.fetchedModule.name,
                this.pageQuery,
              ),
            ]);
            this.fillModuleData(this.fetchedModule, false);

            if (this.fetchedModule.status === ModuleStatus.LIVE) {
              this.publishAfterUpdate(res);
            } else {
              this.androidFormsService.navigateBackOrOpenDialog(
                this.openResponseDialog,
                res,
                this,
              );
            }
          },
          (error) => {
            this.openErrorDialog(error);
          },
        );
    }
  }

  publishAfterUpdate(res) {
    this.loaderService.show();

    this.androidFormsService
      .getPublishRequests(
        this.fetchedModule,
        this.moduleId,
        this.androidService.publishImageCollection,
      )
      .subscribe(() => {
        this.androidFormsService.navigateBackOrOpenDialog(
          this.openResponseDialog,
          res,
          this,
        );
      });
  }

  clearFormData(): void {
    this.fetchedModule = {};
    this.fetchedName = '';
    this.fetchedImages = [];
    this.fetchedRegions = [];
  }

  async getModuleById(id?: number): Promise<any> {
    const module = await this.androidService
      .getImageCollection(id ? id : this.moduleId)
      .toPromise();
    return module.data;
  }

  publish(): void {
    try {
      const action = {
        message: PROCEED_MESSAGE + 'PUBLISH?',
        action: 'androidPublish',
        module: 'image-collection',
        id: this.moduleId,
      };
      const dialogActionRef = super.openAction(action);
      if (dialogActionRef) {
        this.dialogResponseSubscription = dialogActionRef
          .afterClosed()
          .subscribe((result) => {
            if (result) {
              this.publishModule(this.moduleId, result);
            }
          });
      }
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
    this.router.navigate(['android/images']);
  }

  openActionDialog(action: DialogAction) {
    const dialogActionRef = super.openAction(action);
    if (dialogActionRef) {
      return dialogActionRef.afterClosed().pipe(
        filter((res) => Boolean(res)),
        takeUntil(this.destroy$),
      );
    }
  }

  openResponseDialog(response, actionName?): void {
    super
      .openResponse(response)
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (actionName === 'publish' && response.success) {
          this.router.navigate(['android/images']);
        }
      });
  }

  selectImage(imageIndex: number, placement: any) {
    const dialogRef = this.dialog.open(AndroidGalleryFormComponent, {
      width: '80vw',
      height: '85vh',
      panelClass: 'dialog-container-gallery',
      data: {
        isInDialog: true,
        reqDimen: placement.reqDimen,
        reqMaxSize: placement.reqMaxSize,
      },
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.images[imageIndex].url = result.url;
        this.images[imageIndex].imageId = result.imageId;
      }
    });
  }

  getImageCollectionNameErrorMessage() {
    if (this.formGroup.controls.bundleName.hasError('required')) {
      return 'Please enter Bundle Name';
    } else if (this.formGroup.controls.bundleName.hasError('fieldValueIsNotUnique')) {
      return 'This Bundle Name already exists';
    }
  }

  uploadImage(imageIndex: number, placement: any): void {
    try {
      const galleryNames: string[] = this.galleryModuleData.map(
        (image) => image.name,
      );
      const dialogRef = this.dialog.open(DialogComponent, {
        data: {
          action: 'androidUploadImage',
          errors: [],
          galleryNames,
          multiple: false,
          dimensions: placement.reqDimen,
          maxSize: placement.reqMaxSize,
        },
        closeOnNavigation: true,
        width: '500px',
      });
      dialogRef.afterClosed().subscribe((res) => {
        if (res) {
          this.saveImageGallery(res, imageIndex);
        }
      });
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  async saveImageGallery(images, imageIndex: number) {
    try {
      this.loaderService.show();
      const currentStore = this.androidService.store.getValue();
      const currentProduct = this.androidService.product.getValue();
      this.androidService
        .saveImageGallery(currentStore.code, currentProduct.code, { images })
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (res) => {
            if (res) {
              this.openResponseDialog(res);
              this.images[imageIndex].url = images[0].path;
              this.images[imageIndex].imageId = res.data[0];
            }
          },
          (err) => {
            this.openErrorDialog(err);
          },
        );
    } catch (err) {
      this.openErrorDialog(err);
    }
  }

  canNotNavigateBack(): boolean {
    if (this.ignoreDialog) {
      return false;
    } else {
      return !this.isSaveButtonDisabled();
    }
  }

  navigateBack(): void {
    if (!this.isSaveButtonDisabled()) {
      const action: DialogAction = {
        message:
          'There are unsaved changes that will be lost. Do you wish to save changes?' +
          `${
            this.fetchedModule &&
            this.fetchedModule.status === ModuleStatus.LIVE &&
            this.pageQuery === 'view'
              ? ' This is Live IMAGE COLLECTION, after save it will be published automatically. '
              : ''
          }`,
        action: 'androidSave',
      };
      this.openActionDialog(action).subscribe((res) => {
        switch (res) {
          case 'save':
            this.subject.next(false);
            this.androidFormsService.setProperHistory('images', this.router);
            this.save();
            break;
          case 'leave':
            this.ignoreDialog = true;
            this.subject.next(true);
            this.androidFormsService.navigateBack('images');
            break;
          case 'cancel':
            this.subject.next(false);
            this.androidFormsService.setProperHistory('images', this.router);
            break;
        }
      });
    } else {
      this.androidFormsService.navigateBack('images');
    }
  }
}
