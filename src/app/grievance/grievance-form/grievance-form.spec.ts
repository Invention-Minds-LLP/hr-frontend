import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrievanceForm } from './grievance-form';

describe('GrievanceForm', () => {
  let component: GrievanceForm;
  let fixture: ComponentFixture<GrievanceForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrievanceForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrievanceForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
