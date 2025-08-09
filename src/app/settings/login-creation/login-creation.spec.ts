import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginCreation } from './login-creation';

describe('LoginCreation', () => {
  let component: LoginCreation;
  let fixture: ComponentFixture<LoginCreation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginCreation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginCreation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
