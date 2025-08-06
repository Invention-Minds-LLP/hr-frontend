import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraisalOverview } from './appraisal-overview';

describe('AppraisalOverview', () => {
  let component: AppraisalOverview;
  let fixture: ComponentFixture<AppraisalOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppraisalOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppraisalOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
