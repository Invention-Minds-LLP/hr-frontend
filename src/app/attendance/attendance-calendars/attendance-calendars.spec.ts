import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceCalendars } from './attendance-calendars';

describe('AttendanceCalendars', () => {
  let component: AttendanceCalendars;
  let fixture: ComponentFixture<AttendanceCalendars>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceCalendars]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceCalendars);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
