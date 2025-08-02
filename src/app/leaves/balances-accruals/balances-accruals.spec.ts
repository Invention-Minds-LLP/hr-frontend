import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalancesAccruals } from './balances-accruals';

describe('BalancesAccruals', () => {
  let component: BalancesAccruals;
  let fixture: ComponentFixture<BalancesAccruals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalancesAccruals]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BalancesAccruals);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
