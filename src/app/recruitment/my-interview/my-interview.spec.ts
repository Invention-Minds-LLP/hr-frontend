import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyInterview } from './my-interview';

describe('MyInterview', () => {
  let component: MyInterview;
  let fixture: ComponentFixture<MyInterview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyInterview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyInterview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
