import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyEmpLocations } from './my-emp-locations';

describe('MyEmpLocations', () => {
  let component: MyEmpLocations;
  let fixture: ComponentFixture<MyEmpLocations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyEmpLocations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyEmpLocations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
