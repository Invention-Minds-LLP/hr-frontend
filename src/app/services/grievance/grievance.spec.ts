import { TestBed } from '@angular/core/testing';

import { Grievance } from './grievance';

describe('Grievance', () => {
  let service: Grievance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Grievance);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
