import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { IconPickerComponent } from './icon-picker.component';

describe('IconPickerComponent', () => {
  let fixture: ComponentFixture<IconPickerComponent>;
  let picker: IconPickerComponent;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [IconPickerComponent, NoopAnimationsModule] });
    fixture = TestBed.createComponent(IconPickerComponent);
    picker = fixture.componentInstance;
    picker.icones = ['pi pi-home', 'pi pi-car'];
    fixture.detectChanges();
  });

  it('marca o ícone e a cor atuais; sem nada, as opções automáticas', () => {
    expect(el().querySelector('[aria-label="Automático"]')!.classList).toContain('mf-opcao--marcada');
    expect(el().querySelector('[aria-label="Cor automática"]')!.classList).toContain('mf-opcao--marcada');

    picker.icone = 'pi pi-car';
    picker.cor = 'rosa';
    fixture.detectChanges();

    expect(el().querySelector('[aria-label="pi pi-car"]')!.classList).toContain('mf-opcao--marcada');
    expect(el().querySelector('[aria-label="Rosa"]')!.classList).toContain('mf-opcao--marcada');
  });

  it('emite a escolha de ícone e de cor; automático emite null', () => {
    const icones: (string | null)[] = [];
    const cores: (string | null)[] = [];
    picker.iconeChange.subscribe(i => icones.push(i));
    picker.corChange.subscribe(c => cores.push(c));

    (el().querySelector('[aria-label="pi pi-home"]') as HTMLButtonElement).click();
    (el().querySelector('[aria-label="Verde"]') as HTMLButtonElement).click();
    (el().querySelector('[aria-label="Automático"]') as HTMLButtonElement).click();
    (el().querySelector('[aria-label="Cor automática"]') as HTMLButtonElement).click();

    expect(icones).toEqual(['pi pi-home', null]);
    expect(cores).toEqual(['verde', null]);
  });

  it('os rótulos das opções automáticas vêm de fora', () => {
    picker.rotuloIconeAutomatico = 'Automático (pelo nome)';
    picker.rotuloCorAutomatica = 'Da natureza';
    fixture.detectChanges();

    expect(el().querySelector('[aria-label="Automático (pelo nome)"]')).not.toBeNull();
    expect(el().querySelector('[aria-label="Da natureza"]')).not.toBeNull();
  });

  it('cada amostra da paleta mostra a própria cor', () => {
    const rosa = el().querySelector('[aria-label="Rosa"]') as HTMLElement;
    expect(rosa.style.background).toContain('--mf-cor-rosa-fg');
  });

  it('ícone escolhido fora da grade curta aparece nela, marcado', () => {
    picker.icone = 'pi pi-trophy';
    fixture.detectChanges();

    expect(el().querySelector('[aria-label="pi pi-trophy"]')!.classList).toContain('mf-opcao--marcada');
  });

  it('"Mais ícones" abre a busca em todos os ícones, sem acento e por parte do nome', () => {
    expect(el().querySelector('.mf-icon-picker__busca')).toBeNull();

    (el().querySelector('[data-acao="mais-icones"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el().querySelector('.mf-icon-picker__busca')).not.toBeNull();

    picker.busca = 'TROPH';
    fixture.detectChanges();
    const achados = Array.from(el().querySelectorAll('.mf-icon-picker__resultados button')).map(b => b.getAttribute('aria-label'));
    expect(achados).toEqual(['pi pi-trophy']);

    const emitidos: (string | null)[] = [];
    picker.iconeChange.subscribe(i => emitidos.push(i));
    (el().querySelector('.mf-icon-picker__resultados button') as HTMLButtonElement).click();
    expect(emitidos).toEqual(['pi pi-trophy']);
  });

  it('abrir a busca põe o foco no campo', fakeAsync(() => {
    (el().querySelector('[data-acao="mais-icones"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    tick();

    expect(document.activeElement).toBe(el().querySelector('.mf-icon-picker__busca input'));
  }));

  it('a busca mostra no máximo 60 ícones e avisa quando não acha nada', () => {
    picker.abrirBusca();
    picker.busca = '';
    fixture.detectChanges();
    expect(el().querySelectorAll('.mf-icon-picker__resultados button').length).toBe(60);

    picker.busca = 'nada-assim';
    fixture.detectChanges();
    expect(el().textContent).toContain('Nenhum ícone');
  });
});
