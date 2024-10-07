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
import { BaseComponent } from '../../../base/base.component';
import { Router } from '@angular/router';
import { LoaderService } from '../../../../service/loader.service';
import { HttpClient } from '@angular/common/http';
import { identityCheckValidator } from '../../../../validators/identity-check-validator';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SnackbarService } from '../../../../service/snackbar.service';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

@Component({
  selector: 'app-language-modal',
  templateUrl: './language-modal.component.html',
  styleUrls: ['./language-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RokuLanguageModalComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public allLanguages: any[] = [];
  public isFormVisible: boolean = false;
  public formGroup: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    public dialogRef: MatDialogRef<RokuLanguageModalComponent>,
    private rokuService: RokuService,
    public router: Router,
    public http: HttpClient,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    @Inject(MAT_DIALOG_DATA) public data,
    private formBuilder: FormBuilder,
    private snackbarService: SnackbarService,
  ) {
    super(dialog, loaderService, router);
    this.formGroup = this.formBuilder.group({});
  }

  ngOnInit(): void {
    this.loaderService.show();
    this.allLanguages = this.data.allLanguages;
    this.formGroup = this.formBuilder.group({
      languageName: [
        null,
        [
          Validators.required,
          Validators.maxLength(64),
          identityCheckValidator(this.allLanguages, 'name'),
        ],
      ],
      languageCode: [
        null,
        [
          Validators.required,
          Validators.maxLength(8),
          identityCheckValidator(this.allLanguages, 'code'),
        ],
      ],
    });

    if (this.data.pageQuery === 'view') {
      this.formGroup.controls.languageName.setValue(this.data.language.name);
      this.formGroup.controls.languageCode.setValue(this.data.language.code);

      this.formGroup.controls.languageName.setValidators([
        Validators.required,
        Validators.maxLength(64),
        identityCheckValidator(
          this.allLanguages,
          'name',
          this.data.language.name,
          this.data.pageQuery,
        ),
      ]);
      this.formGroup.controls.languageCode.setValidators([
        Validators.required,
        Validators.maxLength(8),
        identityCheckValidator(
          this.allLanguages,
          'code',
          this.data.language.code,
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
      : this.formGroup.invalid || this.formGroup.pristine;
  }

  getLanguageNameErrorMessage(): string {
    if (this.formGroup.controls.languageName.hasError('required')) {
      return 'Please enter Language Name';
    } else if (
      this.formGroup.controls.languageName.hasError('fieldValueIsNotUnique')
    ) {
      return 'This Language Name already exists';
    } else if (this.formGroup.controls.languageName.hasError('maxlength')) {
      return 'Language name is too long';
    } else {
      return '';
    }
  }

  getLanguageCodeErrorMessage(): string {
    if (this.formGroup.controls.languageCode.hasError('required')) {
      return 'Please enter Code';
    } else if (
      this.formGroup.controls.languageCode.hasError('fieldValueIsNotUnique')
    ) {
      return 'This Code already exists';
    } else if (this.formGroup.controls.languageCode.hasError('maxlength')) {
      return 'Code is too long';
    } else {
      return '';
    }
  }

  getTableData() {
    return {
      name: this.formGroup.controls.languageName.value,
      code: this.formGroup.controls.languageCode.value,
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
          .saveLanguage(this.getTableData())
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            this.showResponseSnackbar(res);
            this.reloadDialogWindow();
          });
      } else if (this.data.pageQuery === 'view') {
        this.rokuService
          .updateLanguage(this.data.language.languageId, this.getTableData())
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

  reloadDialogWindow(): void {
    this.dialogRef.close();
    this.loaderService.hide();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
