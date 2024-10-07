import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { ConfigurationService } from '../../service/configuration.service';
import { LoaderService } from '../../service/loader.service';
import { OffersService } from '../../service/offers.service';
import { PlansService } from '../../service/plans.service';
import { BaseComponent } from '../../components/base/base.component';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { elementAt, filter, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-filter-diff',
  templateUrl: './filter-diff.component.html',
  styleUrls: ['./filter-diff.component.scss'],
})
export class FilterDiffComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public showDiffBlock: boolean = false;
  public env: string = '';
  public firstVersion: string = '';
  public secondVersion: string = '';
  public firstVersionDataJSON: any = null;
  public secondVersionDataJSON: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public router: Router,
    private route: ActivatedRoute,
    private plansService: PlansService,
    private offersService: OffersService,
    private configService: ConfigurationService,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.loaderService.show('Getting GL config versions data...');
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.env = params['env'];
        this.firstVersion = params['firstVersion'];
        this.secondVersion = params['secondVersion'];
        this.offersService
          .getGLConfigVersionsData(
            this.env,
            this.firstVersion,
            this.secondVersion,
          )
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (!!res.data) {
              this.firstVersionDataJSON = res.data.firstVersion;
              this.secondVersionDataJSON = res.data.secondVersion;
            }
            this.showDiffBlock = true;
            this.loaderService.hide();
          });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
