import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  let component: SpinnerComponent;
  let fixture: ComponentFixture<SpinnerComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [SpinnerComponent],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(SpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should test ioEventHandler - part1', () => {
    const value = component.ioEventHandler('update-spinner-text', 'test');
    expect(value).toBe(true);
  });

  it('should test ioEventHandler - part2', () => {
    const value = component.ioEventHandler('not-update-spinner-text', 'test');
    expect(value).toBe(false);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
