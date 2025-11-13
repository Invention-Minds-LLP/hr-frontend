import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcknowledgePopup } from './acknowledge-popup';

describe('AcknowledgePopup', () => {
  let component: AcknowledgePopup;
  let fixture: ComponentFixture<AcknowledgePopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcknowledgePopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AcknowledgePopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
