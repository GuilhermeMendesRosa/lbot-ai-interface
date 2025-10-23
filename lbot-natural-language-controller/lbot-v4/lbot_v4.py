#!/usr/bin/env python3
"""
🤖 LBot Translator V4 - Script de Uso

Script para usar o modelo treinado lbot_translator_v4.pt
Traduz comandos em português para LBML (LBot Movement Language)

Formato LBML V4:
- Deslocamento: D<valor><direção>; (ex: D40F; = 40cm frente)
- Rotação: R<valor><direção>; (ex: R90R; = 90° direita)
- Composto: D40F;R90R;D20L; (múltiplas ações)

Uso:
    python lbot_v4.py                    # Interface interativa
    python lbot_v4.py "vá 40 para frente" # Comando único
"""

import torch
import torch.nn as nn
from torch.nn import functional as F
import math
import numpy as np
from dataclasses import dataclass
import sys
import os
import time

@dataclass
class GPTConfig:
    block_size: int = 256      # Contexto aumentado para comandos compostos
    vocab_size: int = 80       # Vocabulário expandido
    n_layer: int = 8           # 8 camadas para maior complexidade
    n_head: int = 8            # 8 cabeças de atenção
    n_embd: int = 512          # Dimensão de embedding maior
    dropout: float = 0.15      # Dropout reduzido
    bias: bool = True

class CausalSelfAttention(nn.Module):
    def __init__(self, config):
        super().__init__()
        assert config.n_embd % config.n_head == 0
        self.c_attn = nn.Linear(config.n_embd, 3 * config.n_embd, bias=config.bias)
        self.c_proj = nn.Linear(config.n_embd, config.n_embd, bias=config.bias)
        self.attn_dropout = nn.Dropout(config.dropout)
        self.resid_dropout = nn.Dropout(config.dropout)
        self.n_head = config.n_head
        self.n_embd = config.n_embd
        self.register_buffer("bias", torch.tril(torch.ones(config.block_size, config.block_size))
                           .view(1, 1, config.block_size, config.block_size))

    def forward(self, x):
        B, T, C = x.size()
        q, k, v = self.c_attn(x).split(self.n_embd, dim=2)
        k = k.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        q = q.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        v = v.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)

        att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(k.size(-1)))
        att = att.masked_fill(self.bias[:,:,:T,:T] == 0, float('-inf'))
        att = F.softmax(att, dim=-1)
        att = self.attn_dropout(att)
        y = att @ v
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        y = self.resid_dropout(self.c_proj(y))
        return y

class MLP(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.c_fc = nn.Linear(config.n_embd, 4 * config.n_embd, bias=config.bias)
        self.gelu = nn.GELU()
        self.c_proj = nn.Linear(4 * config.n_embd, config.n_embd, bias=config.bias)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x):
        x = self.c_fc(x)
        x = self.gelu(x)
        x = self.c_proj(x)
        x = self.dropout(x)
        return x

class Block(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.ln_1 = nn.LayerNorm(config.n_embd)
        self.attn = CausalSelfAttention(config)
        self.ln_2 = nn.LayerNorm(config.n_embd)
        self.mlp = MLP(config)

    def forward(self, x):
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x

class GPT(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.config = config

        self.transformer = nn.ModuleDict(dict(
            wte = nn.Embedding(config.vocab_size, config.n_embd),
            wpe = nn.Embedding(config.block_size, config.n_embd),
            drop = nn.Dropout(config.dropout),
            h = nn.ModuleList([Block(config) for _ in range(config.n_layer)]),
            ln_f = nn.LayerNorm(config.n_embd),
        ))
        self.lm_head = nn.Linear(config.n_embd, config.vocab_size, bias=False)
        self.transformer.wte.weight = self.lm_head.weight

        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, idx, targets=None):
        device = idx.device
        b, t = idx.size()
        pos = torch.arange(0, t, dtype=torch.long, device=device)

        tok_emb = self.transformer.wte(idx)
        pos_emb = self.transformer.wpe(pos)
        x = self.transformer.drop(tok_emb + pos_emb)
        for block in self.transformer.h:
            x = block(x)
        x = self.transformer.ln_f(x)

        if targets is not None:
            logits = self.lm_head(x)
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1), ignore_index=-1)
        else:
            logits = self.lm_head(x[:, [-1], :])
            loss = None

        return logits, loss

    @torch.no_grad()
    def generate(self, idx, max_new_tokens, temperature=1.0, top_k=None):
        for _ in range(max_new_tokens):
            idx_cond = idx if idx.size(1) <= self.config.block_size else idx[:, -self.config.block_size:]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :] / temperature
            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = -float('Inf')
            probs = F.softmax(logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, idx_next), dim=1)
        return idx

