import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeavePopup } from './leave-popup';

describe('LeavePopup', () => {
  let component: LeavePopup;
  let fixture: ComponentFixture<LeavePopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeavePopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeavePopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
