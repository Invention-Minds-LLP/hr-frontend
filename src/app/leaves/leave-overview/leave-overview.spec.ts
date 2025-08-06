import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaveOverview } from './leave-overview';

describe('LeaveOverview', () => {
  let component: LeaveOverview;
  let fixture: ComponentFixture<LeaveOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaveOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaveOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
