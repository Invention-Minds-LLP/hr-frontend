import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprasialForm } from './apprasial-form';

describe('ApprasialForm', () => {
  let component: ApprasialForm;
  let fixture: ComponentFixture<ApprasialForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprasialForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprasialForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
