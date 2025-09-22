import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoshHearing } from './posh-hearing';

describe('PoshHearing', () => {
  let component: PoshHearing;
  let fixture: ComponentFixture<PoshHearing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoshHearing]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoshHearing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
