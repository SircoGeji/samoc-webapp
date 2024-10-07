import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../dialog/dialog.component';
import { CodeType, DiscountType, OfferType, StatusEnum } from '../../types/enum';
import { LoaderService } from '../../service/loader.service';
import { Router } from '@angular/router';
import { OpenErrorDialogOptions } from '../../types/OpenErrorDialogOptions';
import { isOffline } from '../../helpers/color-utils';
import {removeXid} from '../../helpers/string-utils';

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrls: ['./base.component.scss'],
})
export class BaseComponent implements OnInit {
  constructor(
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public router: Router,
  ) {}

  ngOnInit(): void {}

  openBack() {
    return this.dialog.open(DialogComponent, {
      data: { message: 'Go back without saving?', action: 'back', errors: [] },
      closeOnNavigation: true,
      width: '280px',
      height: '134px',
    });
  }

  openErrorDialog(error, opts?: OpenErrorDialogOptions) {
    this.loaderService.hide();
    let message;
    if (error.message) {
      message = error.message;
    } else if (error.error?.message) {
      message = error.error.message;
    } else if (error.message) {
      message = error.message;
    }
    let errors = [];
    if (error.error?.errors) {
      errors = this.formatError(error.error.errors);
    }
    if (error.status === 405) {
      message = 'This action is not supported.';
    }
    if (message === undefined) {
      message = 'An error has occurred, please contact system administrator.';
    }
    if (!navigator.onLine) {
      message = 'An error has occurred, please check your network status.';
      // check network connectivity
      const el: HTMLElement = document.querySelector(
        '.header-component-container-taskbar-container-health',
      );
      if (el) {
        el.style.backgroundColor = 'red';
      }
    }
    message = removeXid(message);

    const dialogRef = this.dialog.open(DialogComponent, {
      data: { message, action: 'error', errors },
      closeOnNavigation: true,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (error.status === 404) {
        if (opts && opts.navigatingFrom === 'plans') {
          this.router.navigate(
            opts.navigateTo ? [opts.navigateTo] : ['/plans'],
          );
        } else {
          this.router.navigate(
            opts.navigateTo ? [opts.navigateTo] : ['/offers'],
          );
        }
        if (opts && opts.reload === true) {
          location.reload();
        }
      } else {
        if (opts && opts.navigateTo) {
          this.router.navigate([opts.navigateTo]);
        } else if (opts && opts.reload === false) {
        } else {
          location.reload();
        }
      }
    });
  }

  openResponse(response) {
    this.loaderService.hide();
    return this.dialog.open(DialogComponent, {
      data: { message: response.message, action: 'complete', errors: [] },
      closeOnNavigation: true,
    });
  }

  openAction(action): any {
    // check network connectivity
    if (isOffline()) {
      this.openErrorDialog(
        new Error(`An error has occurred, please check your network status.`),
        {
          reload: false,
        } as OpenErrorDialogOptions,
      );
      return null;
    }

    action.errors = [];
    return this.dialog.open(DialogComponent, {
      closeOnNavigation: true,
      data: action,
    });
  }

  formatError(errors) {
    const errorArray: string[] = [];
    for (const error of errors) {
      for (const propName in error) {
        if (error[propName]) {
          errorArray.push(error[propName]);
        }
      }
    }
    return errorArray;
  }

  formatOfferType(offerType) {
    switch (offerType) {
      case OfferType.DEFAULT:
        return 'Default Signup';
      case OfferType.ACQUISITION:
        return 'Acquisition';
      case OfferType.WINBACK:
        return 'Winback';
    }
  }

  formatOfferCodeType(codeType) {
    switch (codeType) {
      case CodeType.SINGLE_CODE:
        return 'Single';
      case CodeType.BULK_UNIQUE_CODE:
        return 'Bulk';
    }
  }

  formatOffer(offer) {
    switch (offer) {
      case DiscountType.FIXED:
        return 'Fixed Amount';
      case DiscountType.TRIAL:
        return 'Free Trial';
      case DiscountType.PERCENT:
        return 'Percentage';
    }
  }

  determineButtonText(status) {
    if (status === StatusEnum.DFT) {
      return 'DELETE';
    } else {
      return 'RETIRE';
    }
  }

  determineEmptyTable(data) {
    return data.length === 0;
  }
}
