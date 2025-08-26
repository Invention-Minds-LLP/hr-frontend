import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateTests } from './candidate-tests';

describe('CandidateTests', () => {
  let component: CandidateTests;
  let fixture: ComponentFixture<CandidateTests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateTests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CandidateTests);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
