import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoshForm } from './posh-form';

describe('PoshForm', () => {
  let component: PoshForm;
  let fixture: ComponentFixture<PoshForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoshForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoshForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
