import { Component, HostListener, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/Auth.service';

type NavItem = { path: string; label: string; icon?: string };

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Input() brand = 'My Finance';

  // estados UI
  isMenuOpen = false;
  isUserOpen = false;

  openDropdownKey: 'cadastros' | 'movimentacoes' | 'listas' | null = null;

  // Dados (ajuste as rotas para as suas do Angular)
  cadastrosItems: NavItem[] = [
    { path: '/category', label: 'Categorias', icon: '🗂️' },
    { path: '/account', label: 'Cadastro de Contas', icon: '💳' },
    { path: '/bancos', label: 'Banco', icon: '🏦' },
    { path: '/tipo-cartao', label: 'Tipo Cartão', icon: '🪪' },
    { path: '/tipo-movimentacao', label: 'Tipo Movimentação', icon: '🔁' },
  ];

  movimentacoesItems: NavItem[] = [
    { path: '/conta-mensal', label: 'Contas a Pagar', icon: '🐷' },
    { path: '/movimentacao-diaria', label: 'Movimentação Diária', icon: '📋' },
    { path: '/extrato-bancario', label: 'Extrato Bancário', icon: '📈' },
  ];

  listasItems: NavItem[] = [
    { path: '/lista-de-compras', label: 'Listas', icon: '🛒' },
    { path: '/item-lista', label: 'Item Lista', icon: '🧾' },
  ];

  constructor(private router: Router, public auth: AuthService) {}

  // Fecha menus ao navegar
  onAnyNavClick() {
    this.isMenuOpen = false;
    this.isUserOpen = false;
    this.openDropdownKey = null;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleDropdown(key: 'cadastros' | 'movimentacoes' | 'listas') {
    this.openDropdownKey = this.openDropdownKey === key ? null : key;
  }

  toggleUser() {
    this.isUserOpen = !this.isUserOpen;
  }

  logout() {
    this.auth.logout();
    this.onAnyNavClick();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  // clique fora: fecha dropdowns
  @HostListener('document:mousedown', ['$event'])
  onDocClick(evt: MouseEvent) {
    const target = evt.target as HTMLElement;
    if (!target.closest('.js-dropdown')) this.openDropdownKey = null;
    if (!target.closest('.js-user-dropdown')) this.isUserOpen = false;
  }
}
