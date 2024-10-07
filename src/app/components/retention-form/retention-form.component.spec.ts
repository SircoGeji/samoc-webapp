import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RetentionFormComponent } from './retention-form.component';

describe('RetentionFormComponent', () => {
  let component: RetentionFormComponent;
  let fixture: ComponentFixture<RetentionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RetentionFormComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RetentionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
