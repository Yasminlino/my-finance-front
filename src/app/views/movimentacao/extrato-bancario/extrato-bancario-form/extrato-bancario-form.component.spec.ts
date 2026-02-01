import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtratoBancarioFormComponent } from './extrato-bancario-form.component';

describe('ExtratoBancarioFormComponent', () => {
  let component: ExtratoBancarioFormComponent;
  let fixture: ComponentFixture<ExtratoBancarioFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExtratoBancarioFormComponent]
    });
    fixture = TestBed.createComponent(ExtratoBancarioFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
