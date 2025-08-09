import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionRequest } from './permission-request';

describe('PermissionRequest', () => {
  let component: PermissionRequest;
  let fixture: ComponentFixture<PermissionRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermissionRequest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
