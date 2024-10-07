import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AndroidManagementService } from './androidManagement.service';

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  constructor(
    private _snackBar: MatSnackBar,
    private androidManagamentService: AndroidManagementService,
  ) {}

  show(
    message: string,
    action?: string,
    actionReloadPageName?: string,
    router?: any,
    duration?: number,
  ) {
    let snackBarRef = this._snackBar.open(message, action || 'OK', {
      duration: !!duration?.toString() ? duration : 20000,
    });
    snackBarRef.onAction().subscribe(() => {
      if (!!actionReloadPageName && !!router) {
        if (router.url === actionReloadPageName) {
          this.androidManagamentService.refreshTablePageNavigation(router);
        } else {
          router.navigate([actionReloadPageName]);
        }
      }
    });
  }
}
