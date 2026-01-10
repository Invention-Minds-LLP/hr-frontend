import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShiftOverview } from './shift-overview';

describe('ShiftOverview', () => {
  let component: ShiftOverview;
  let fixture: ComponentFixture<ShiftOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShiftOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