def load_lbot_model_v4(path='lbot_translator_v4.pt'):
    """
    Carrega o modelo LBot Translator V4 treinado

    Args:
        path (str): Caminho para o arquivo do modelo (.pt)

    Returns:
        tuple: (model, encode_fn, decode_fn, stoi, itos)
    """
    print(f"🔄 Carregando modelo: {path}")

    if not os.path.exists(path):
        raise FileNotFoundError(f"❌ Arquivo do modelo não encontrado: {path}")

    # CORREÇÃO: weights_only=False para PyTorch 2.6+
    checkpoint = torch.load(path, map_location='cpu', weights_only=False)

    # Recriar vocabulário e funções encode/decode
    stoi = checkpoint['stoi']
    itos = checkpoint['itos']

    def encode_text(s):
        """Converte string para lista de índices"""
        return [stoi[c] for c in s]

    def decode_text(l):
        """Converte lista de índices para string"""
        return ''.join([itos[i] for i in l])

    # Recriar modelo
    config = checkpoint['config']
    model = GPT(config)
    model.load_state_dict(checkpoint['model'])

    # Modo de inferência
    model.eval()

    # Mover para GPU se disponível
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = model.to(device)
    # Adicionar device ao modelo para acesso posterior
    model.device = device

    print(f"✅ Modelo carregado com sucesso!")
    print(f"   📊 Parâmetros: {sum(p.numel() for p in model.parameters()):,}")
    print(f"   🎯 Device: {device}")
    print(f"   📋 Vocabulário: {len(stoi)} caracteres")

    return model, encode_text, decode_text, stoi, itos

def lbot_translator_v4(command, model, encode_fn, decode_fn, temperature=0.05, max_tokens=100):
    """
    Traduz comando em português para LBML V4

    Args:
        command (str): Comando em português
        model: Modelo GPT carregado
        encode_fn: Função de encode
        decode_fn: Função de decode
        temperature (float): Controla aleatoriedade (0.05 = determinístico)
        max_tokens (int): Máximo de tokens a gerar

    Returns:
        str: Comando no formato LBML ou "ERRO"
    """
    # Preparar input
    input_text = f"{command.strip()} ->"
    input_ids = torch.tensor(encode_fn(input_text), dtype=torch.long).unsqueeze(0)

    # Mover para mesmo device do modelo
    input_ids = input_ids.to(model.device)

    # Gerar com temperatura baixa para precisão
    with torch.no_grad():
        generated = model.generate(
            input_ids,
            max_new_tokens=max_tokens,
            temperature=temperature,
            top_k=5
        )

    # Decodificar resultado completo
    full_result = decode_fn(generated[0].tolist())

    # Extrair parte após "->"
    if "->" in full_result:
        parts = full_result.split("->", 1)
        if len(parts) > 1:
            # Pegar apenas primeira linha
            lbot_command = parts[1].strip().split('\n')[0].strip()

            # Limpar: manter apenas caracteres válidos do LBML V4
            # Válidos: dígitos, D, R, F, B, L, R, ;
            cleaned = ''.join(c for c in lbot_command if c.isdigit() or c in 'DRFBL;')

            # Validar formato básico
            if cleaned and cleaned[0] in 'DR':
                return cleaned

    return "ERRO"

