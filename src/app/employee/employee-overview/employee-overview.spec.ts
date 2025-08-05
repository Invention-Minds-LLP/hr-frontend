import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeOverview } from './employee-overview';

describe('EmployeeOverview', () => {
  let component: EmployeeOverview;
  let fixture: ComponentFixture<EmployeeOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
