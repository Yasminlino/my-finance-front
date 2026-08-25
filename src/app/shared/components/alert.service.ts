import { Component, Injectable, Input, OnInit } from "@angular/core";
import { MessageService } from "primeng/api";


@Injectable({ providedIn: 'root' })
export class AlertService {
    constructor(private readonly messageService: MessageService){}

    success( mensagem: string): void {
        this.messageService.add({ 
            severity: 'success', 
            summary: 'Sucesso', 
            detail: mensagem 
        });
    }
    error(mensagem: string): void {
        this.messageService.add({ 
            severity: 'error', 
            summary: 'Erro', 
            detail: mensagem 
        });
    }
    info(mensagem: string): void {
        this.messageService.add({ 
            severity: 'info', 
            summary: 'Informação', 
            detail: mensagem 
        });
    }
    secondary(titulo: string, mensagem: string): void {
        this.messageService.add({ 
            severity: 'secondary', 
            summary: titulo, 
            detail: mensagem 
        });
    }
    contrast(titulo: string, mensagem: string): void {
        this.messageService.add({ 
            severity: 'warn', 
            summary: titulo, 
            detail: mensagem 
        });
    }
}