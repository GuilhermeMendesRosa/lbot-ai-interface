#!/usr/bin/env python3
"""
L-Bot Socket Control - Controlador Python

Parte do projeto L-Bot para controle de robôs E-Puck via socket TCP.
Este script se conecta ao programa lbot-socket-control e permite controlar
o movimento do robô E-Puck através de comandos de sequência.

Formato de comandos:
- XF;YB;ZL;WR - onde X,Y,Z,W são números e F=frente, B=trás, L=esquerda, R=direita
- Exemplos:
  * "10F" - move 10 unidades para frente
  * "10F;5R" - move 10 para frente e vira 5 graus à direita
  * "23B;7L;8F" - move 23 para trás, vira 7 graus à esquerda, move 8 para frente

Comandos especiais:
- stop - para o robô
- status - mostra posição e estado atual
- help - mostra esta ajuda
- quit - encerra conexão

Projeto: L-Bot (Laboratório de Robótica)
Autor: Guilherme Mendes Rosa
"""

import socket
import time
import threading
import sys

class EnkiRobotController:
    def __init__(self, host='localhost', port=9999):
        self.host = host
        self.port = port
        self.socket = None
        self.connected = False
        self.running = True
        
    def connect(self):
        """Conecta ao servidor Enki"""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))
            self.connected = True
            print(f"✓ Conectado ao Enki em {self.host}:{self.port}")
            
            # Iniciar thread para receber mensagens
            self.receive_thread = threading.Thread(target=self.receive_messages)
            self.receive_thread.daemon = True
            self.receive_thread.start()
            
            return True
            
        except Exception as e:
            print(f"✗ Erro ao conectar: {e}")
            print("Certifique-se de que o programa Enki está rodando!")
            return False
    
    def receive_messages(self):
        """Thread para receber mensagens do servidor"""
        while self.connected and self.running:
            try:
                data = self.socket.recv(1024).decode('utf-8')
                if data:
                    for line in data.strip().split('\n'):
                        if line.strip():
                            print(f"🤖 {line}")
                else:
                    break
            except:
                break
                
        self.connected = False
    
    def send_command(self, command):
        """Envia comando para o robô"""
        if not self.connected:
            print("✗ Não conectado ao servidor!")
            return False
            
        try:
            self.socket.send(f"{command}\n".encode('utf-8'))
            return True
        except Exception as e:
            print(f"✗ Erro ao enviar comando: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Desconecta do servidor"""
        self.running = False
        if self.socket:
            self.socket.close()
        self.connected = False
        print("Desconectado.")
    
    def validate_movement_command(self, command):
        """Valida se o comando está no formato correto XF;YB;ZL;WR"""
        import re
        
        # Permitir comandos especiais
        if command.lower() in ['stop', 'status', 'quit', 'help']:
            return True
        
        # Padrão para movimentos: número seguido de F, B, L ou R
        pattern = r'^\d+(\.\d+)?[FBLR]$'
        
        # Dividir por ; e validar cada parte
        movements = command.upper().split(';')
        
        for movement in movements:
            movement = movement.strip()
            if not movement:
                continue
            if not re.match(pattern, movement):
                return False
        
        return len(movements) > 0
    
    def interactive_mode(self):
        """Modo interativo para controle manual"""
        print("\n" + "="*60)
        print("🤖 CONTROLADOR DO ROBÔ E-PUCK")
        print("="*60)
        print("Digite comandos no formato: XF;YB;ZL;WR")
        print("\n📋 LEGENDA:")
        print("  F = Forward (frente)")
        print("  B = Backward (trás)")  
        print("  L = Left (esquerda)")
        print("  R = Right (direita)")
        print("  X,Y,Z,W = números (distâncias)")
        print("\n✨ EXEMPLOS:")
        print("  10F          → mover 10 unidades para frente")
        print("  10F;5R       → mover 10 para frente e 5 para direita")
        print("  23B;7L;8R    → mover 23 para trás, 7 esquerda, 8 direita")
        print("\n🔧 COMANDOS ESPECIAIS:")
        print("  stop    → parar robô")
        print("  status  → mostrar posição atual")
        print("  help    → mostrar ajuda")
        print("  quit    → sair")
        print("="*60)
        
        while self.connected and self.running:
            try:
                command = input("\n🎮 Digite um comando: ").strip()
                
                if not command:
                    continue
                    
                if command.lower() in ['quit', 'exit', 'q']:
                    self.send_command("quit")
                    break
                    
                elif command.lower() == 'help':
                    print("\n📋 FORMATO: XF;YB;ZL;WR")
                    print("✨ EXEMPLOS:")
                    print("  5F      → frente 5 unidades")
                    print("  3B      → trás 3 unidades") 
                    print("  2L      → esquerda 2 unidades")
                    print("  4R      → direita 4 unidades")
                    print("  10F;5R  → frente 10 + direita 5")
                    print("  8B;3L   → trás 8 + esquerda 3")
                    continue
                elif command.lower() in ['stop', 'status']:
                    self.send_command(command)
                    time.sleep(0.1)
                    continue
                
                # Validar formato do comando
                if self.validate_movement_command(command):
                    self.send_command(command)
                    time.sleep(0.1)
                else:
                    print("❌ Formato inválido!")
                    print("💡 Use: XF;YB;ZL;WR (ex: 10F;5R)")
                    print("   Digite 'help' para ver mais exemplos.")
                
            except KeyboardInterrupt:
                print("\n\nSaindo...")
                break
            except EOFError:
                print("\nSaindo...")
                break
    


def main():
    controller = EnkiRobotController()
    
    print("🚀 Iniciando controlador do robô E-Puck...")
    
    # Tentar conectar
    if not controller.connect():
        return 1
    
    try:
        # Aguardar mensagens de boas-vindas
        time.sleep(0.5)
        
        # Sempre usar modo interativo
        controller.interactive_mode()
            
    finally:
        controller.disconnect()
    
    return 0

if __name__ == "__main__":
    exit(main())
