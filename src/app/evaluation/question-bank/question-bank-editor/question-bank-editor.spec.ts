import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionBankEditor } from './question-bank-editor';

describe('QuestionBankEditor', () => {
  let component: QuestionBankEditor;
  let fixture: ComponentFixture<QuestionBankEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionBankEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionBankEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
