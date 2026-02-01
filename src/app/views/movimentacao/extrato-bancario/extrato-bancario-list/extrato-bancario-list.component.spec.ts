import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtratoBancarioListComponent } from './extrato-bancario-list.component';

describe('ExtratoBancarioListComponent', () => {
  let component: ExtratoBancarioListComponent;
  let fixture: ComponentFixture<ExtratoBancarioListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExtratoBancarioListComponent]
    });
    fixture = TestBed.createComponent(ExtratoBancarioListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
