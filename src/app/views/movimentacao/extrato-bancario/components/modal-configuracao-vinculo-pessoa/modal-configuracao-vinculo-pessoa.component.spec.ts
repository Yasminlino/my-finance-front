import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalConfiguracaoVinculoPessoaComponent } from './modal-configuracao-vinculo-pessoa.component';

describe('ModalConfiguracaoVinculoPessoaComponent', () => {
  let component: ModalConfiguracaoVinculoPessoaComponent;
  let fixture: ComponentFixture<ModalConfiguracaoVinculoPessoaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalConfiguracaoVinculoPessoaComponent]
    });
    fixture = TestBed.createComponent(ModalConfiguracaoVinculoPessoaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
