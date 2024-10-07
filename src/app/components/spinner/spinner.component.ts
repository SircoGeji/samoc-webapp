import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { LoaderService } from '../../service/loader.service';
import { WebSocketService } from '../../service/web-socket.service';
import { DEFAULT_SPINNER_TEXT } from '../../constants';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
})
export class SpinnerComponent implements OnInit, OnDestroy {
  isLoading: boolean;
  loadingSubscription: Subscription;
  showText: string;

  constructor(
    private loaderService: LoaderService,
    private webSocketService: WebSocketService,
  ) {
    this.showText = DEFAULT_SPINNER_TEXT;
    this.loadingSubscription = this.loaderService.isLoading.subscribe(
      (opt: any) => {
        this.isLoading = opt.value;
        this.showText = opt.msg || DEFAULT_SPINNER_TEXT;
      },
    );
  }

  ngOnInit(): void {
    this.webSocketService
      .listen('update-spinner-text')
      .subscribe((str: any) => {
        this.ioEventHandler('update-spinner-text', str);
      });
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription !== undefined) {
      this.showText = DEFAULT_SPINNER_TEXT;
      this.loadingSubscription.unsubscribe();
    }
  }

  ioEventHandler(eventName: string, str: any): boolean {
    if (eventName === 'update-spinner-text') {
      this.showText = str;
      return true;
    }

    return false;
  }
}
