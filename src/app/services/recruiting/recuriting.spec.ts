import { TestBed } from '@angular/core/testing';

import { Recuriting } from './recuriting';

describe('Recuriting', () => {
  let service: Recuriting;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Recuriting);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
