import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { interval, Subscription } from 'rxjs';
import * as moment from 'moment-timezone';
import { environment } from '../../../environments/environment';
import {
  MILLISECONDS_IN_A_SECOND,
  MINUTES_IN_A_NHOUR,
  SECONDS_IN_A_MINUTE,
} from '../../constants';

@Component({
  selector: 'app-count-down',
  templateUrl: './countdown-timer.component.html',
  styleUrls: ['./countdown-timer.component.scss'],
})
export class CountDownComponent implements OnInit, OnDestroy {
  @Output()
  countdownCompleted: EventEmitter<string> = new EventEmitter<string>();
  @Input() lastModifiedAt: string;

  private subscription: Subscription;

  timeDiff: number;
  secondsLeft: number;
  minutesLeft: number;
  shouldHide: boolean;

  getTimeDifference(lastModifiedAtStr: string, delayInSeconds?: number) {
    if (delayInSeconds && delayInSeconds > 0) {
      const lastModifiedAt = moment(lastModifiedAtStr).add(
        delayInSeconds,
        'seconds',
      );
      const now = moment();

      if (lastModifiedAt.isValid()) {
        this.shouldHide = false;
        this.timeDiff = lastModifiedAt.valueOf() - now.valueOf();
        this.allocateTimeUnits(this.timeDiff);
        if (this.timeDiff <= 0) {
          this.shouldHide = true;
          this.countdownCompleted.emit('countdown-completed');
        }
      }
    } else {
      this.countdownCompleted.emit('countdown-completed');
      this.shouldHide = true;
      this.timeDiff = 0;
    }

    return { shouldHide: this.shouldHide, timeDiff: this.timeDiff };
  }

  allocateTimeUnits(timeDifference) {
    this.secondsLeft = Math.floor(
      (timeDifference / MILLISECONDS_IN_A_SECOND) % SECONDS_IN_A_MINUTE,
    );
    this.minutesLeft = Math.floor(
      (timeDifference / (MILLISECONDS_IN_A_SECOND * MINUTES_IN_A_NHOUR)) %
        SECONDS_IN_A_MINUTE,
    );
    return { secondsLeft: this.secondsLeft, minutesLeft: this.minutesLeft };
  }

  ngOnInit() {
    this.shouldHide = true;
    this.subscription = interval(1000).subscribe((x) => {
      this.getTimeDifference(this.lastModifiedAt, environment.validationTimer);
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
