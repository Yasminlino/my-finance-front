import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalImportacoesMensaisComponent } from './modal-importacoes-mensais.component';

describe('ModalImportacoesMensaisComponent', () => {
  let component: ModalImportacoesMensaisComponent;
  let fixture: ComponentFixture<ModalImportacoesMensaisComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalImportacoesMensaisComponent]
    });
    fixture = TestBed.createComponent(ModalImportacoesMensaisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
