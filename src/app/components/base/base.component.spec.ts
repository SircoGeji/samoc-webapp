import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import {
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialog,
} from '@angular/material/dialog';
import { BaseComponent } from './base.component';
import { CodeType, OfferType, StatusEnum } from '../../types/enum';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { OpenErrorDialogOptions } from 'src/app/types/OpenErrorDialogOptions';
import * as Utils from '../../helpers/color-utils';

describe('BaseComponent', () => {
  let component: BaseComponent;
  let fixture: ComponentFixture<BaseComponent>;
  let dialogSpy: jasmine.Spy;
  const dialogRefSpyObj = jasmine.createSpyObj({
    afterClosed: of({}),
    close: null,
  });
  let utils;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [BaseComponent],
        imports: [MatDialogModule, RouterTestingModule],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: Utils, useValue: { isOffline: () => true } },
          { provide: MAT_DIALOG_DATA, useValue: {} },
          { provide: MatDialogRef, useValue: {} },
        ],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(BaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    dialogSpy = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue(
      dialogRefSpyObj,
    );
    utils = Utils;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open dialog on openBack', () => {
    component.openBack();
    expect(dialogSpy).toHaveBeenCalledTimes(1);
  });

  it('should open dialog on openErrorDialog', () => {
    const err = new Error('some kind of 404 error');
    component.openErrorDialog(err, {
      reload: false,
    } as OpenErrorDialogOptions);
    expect(dialogSpy).toHaveBeenCalledTimes(1);
  });

  it('should open dialog on open action when there is a connection error', () => {
    const action = {};
    action['message'] = `Download or request new export?`;
    action['action'] = 'download';
    component.openAction(action);
    expect(dialogSpy).toHaveBeenCalledTimes(1);
  });

  it('should format Error', () => {
    const error1 = { propName1: 'p1Error1', propName2: 'p2Error1' };
    const error2 = { propName1: 'p1Error2', propName2: 'p2Error2' };
    const errors = [error1, error2];
    const result = component.formatError(errors);
    expect(result).toEqual(['p1Error1', 'p2Error1', 'p1Error2', 'p2Error2']);
  });

  it('should format Offer Type', () => {
    let result = component.formatOfferType(OfferType.DEFAULT);
    expect(result).toBe('Default Signup');
    result = component.formatOfferType(OfferType.ACQUISITION);
    expect(result).toBe('Acquisition');
    result = component.formatOfferType(OfferType.WINBACK);
    expect(result).toBe('Winback');
  });

  it('should format Offer', () => {
    let result = component.formatOffer('fixed');
    expect(result).toBe('Fixed Amount');
    result = component.formatOffer('trial');
    expect(result).toBe('Free Trial');
  });

  it('should format code type', () => {
    let result = component.formatOfferCodeType(CodeType.SINGLE_CODE);
    expect(result).toBe('Single');
    result = component.formatOfferCodeType(CodeType.BULK_UNIQUE_CODE);
    expect(result).toBe('Bulk');
  });

  it('should determine button text', () => {
    let result = component.determineButtonText(StatusEnum.PROD);
    expect(result).toBe('RETIRE');
    result = component.determineButtonText(StatusEnum.STG);
    expect(result).toBe('RETIRE');
    result = component.determineButtonText(StatusEnum.PROD_MODIFIED);
    expect(result).toBe('RETIRE');
    result = component.determineButtonText(StatusEnum.DFT);
    expect(result).toBe('DELETE');
  });

  it('should determine empty table', () => {
    let data = [];
    let result = component.determineEmptyTable(data);
    expect(result).toBe(true);
    data = [0];
    result = component.determineEmptyTable(data);
    expect(result).toBe(false);
  });
});
