import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ControlContainer,
} from '@angular/forms';
import { LoaderService } from '../../../service/loader.service';
import { Subject, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BaseComponent } from '../../base/base.component';
import { SlackService } from '../../../service/slack.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'slack-notifications-settings',
  templateUrl: './slack-notifications-settings.component.html',
  styleUrls: ['./slack-notifications-settings.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SlackNotificationsSettingsComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  public settings: FormGroup;
  public usersListInfoObj: any = null;

  private dialogResponseSubscription: Subscription;
  private slackConfigSubscription: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    public router: Router,
    public dialog: MatDialog,
    public loaderService: LoaderService,
    public slackService: SlackService,
    private formBuilder: FormBuilder,
    private controlContainer: ControlContainer,
  ) {
    super(dialog, loaderService, router);
  }

  ngOnInit(): void {
    this.settings = <FormGroup>this.controlContainer.control;
    this.getSlackConfig();
  }

  setSlackFormGroup(data: any[]): void {
    if (!!data.length) {
      data.forEach((slackBot, i) => {
        let channels: FormArray = this.formBuilder.array([]);
        slackBot.data.channels.forEach((channel) => {
          channels.push(
            this.formBuilder.group({
              name: this.formBuilder.control(channel.name),
              id: this.formBuilder.control(channel.id),
              valid: this.formBuilder.control(channel.valid),
            }),
          );
        });
        (this.settings.get('slack') as FormArray).push(
          this.formBuilder.group({
            id: this.formBuilder.control(slackBot.id),
            name: this.formBuilder.control(slackBot.name),
            enabled: this.formBuilder.control(slackBot.enabled),
            data: this.formBuilder.group({
              mentions: this.formBuilder.control(
                slackBot.data.mentions.join(', '),
              ),
              channels,
              mentionsSelector: this.formBuilder.control(
                slackBot.data.mentions,
              ),
            }),
            type: this.formBuilder.control(slackBot.type),
          }),
        );
        this.usersListInfoObj = {
          ...this.usersListInfoObj,
          [i]: slackBot.data.usersListInfo,
        };
      });
    }
  }

  getSlackConfig(): void {
    this.loaderService.show('Getting Slack configuration...');
    this.slackConfigSubscription = this.slackService
      .getAllSlackConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (res.data) {
          this.setSlackFormGroup(res.data);
        }
        this.loaderService.hide();
      });
  }

  getSlackBotFormControlName(index: number): string {
    return `${index}-slackBot`;
  }

  getSlackFormArray(): FormArray {
    return this.settings.get('slack') as FormArray;
  }

  ngOnDestroy(): void {
    this.slackConfigSubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
