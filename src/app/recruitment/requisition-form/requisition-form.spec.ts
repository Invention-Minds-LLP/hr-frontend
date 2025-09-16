import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequisitionForm } from './requisition-form';

describe('RequisitionForm', () => {
  let component: RequisitionForm;
  let fixture: ComponentFixture<RequisitionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequisitionForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequisitionForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
