import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import {RokuService} from '../service/roku.service';
import {Observable} from 'rxjs';
import {BaseComponent} from '../components/base/base.component';
import {LoaderService} from '../service/loader.service';
import {MatDialog} from '@angular/material/dialog';
import {map} from 'rxjs/operators';
import {ModuleStatus} from '../types/androidEnum';

@Injectable({ providedIn: 'root' })
export class RokuEndedModuleGuard extends BaseComponent implements CanActivate {
  constructor(
    public loaderService: LoaderService,
    public router: Router,
    public dialog: MatDialog,
    private rokuService: RokuService,
  ) {
    super(dialog, loaderService, router);
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean | Observable<boolean> {
    const pageQuery = route.params.action ?? 'create';
    const moduleID = route.params.id;
    const isHistory = route.queryParams.isHistory;
    const moduleType = route.data.moduleType;

    if (isHistory) {
      return true;
    }

    if (pageQuery !== 'view') {
      return true;
    } else {
      return this.rokuService.getModule(moduleType, moduleID).pipe(
        map((res) => {
          if (res.data.status === ModuleStatus.ENDED) {
            super.openResponse({message: `The module is Ended`});
            return false;
          } else {
            return true;
          }
        })
      );
    }
  }
}
