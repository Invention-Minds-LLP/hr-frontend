import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppraisalTable } from './appraisal-table';

describe('AppraisalTable', () => {
  let component: AppraisalTable;
  let fixture: ComponentFixture<AppraisalTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppraisalTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppraisalTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
