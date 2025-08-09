import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationOverview } from './evaluation-overview';

describe('EvaluationOverview', () => {
  let component: EvaluationOverview;
  let fixture: ComponentFixture<EvaluationOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluationOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
