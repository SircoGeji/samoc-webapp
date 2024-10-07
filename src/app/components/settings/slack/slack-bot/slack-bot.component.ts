import {
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  Input,
} from '@angular/core';
import { FormBuilder, FormGroup, ControlContainer } from '@angular/forms';
import { LoaderService } from '../../../../service/loader.service';
import { Subject, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BaseComponent } from '../../../base/base.component';
import { SlackService } from '../../../../service/slack.service';
import { SlackTriggerTypes } from '../../../../types/enum';

@Component({
  selector: 'slack-bot',
  templateUrl: './slack-bot.component.html',
  styleUrls: ['./slack-bot.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SlackBotComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  @Input() usersListInfo: any;
  public slackBot: FormGroup = new FormGroup({});
  public allUsersListInfo: any[] = [];

  private dialogResponseSubscription: Subscription;
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
    this.slackBot = <FormGroup>this.controlContainer.control;
    this.combineUsersInOneList();
  }

  combineUsersInOneList(): void {
    const availableUsersIdSet = new Set<string>(
      (Object.values(this.usersListInfo) as any[])[0].map((user) => user.id),
    );
    for (let [channelId, usersArr] of Object.entries(this.usersListInfo)) {
      (usersArr as any[]).forEach((user) => {
        if (!!this.allUsersListInfo.length) {
          const foundUser = this.allUsersListInfo.find(
            (foundUser) => foundUser.id === user.id,
          );
          if (!foundUser) {
            this.allUsersListInfo.push({
              ...user,
              disabled: !availableUsersIdSet.has(user.id),
            });
          }
        } else {
          this.allUsersListInfo.push({
            ...user,
            disabled: !availableUsersIdSet.has(user.id),
          });
        }
      });
    }
  }

  getTriggerDescription(type: string): string {
    switch(type) {
      case SlackTriggerTypes.FILTERS:
        return '"RETENTION OFFER FILTERS" page configuration pushed to PROD';
      case SlackTriggerTypes.EXPIRE:
        return 'any offer expired';
      case SlackTriggerTypes.DIT:
        return 'data integrity test fails';
      default:
        return 'UNKNOWN';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
