import { computed, signal } from '@angular/core';

/**
 * Espera antes de poder reenviar um e-mail (card #50): "Reenviar em 42s". A tela chama `iniciar()` depois
 * de cada envio e `parar()` no ngOnDestroy.
 */
export class ContagemReenvio {
  readonly segundos = signal(0);
  readonly liberado = computed(() => this.segundos() === 0);
  private intervalo?: ReturnType<typeof setInterval>;

  constructor(private readonly duracao = 60) {}

  iniciar() {
    this.parar();
    this.segundos.set(this.duracao);
    this.intervalo = setInterval(() => {
      this.segundos.update(s => Math.max(0, s - 1));
      if (this.segundos() === 0) this.parar();
    }, 1000);
  }

  parar() {
    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = undefined;
  }
}
