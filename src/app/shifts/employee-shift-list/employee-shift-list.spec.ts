import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeShiftList } from './employee-shift-list';

describe('EmployeeShiftList', () => {
  let component: EmployeeShiftList;
  let fixture: ComponentFixture<EmployeeShiftList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeShiftList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeShiftList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
