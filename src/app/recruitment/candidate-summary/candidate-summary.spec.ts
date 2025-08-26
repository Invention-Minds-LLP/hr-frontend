import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateSummary } from './candidate-summary';

describe('CandidateSummary', () => {
  let component: CandidateSummary;
  let fixture: ComponentFixture<CandidateSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CandidateSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
