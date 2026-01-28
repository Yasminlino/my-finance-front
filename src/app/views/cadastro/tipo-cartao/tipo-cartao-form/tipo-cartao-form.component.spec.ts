import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoCartaoFormComponent } from './tipo-cartao-form.component';

describe('TipoCartaoFormComponent', () => {
  let component: TipoCartaoFormComponent;
  let fixture: ComponentFixture<TipoCartaoFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TipoCartaoFormComponent]
    });
    fixture = TestBed.createComponent(TipoCartaoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
