import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WinbackFormComponent } from './winback-form.component';

describe('WinbackFormComponent', () => {
  let component: WinbackFormComponent;
  let fixture: ComponentFixture<WinbackFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WinbackFormComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WinbackFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
