import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WfhPopup } from './wfh-popup';

describe('WfhPopup', () => {
  let component: WfhPopup;
  let fixture: ComponentFixture<WfhPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WfhPopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WfhPopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
