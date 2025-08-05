import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAttendance } from './manage-attendance';

describe('ManageAttendance', () => {
  let component: ManageAttendance;
  let fixture: ComponentFixture<ManageAttendance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageAttendance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageAttendance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
