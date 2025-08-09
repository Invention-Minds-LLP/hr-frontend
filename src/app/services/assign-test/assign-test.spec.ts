import { TestBed } from '@angular/core/testing';

import { AssignTest } from './assign-test';

describe('AssignTest', () => {
  let service: AssignTest;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssignTest);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
