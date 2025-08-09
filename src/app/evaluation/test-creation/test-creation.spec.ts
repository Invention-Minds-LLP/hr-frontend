import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestCreation } from './test-creation';

describe('TestCreation', () => {
  let component: TestCreation;
  let fixture: ComponentFixture<TestCreation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestCreation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestCreation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
