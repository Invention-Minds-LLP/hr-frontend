import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Clearances } from './clearances';

describe('Clearances', () => {
  let component: Clearances;
  let fixture: ComponentFixture<Clearances>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Clearances]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Clearances);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
