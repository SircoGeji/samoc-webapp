import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../../service/authentication.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseComponent } from '../../components/base/base.component';
import { LoaderService } from 'src/app/service/loader.service';

import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { OpenErrorDialogOptions } from '../../types/OpenErrorDialogOptions';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class LoginPageComponent
  extends BaseComponent
  implements OnInit, OnDestroy {
  loginForm: FormGroup;
  loading = false;
  returnUrl = '';
  routeSubscription: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private authenticationService: AuthenticationService,
    public router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    public loaderService: LoaderService,
  ) {
    super(dialog, loaderService, router);
  }

  get username() {
    return this.loginForm.controls.username;
  }

  get password() {
    return this.loginForm.controls.password;
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
    this.routeSubscription = this.route.queryParams.subscribe((param) => {
      this.returnUrl = param['returnUrl'] || '/';
    });
  }

  async login() {
    if (this.loginForm.invalid) {
      return;
    }
    this.loading = true;
    try {
      const response = await this.authenticationService
        .login(this.username.value, this.password.value)
        .toPromise();
      if (response.success) {
        this.authenticationService.saveToLocalStorage(
          response.data.user.sub,
          response.data.user.email,
          response.data.token,
        );
        await this.router.navigateByUrl(this.returnUrl);
      } else {
        this.openErrorDialog(response.message, {
          reload: false,
        } as OpenErrorDialogOptions);
      }
    } catch (err) {
      this.openErrorDialog(err, {
        reload: false,
      } as OpenErrorDialogOptions);
    }
  }

  ngOnDestroy() {
    this.routeSubscription.unsubscribe();
  }
}
