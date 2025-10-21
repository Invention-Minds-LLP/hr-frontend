import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingOverview } from './training-overview';

describe('TrainingOverview', () => {
  let component: TrainingOverview;
  let fixture: ComponentFixture<TrainingOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrainingOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
