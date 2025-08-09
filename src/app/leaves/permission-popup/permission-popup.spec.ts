import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionPopup } from './permission-popup';

describe('PermissionPopup', () => {
  let component: PermissionPopup;
  let fixture: ComponentFixture<PermissionPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionPopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermissionPopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
