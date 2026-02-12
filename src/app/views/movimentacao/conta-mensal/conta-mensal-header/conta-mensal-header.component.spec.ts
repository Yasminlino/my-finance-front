import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContaMensalHeaderComponent } from './conta-mensal-header.component';

describe('ContaMensalHeaderComponent', () => {
  let component: ContaMensalHeaderComponent;
  let fixture: ComponentFixture<ContaMensalHeaderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ContaMensalHeaderComponent]
    });
    fixture = TestBed.createComponent(ContaMensalHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
