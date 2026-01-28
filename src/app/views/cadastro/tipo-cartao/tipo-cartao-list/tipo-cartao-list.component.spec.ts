import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipoCartaoListComponent } from './tipo-cartao-list.component';

describe('TipoCartaoListComponent', () => {
  let component: TipoCartaoListComponent;
  let fixture: ComponentFixture<TipoCartaoListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TipoCartaoListComponent]
    });
    fixture = TestBed.createComponent(TipoCartaoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
