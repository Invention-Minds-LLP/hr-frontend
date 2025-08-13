import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResignationForm } from './resignation-form';

describe('ResignationForm', () => {
  let component: ResignationForm;
  let fixture: ComponentFixture<ResignationForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResignationForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResignationForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
