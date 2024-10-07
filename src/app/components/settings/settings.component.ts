import {
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormBuilder,
  FormGroup,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { LoaderService } from '../../service/loader.service';
import { Subject, Subscription, combineLatest } from 'rxjs';
import {
  switchMap,
  first,
  single,
  take,
  takeUntil,
  filter,
} from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { BaseComponent } from '../base/base.component';
import { SlackService } from '../../service/slack.service';
import { PROCEED_MESSAGE } from '../../constants';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { ModuleStatus, AndroidPlatform } from '../../types/androidEnum';
import { SettingsTabEnum } from '../../types/enum';

interface DialogAction {
  message?: string;
  footNote?: string;
  action?: string;
}

@Component({
  selector: 'settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SettingsComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public selectedIndex: number = 0;
  public settings: FormGroup;

  private dialogResponseSubscription: Subscription;
  private routerSubscription: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    public router: Router,
    public route: ActivatedRoute,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public slackService: SlackService,
    private formBuilder: FormBuilder,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.setSettingsFormGroup();
    this.loaderService.show();
    this.routerSubscription = this.route.paramMap.subscribe(
      (params: ParamMap) => {
        switch (params.get('tab')) {
          case SettingsTabEnum.SLACK:
            this.selectedIndex = 0;
            break;
          default:
            this.selectedIndex = 1;
            break;
        }
      },
    );
  }

  setSettingsFormGroup(data?: any) {
    this.settings = this.formBuilder.group({
      slack: this.formBuilder.array([]),
    });
  }

  isUpdateButtonDisabled(): boolean {
    return !this.settings.dirty;
  }

  async updateSettingsConfig() {
    try {
      const action = {
        message: `${PROCEED_MESSAGE}UPDATE settings config?`,
        action: 'prompt',
      };
      this.openActionDialog(action).subscribe(() => {
        this.loaderService.show();
        this.updateSlackConfig(this.getSlackConfigPayload());
      });
    } catch (err) {
      this.openErrorDialog(err);
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

  openResponseDialog(response): void {
    super
      .openResponse(response)
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        location.reload();
      });
  }

  async updateSlackConfig(slackBody: any) {
    this.slackService
      .updateSlackConfig(slackBody)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        async (res) => {
          this.openResponseDialog(res);
        },
        (error) => {
          this.openErrorDialog(error);
        },
      );
  }

  getSlackConfigPayload(): any[] {
    this.settings.markAllAsTouched();
    return this.settings.value.slack.map((slackBot) => {
      const channelsId = slackBot.data.channels.map((channel) => channel.id)
      return {
        name: slackBot.name,
        id: slackBot.id,
        enabled: slackBot.enabled,
        data: {
          channelsId,
          mentionsId: slackBot.data.mentionsSelector,
        }
      };
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
