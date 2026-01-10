import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShiftRequests } from './shift-requests';

describe('ShiftRequests', () => {
  let component: ShiftRequests;
  let fixture: ComponentFixture<ShiftRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftRequests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShiftRequests);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
