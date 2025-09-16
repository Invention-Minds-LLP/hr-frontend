import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraisalTemplate } from './appraisal-template';

describe('AppraisalTemplate', () => {
  let component: AppraisalTemplate;
  let fixture: ComponentFixture<AppraisalTemplate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppraisalTemplate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppraisalTemplate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
