import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestPlatform } from './test-platform';

describe('TestPlatform', () => {
  let component: TestPlatform;
  let fixture: ComponentFixture<TestPlatform>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestPlatform]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestPlatform);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
