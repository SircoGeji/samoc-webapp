import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginPageComponent } from './login-page.component';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { AuthenticationService } from '../../service/authentication.service';
import { of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let httpMock: HttpClientTestingModule;
  let authService: AuthenticationService;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [LoginPageComponent],

        imports: [
          FormsModule,
          ReactiveFormsModule,
          RouterTestingModule,
          HttpClientTestingModule,
          MatDialogModule,
          BrowserAnimationsModule,
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: MAT_DIALOG_DATA, useValue: {} },
          { provide: MatDialogRef, useValue: {} },
          {
            provide: AuthenticationService,
            useValue: {
              login: () => of({}),
            },
          },
        ],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginPageComponent);
    httpMock = TestBed.inject(HttpClientTestingModule);
    component = fixture.componentInstance;
    fixture.detectChanges();
    authService = TestBed.inject(AuthenticationService);
  });
  function create() {
    component.loginForm.controls.username.setValue('username');
    component.loginForm.controls.password.setValue('password');
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call authentication service on login', () => {
    create();
    const spy = spyOn(authService, 'login');
    component.login();
    expect(spy).toHaveBeenCalled();
  });
});