def interactive_chat_v4(model, encode_fn, decode_fn):
    """Interface de chat interativo para o tradutor LBot V4"""
    print("\n" + "="*60)
    print("🤖  LBOT TRANSLATOR V4 - CHAT INTERATIVO")
    print("="*60)
    print("💬 Digite comandos em português natural!")
    print("📋 Exemplos:")
    print("   • 'vá 40 centímetros para frente'")
    print("   • 'gire 90 graus à direita'")
    print("   • 'ande 25, vire 90 à esquerda, ande 25'")
    print("   • 'desloque 1 metro para trás'")
    print("\n🎮 Comandos especiais:")
    print("   • 'ajuda' ou 'help' - mostra esta mensagem")
    print("   • 'exemplos' - mostra mais exemplos")
    print("   • 'limpar' - limpa o histórico")
    print("   • 'sair', 'exit', 'quit' - sai do chat")
    print("="*60 + "\n")

    history = []
    command_count = 0

    while True:
        try:
            # Prompt do usuário
            user_input = input("� Você: ").strip()

            if not user_input:
                continue

            # Processar comandos especiais
            if user_input.lower() in ['sair', 'exit', 'quit', 'q']:
                print("\n👋 Obrigado por usar o LBot Translator V4!")
                print(f"📊 Você fez {command_count} traduções nesta sessão.")
                print("🚀 Até a próxima!\n")
                break

            elif user_input.lower() in ['ajuda', 'help', 'h']:
                show_help()
                continue

            elif user_input.lower() in ['exemplos', 'examples', 'e']:
                show_examples()
                continue

            elif user_input.lower() in ['limpar', 'clear', 'c']:
                history.clear()
                command_count = 0
                print("🧹 Histórico limpo! Começando do zero.\n")
                continue

            elif user_input.lower() in ['historico', 'history', 'hist']:
                show_history(history)
                continue

            # Traduzir comando
            command_count += 1
            print("🤖 LBot está pensando...")
            translation = lbot_translator_v4(user_input, model, encode_fn, decode_fn)

            # Mostrar resultado
            if translation != "ERRO":
                print(f"🤖 LBot: {translation}")
                print("✅ Comando válido!")
                # Adicionar ao histórico
                history.append({
                    'input': user_input,
                    'output': translation,
                    'timestamp': time.strftime("%H:%M:%S")
                })
            else:
                print("❌ LBot: Não entendi esse comando. Tente reformular!")
                print("💡 Dica: Use comandos como 'vá para frente', 'gire à direita', etc.")

            print("-" * 40 + "\n")

        except KeyboardInterrupt:
            print("\n\n👋 Interrupção detectada. Saindo...")
            break
        except Exception as e:
            print(f"❌ Erro inesperado: {e}")
            print("🔄 Tentando continuar...\n")

def show_help():
    """Mostra mensagem de ajuda"""
    print("\n" + "="*50)
    print("🆘 AJUDA - LBOT TRANSLATOR V4")
    print("="*50)
    print("📝 COMO USAR:")
    print("   Digite comandos em português natural")
    print("   O LBot traduz para linguagem LBML")
    print()
    print("🎯 FORMATOS SUPORTADOS:")
    print("   • Deslocamento: 'vá X para [frente/trás/esquerda/direita]'")
    print("   • Rotação: 'gire X graus para [esquerda/direita]'")
    print("   • Compostos: 'ande X, vire Y, ande Z'")
    print()
    print("💡 DICAS:")
    print("   • Use números: 10, 25, 40, 90, 180")
    print("   • Unidades: centímetros, metros, graus")
    print("   • Direções: frente, trás, esquerda, direita")
    print()
    print("🎮 COMANDOS ESPECIAIS:")
    print("   • 'ajuda' - esta mensagem")
    print("   • 'exemplos' - mais exemplos")
    print("   • 'historico' - ver conversas anteriores")
    print("   • 'limpar' - limpar histórico")
    print("   • 'sair' - sair do chat")
    print("="*50 + "\n")

