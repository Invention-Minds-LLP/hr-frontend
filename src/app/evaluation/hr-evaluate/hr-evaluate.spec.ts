import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HrEvaluate } from './hr-evaluate';

describe('HrEvaluate', () => {
  let component: HrEvaluate;
  let fixture: ComponentFixture<HrEvaluate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrEvaluate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HrEvaluate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
