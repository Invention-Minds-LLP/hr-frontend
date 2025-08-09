import { TestBed } from '@angular/core/testing';

import { TestAttempt } from './test-attempt';

describe('TestAttempt', () => {
  let service: TestAttempt;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TestAttempt);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
