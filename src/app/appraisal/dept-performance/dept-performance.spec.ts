import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeptPerformance } from './dept-performance';

describe('DeptPerformance', () => {
  let component: DeptPerformance;
  let fixture: ComponentFixture<DeptPerformance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeptPerformance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeptPerformance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
