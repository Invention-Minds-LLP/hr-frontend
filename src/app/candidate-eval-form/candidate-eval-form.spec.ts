import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateEvalForm } from './candidate-eval-form';

describe('CandidateEvalForm', () => {
  let component: CandidateEvalForm;
  let fixture: ComponentFixture<CandidateEvalForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateEvalForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CandidateEvalForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
