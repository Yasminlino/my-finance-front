import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContaMensalFormComponent } from './conta-mensal-form.component';

describe('ContaMensalFormComponent', () => {
  let component: ContaMensalFormComponent;
  let fixture: ComponentFixture<ContaMensalFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContaMensalFormComponent]
    });
    fixture = TestBed.createComponent(ContaMensalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
