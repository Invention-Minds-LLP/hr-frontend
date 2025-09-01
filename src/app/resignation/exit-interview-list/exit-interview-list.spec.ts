import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExitInterviewList } from './exit-interview-list';

describe('ExitInterviewList', () => {
  let component: ExitInterviewList;
  let fixture: ComponentFixture<ExitInterviewList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitInterviewList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExitInterviewList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
