import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingForm } from './training-form';

describe('TrainingForm', () => {
  let component: TrainingForm;
  let fixture: ComponentFixture<TrainingForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrainingForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
