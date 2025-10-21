import { TestBed } from '@angular/core/testing';

import { Trainings } from './trainings';

describe('Trainings', () => {
  let service: Trainings;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Trainings);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
