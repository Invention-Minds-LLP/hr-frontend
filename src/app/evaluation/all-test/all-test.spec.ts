import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllTest } from './all-test';

describe('AllTest', () => {
  let component: AllTest;
  let fixture: ComponentFixture<AllTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllTest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllTest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
