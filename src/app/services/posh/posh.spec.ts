import { TestBed } from '@angular/core/testing';

import { Posh } from './posh';

describe('Posh', () => {
  let service: Posh;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Posh);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
