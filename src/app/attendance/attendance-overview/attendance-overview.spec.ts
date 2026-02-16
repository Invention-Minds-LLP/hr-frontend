import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceOverview } from './attendance-overview';

describe('AttendanceOverview', () => {
  let component: AttendanceOverview;
  let fixture: ComponentFixture<AttendanceOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
