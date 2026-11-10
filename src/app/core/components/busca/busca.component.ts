import { Component, DestroyRef, ElementRef, EventEmitter, OnInit, Output, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { BuscaService } from '../../services/busca.service';
import { EntradaBusca, daApi, filtrarFixas } from './busca.regras';

/** Busca rápida do menu (Ctrl+K, card #72): Esc fecha, ↑↓ escolhem, Enter abre. */
@Component({
  selector: 'app-busca',
  standalone: true,
  imports: [FormsModule, DialogModule, InputTextModule],
  templateUrl: './busca.component.html',
  styleUrl: './busca.component.scss'
})
export class BuscaComponent implements OnInit {
  @Output() fechado = new EventEmitter<void>();
  @ViewChild('campo') campo?: ElementRef<HTMLInputElement>;

  private readonly servico = inject(BuscaService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly termo$ = new Subject<string>();

  termo = '';
  buscando = false;
  daApi: EntradaBusca[] = [];
  selecionado = 0;

  ngOnInit(): void {
    this.termo$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(t => {
          if (t.trim().length < 2) return of([]);
          this.buscando = true;
          return this.servico.buscar(t.trim()).pipe(catchError(() => of([])));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(lista => {
        this.buscando = false;
        this.daApi = lista.map(daApi).filter((e): e is EntradaBusca => !!e);
        this.selecionado = Math.min(this.selecionado, Math.max(0, this.resultados.length - 1));
      });
  }

  /** Ações e telas que casam com o termo (até 6), depois o que veio da API. */
  get resultados(): EntradaBusca[] {
    return [...filtrarFixas(this.termo).slice(0, 6), ...this.daApi];
  }

  /** Para os títulos de grupo: true quando a linha abre um grupo novo. */
  comecaGrupo(i: number): boolean {
    const r = this.resultados;
    return i === 0 || r[i].grupo !== r[i - 1].grupo;
  }

  aoMostrar(): void {
    setTimeout(() => this.campo?.nativeElement.focus());
  }

  aoDigitar(): void {
    this.selecionado = 0;
    if (this.termo.trim().length < 2) this.daApi = [];
    this.termo$.next(this.termo);
  }

  teclado(evento: KeyboardEvent): void {
    const total = this.resultados.length;
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      this.selecionado = total ? (this.selecionado + 1) % total : 0;
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      this.selecionado = total ? (this.selecionado - 1 + total) % total : 0;
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      const escolhido = this.resultados[this.selecionado];
      if (escolhido) this.abrir(escolhido);
    } else if (evento.key === 'Escape') {
      this.fechar();
    }
  }

  abrir(entrada: EntradaBusca): void {
    this.router.navigateByUrl(entrada.url);
    this.fechar();
  }

  fechar(): void {
    this.fechado.emit();
  }
}
