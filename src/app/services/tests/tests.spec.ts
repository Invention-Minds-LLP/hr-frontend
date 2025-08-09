import { TestBed } from '@angular/core/testing';

import { Tests } from './tests';

describe('Tests', () => {
  let service: Tests;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Tests);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
