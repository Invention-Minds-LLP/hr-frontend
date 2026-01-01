import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerShift } from './manager-shift';

describe('ManagerShift', () => {
  let component: ManagerShift;
  let fixture: ComponentFixture<ManagerShift>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerShift]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerShift);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
