import { TestBed } from '@angular/core/testing';

import { AttendanceCalendar } from './attendance-calendar';

describe('AttendanceCalendar', () => {
  let service: AttendanceCalendar;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttendanceCalendar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
