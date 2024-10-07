import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { RokuService } from '../../../../service/roku.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseComponent } from '../../../base/base.component';
import { Router } from '@angular/router';
import { LoaderService } from '../../../../service/loader.service';
import { identityCheckValidator } from '../../../../validators/identity-check-validator';
import { HttpClient } from '@angular/common/http';
import { SnackbarService } from '../../../../service/snackbar.service';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

@Component({
  selector: 'app-region-modal',
  templateUrl: './region-modal.component.html',
  styleUrls: ['./region-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RokuRegionModalComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public allRegions: any[] = [];
  public nameFocused = false;
  public codeFocused = false;
  public formGroup: FormGroup;
  public isFormVisible: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<RokuRegionModalComponent>,
    public router: Router,
    public http: HttpClient,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    @Inject(MAT_DIALOG_DATA) public data,
    private rokuService: RokuService,
    private formBuilder: FormBuilder,
    private snackbarService: SnackbarService,
  ) {
    super(dialog, loaderService, router);
    this.formGroup = this.formBuilder.group({});
  }

  ngOnInit(): void {
    this.loaderService.show();
    this.allRegions = this.data.allRegions;

    this.formGroup = this.formBuilder.group({
      regionName: [
        null,
        [
          Validators.required,
          Validators.maxLength(64),
          identityCheckValidator(this.allRegions, 'name'),
        ],
      ],
      regionCode: [
        null,
        [
          Validators.required,
          Validators.maxLength(2),
          identityCheckValidator(this.allRegions, 'code'),
        ],
      ],
      allLanguages: this.formBuilder.group({}),
      defaultLanguage: [null],
    });

    this.data.allLanguages.forEach((language) => {
      (this.formGroup.controls.allLanguages as FormGroup).addControl(
        language.name,
        this.formBuilder.control(this.isLanguageInRegion(language.code)),
      );
    });

    if (this.data.pageQuery === 'view') {
      this.formGroup.controls.regionName.setValue(this.data.region.name);
      this.formGroup.controls.regionCode.setValue(this.data.region.code);
      this.formGroup.controls.defaultLanguage.setValue(
        this.data.region.defaultLanguage,
      );

      this.formGroup.controls.regionName.setValidators([
        Validators.required,
        Validators.maxLength(64),
        identityCheckValidator(
          this.allRegions,
          'name',
          this.data.region.name,
          this.data.pageQuery,
        ),
      ]);
      this.formGroup.controls.regionCode.setValidators([
        Validators.required,
        Validators.maxLength(2),
        identityCheckValidator(
          this.allRegions,
          'code',
          this.data.region.code,
          this.data.pageQuery,
        ),
      ]);
    }
    this.isFormVisible = true;
    this.loaderService.hide();
  }

  isSaveButtonDisabled(): boolean {
    return this.formGroup.pending
      ? true
      : this.formGroup.invalid ||
          !this.getSelectedLanguagesList().length ||
          this.formGroup.pristine;
  }

  getRegionNameErrorMessage(): string {
    if (this.formGroup.controls.regionName.hasError('required')) {
      return 'Please enter Region Name';
    } else if (
      this.formGroup.controls.regionName.hasError('fieldValueIsNotUnique')
    ) {
      return 'This Region Name already exists';
    } else if (this.formGroup.controls.regionName.hasError('maxlength')) {
      return 'Region name is too long';
    } else {
      return '';
    }
  }

  getRegionCodeErrorMessage(): string {
    if (this.formGroup.controls.regionCode.hasError('required')) {
      return 'Please enter Code';
    } else if (
      this.formGroup.controls.regionCode.hasError('fieldValueIsNotUnique')
    ) {
      return 'This Code already exists';
    } else if (this.formGroup.controls.regionCode.hasError('maxlength')) {
      return 'Code is too long';
    } else {
      return '';
    }
  }

  getTableData() {
    return {
      name: this.formGroup.controls.regionName.value,
      code: this.formGroup.controls.regionCode.value,
      languages: this.getSelectedLanguagesList(),
      defaultLanguage: this.formGroup.controls.defaultLanguage.value,
      createdBy: !!localStorage.getItem('username')
        ? localStorage.getItem('username')
        : null,
    };
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    try {
      this.loaderService.show();
      if (this.data.pageQuery === 'create') {
        this.rokuService
          .saveRegion(
            this.rokuService.getStore().code,
            this.rokuService.getProduct().code,
            this.getTableData(),
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            this.showResponseSnackbar(res);
            this.reloadDialogWindow();
          });
      } else if (this.data.pageQuery === 'view') {
        this.rokuService
          .updateRegion(this.data.region.regionId, this.getTableData())
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            this.showResponseSnackbar(res);
            this.reloadDialogWindow();
          });
      }
    } catch (err) {
      this.showErrorSnackbar(err);
      this.reloadDialogWindow();
    }
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

  reloadDialogWindow(): void {
    this.dialogRef.close();
    this.loaderService.hide();
  }

  isLanguageInRegion(languageCode: string): boolean {
    if (!!this.data.region) {
      const languagesArray = this.data.region.languages.split(', ');
      const languagesSet = new Set<string>(languagesArray);
      return languagesSet.has(languageCode);
    } else {
      return false;
    }
  }

  getSelectedLanguagesList(): string[] {
    const selectedLanguageFormControls = Object.entries(
      (<FormGroup>this.formGroup.get('allLanguages')).controls,
    ).filter(([languageCode, language]) => {
      return language.value;
    });
    return selectedLanguageFormControls.map((lang) => lang[0]);
  }

  showResponseSnackbar(res: any) {
    this.snackbarService.show(
      res.message,
      'OK',
      `/roku/regions-languages`,
      this.router,
      5000,
    );
  }

  showErrorSnackbar(err: any) {
    this.snackbarService.show(
      `${err.message}`,
      'ERROR',
      `/roku/regions-languages`,
      this.router,
      10000,
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
