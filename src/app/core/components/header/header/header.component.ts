import { Component, Input } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

/** icon: classe do PrimeIcons ("pi pi-..."). */
type NavItem = { path: string; label: string; icon?: string };

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Input() brand = 'My Finance';

  usuario = localStorage.getItem('usuarioNome') ?? 'Admin';

  cadastrosItems: NavItem[] = [
    { path: '/categorias', label: 'Categorias', icon: 'pi pi-tags' },
    { path: '/contas', label: 'Cadastro de Contas', icon: 'pi pi-credit-card' },
    { path: '/bancos', label: 'Banco', icon: 'pi pi-building' },
    { path: '/tipos-cartao', label: 'Tipo Cartão', icon: 'pi pi-id-card' },
    { path: '/tipos-movimentacao', label: 'Tipo Movimentação', icon: 'pi pi-sync' },
  ];

  movimentacoesItems: NavItem[] = [
    { path: '/contas-a-pagar', label: 'Contas a Pagar', icon: 'pi pi-money-bill' },
    // { path: '/movimentacao-diaria', label: 'Movimentação Diária', icon: 'pi pi-calendar' },
    { path: '/extrato-bancario', label: 'Extrato Bancário', icon: 'pi pi-chart-line' },
  ];

  listasItems: NavItem[] = [
    { path: '/listas', label: 'Listas', icon: 'pi pi-shopping-cart' },
    // { path: '/item-lista', label: 'Item Lista', icon: 'pi pi-list' },
  ];

  /** Menu do p-menubar; submenus e o modo mobile vêm do PrimeNG (FE-P2-07). */
  readonly menu: MenuItem[] = [
    { label: 'Página Inicial', icon: 'pi pi-home', routerLink: '/home', routerLinkActiveOptions: { exact: true } },
    { label: 'Cadastros', icon: 'pi pi-folder', items: this.itensDoMenu(this.cadastrosItems) },
    { label: 'Movimentações', icon: 'pi pi-wallet', items: this.itensDoMenu(this.movimentacoesItems) },
    { label: 'Listas', icon: 'pi pi-list', items: this.itensDoMenu(this.listasItems) },
  ];

  constructor(private router: Router, public auth: AuthService) {}

  logout() {
    this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  private itensDoMenu(itens: NavItem[]): MenuItem[] {
    return itens.map(item => ({ label: item.label, icon: item.icon, routerLink: item.path }));
  }
}
