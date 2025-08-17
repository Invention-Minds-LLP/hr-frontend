import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationCreate } from './application-create';

describe('ApplicationCreate', () => {
  let component: ApplicationCreate;
  let fixture: ComponentFixture<ApplicationCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