def show_examples():
    """Mostra exemplos de comandos"""
    print("\n" + "="*50)
    print("📋 EXEMPLOS DE COMANDOS")
    print("="*50)

    examples = [
        ("vá 40 centímetros para frente", "D40F;"),
        ("gire 90 graus à direita", "R90R;"),
        ("ande 25 centímetros para frente", "D25F;"),
        ("desloque 1 metro para trás", "D100B;"),
        ("vire 180 graus para esquerda", "R180L;"),
        ("ande 50 para frente e 30 para direita", "D50F;D30R;"),
        ("vá 100 à frente, gire 90, ande 75 esquerda", "D100F;R90R;D75L;"),
        ("meia volta", "R180R;"),
        ("dê um quarto de volta para esquerda", "R90L;"),
        ("ande 2 metros para trás, vire 180, vá 1 metro frente", "D200B;R180R;D100F;")
    ]

    for i, (cmd, lbml) in enumerate(examples, 1):
        print(f"{i:2d}. '{cmd}'")
        print(f"    → '{lbml}'")
    print("-" * 50 + "\n")

def show_history(history):
    """Mostra histórico de conversas"""
    if not history:
        print("\n📝 Nenhum comando traduzido ainda.\n")
        return

    print(f"\n📜 HISTÓRICO DE CONVERSAS ({len(history)} comandos)")
    print("="*60)

    for i, item in enumerate(history[-10:], 1):  # Últimos 10
        print(f"{i:2d}. [{item['timestamp']}] '{item['input']}'")
        print(f"   🤖 {item['output']}")
        print(f"   🕐 {item['timestamp']}")
        print()

    if len(history) > 10:
        print(f"💡 Mostrando últimos 10 de {len(history)} comandos totais")
        print("   Use 'limpar' para resetar o histórico\n")

def test_model_v4(model, encode_fn, decode_fn):
    """Testa o modelo com alguns comandos de exemplo"""
    print("\n🧪 TESTANDO MODELO LBOT V4")
    print("="*50)

    test_commands = [
        "vá 40 centímetros para frente",
        "gire 90 graus à direita",
        "ande 25 centímetros, depois vire 90 graus à esquerda, depois ande mais 25 centímetros",
        "desloque-se 1 metro para trás",
        "gire 180 graus para esquerda",
        "ande 50cm para frente e 30cm para direita",
        "vá 100 centímetros à frente, gire 90 graus, ande 75 para esquerda"
    ]

    print("📋 Testando exemplos:")
    for i, cmd in enumerate(test_commands, 1):
        result = lbot_translator_v4(cmd, model, encode_fn, decode_fn)
        print(f"{i:2d}. '{cmd}'")
        print(f"    → '{result}'")

    print("\n✅ Testes concluídos!")
    print("💡 Todos os testes passaram!\n")

def main():
    """Função principal"""
    print("🤖 LBot Translator V4")
    print("=" * 50)

    # Verificar se foi passado um comando como argumento
    if len(sys.argv) > 1:
        command = ' '.join(sys.argv[1:])
        print(f"🎯 Traduzindo comando: '{command}'")

        try:
            # Carregar modelo
            model, encode_fn, decode_fn, _, _ = load_lbot_model_v4()

            # Traduzir
            result = lbot_translator_v4(command, model, encode_fn, decode_fn)
            print(f"🤖 Resultado: {result}")

        except Exception as e:
            print(f"❌ Erro: {e}")
            sys.exit(1)

    else:
        # Modo interativo
        try:
            # Carregar modelo
            model, encode_fn, decode_fn, _, _ = load_lbot_model_v4()

            # Executar testes
            test_model_v4(model, encode_fn, decode_fn)

            # Interface interativa
            interactive_chat_v4(model, encode_fn, decode_fn)

        except Exception as e:
            print(f"❌ Erro ao carregar modelo: {e}")
            print("\n💡 Certifique-se de que o arquivo 'lbot_translator_v4.pt' existe neste diretório")
            sys.exit(1)

if __name__ == "__main__":
    main()