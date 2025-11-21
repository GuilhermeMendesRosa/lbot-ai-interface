#!/usr/bin/env python3
"""
LBot V5 - Runtime Translator
=============================

Standalone script to load trained LBot V5 model and translate
Portuguese commands to LBML V4 format.

Usage:
    python lbot_v5.py "ande 40 centímetros para frente"
    # Output: D40F;

Or use interactively:
    python lbot_v5.py
    # Then type commands at the prompt

Requirements:
    - torch
    - numpy
    - lbot_translator_v5.pt (trained model file)
"""

import torch
import torch.nn as nn
from torch.nn import functional as F
import math
import sys
import os
from dataclasses import dataclass


# ============================================================================
# MODEL DEFINITION (Same as training notebook)
# ============================================================================

@dataclass
class GPTConfig:
    block_size: int = 128
    vocab_size: int = 70
    n_layer: int = 6
    n_head: int = 6
    n_embd: int = 384
    dropout: float = 0.2
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


# ============================================================================
# MODEL LOADING AND TRANSLATION
# ============================================================================

class LBotTranslator:
    """LBot V5 Translator - Portuguese to LBML"""
    
    def __init__(self, model_path='lbot_translator_v5.pt'):
        """
        Load trained model from checkpoint.
        
        Args:
            model_path: Path to the .pt model file
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model file not found: {model_path}\n"
                f"Please ensure 'lbot_translator_v5.pt' is in the current directory."
            )
        
        print(f"🔄 Loading model from {model_path}...")
        
        # Load checkpoint
        checkpoint = torch.load(model_path, map_location='cpu')
        
        # Extract vocabulary
        self.stoi = checkpoint['stoi']
        self.itos = checkpoint['itos']
        
        # Recreate model
        config = checkpoint['config']
        self.model = GPT(config)
        self.model.load_state_dict(checkpoint['model'])
        self.model.eval()
        
        # Move to GPU if available
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        if self.device == 'cuda':
            self.model = self.model.cuda()
            print(f"✅ Model loaded on GPU")
        else:
            print(f"✅ Model loaded on CPU")
        
        print(f"📊 Model info:")
        print(f"   • Vocabulary: {len(self.stoi)} characters")
        print(f"   • Parameters: {sum(p.numel() for p in self.model.parameters()):,}")
    
    def encode(self, text):
        """Convert text to token indices"""
        return [self.stoi[c] for c in text]
    
    def decode(self, tokens):
        """Convert token indices to text"""
        return ''.join([self.itos[i] for i in tokens])
    
    def translate(self, command, temperature=0.05, max_tokens=80):
        """
        Translate Portuguese command to LBML V4 format.
        
        Args:
            command: Portuguese command (e.g., "ande 40 centímetros para frente")
            temperature: Lower = more deterministic (default 0.05)
            max_tokens: Maximum tokens to generate (default 80)
        
        Returns:
            LBML command string (e.g., "D40F;")
        """
        # Prepare input
        input_text = f"{command.strip()} ->"
        input_ids = torch.tensor(self.encode(input_text), dtype=torch.long).unsqueeze(0)
        
        if self.device == 'cuda':
            input_ids = input_ids.cuda()
        
        # Generate
        with torch.no_grad():
            generated = self.model.generate(
                input_ids,
                max_new_tokens=max_tokens,
                temperature=temperature,
                top_k=5
            )
        
        # Decode and extract result
        full_result = self.decode(generated[0].tolist())
        
        if "->" in full_result:
            parts = full_result.split("->", 1)
            if len(parts) > 1:
                # Extract until first newline
                lbot_command = parts[1].strip().split('\n')[0].strip()
                
                # Clean: keep only valid LBML characters
                cleaned = ''.join(c for c in lbot_command if c.isdigit() or c in 'DRFBL;')
                
                # Validate basic format
                if cleaned and (cleaned[0] in 'DR'):
                    return cleaned
        
        return "ERRO"


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

def interactive_mode(translator):
    """Run interactive translation mode"""
    print("\n🤖 === LBOT V5 TRANSLATOR ===")
    print("Digite comandos em português ou 'sair' para terminar")
    print("Exemplos:")
    print("  • vá 40 centímetros para frente")
    print("  • gire 90 graus para direita")
    print("  • ande 25 centímetros para frente, depois vire 45 graus à esquerda")
    print()
    
    while True:
        try:
            command = input("🗣️  Comando: ").strip()
            
            if command.lower() in ['sair', 'exit', 'quit', '']:
                print("👋 Tchau!")
                break
            
            result = translator.translate(command)
            print(f"🤖 LBot: {result}\n")
            
        except KeyboardInterrupt:
            print("\n👋 Tchau!")
            break
        except Exception as e:
            print(f"❌ Erro: {e}\n")


def main():
    """Main entry point"""
    # Check if model file exists
    model_path = 'lbot_translator_v5.pt'
    
    try:
        # Load translator
        translator = LBotTranslator(model_path)
        
        # Check command line arguments
        if len(sys.argv) > 1:
            # Single command mode
            command = ' '.join(sys.argv[1:])
            result = translator.translate(command)
            print(result)
        else:
            # Interactive mode
            interactive_mode(translator)
    
    except FileNotFoundError as e:
        print(f"❌ {e}")
        print("\nPara treinar o modelo:")
        print("  1. Gere o dataset: python generate_dataset_v5.py")
        print("  2. Execute o notebook: lbot_training_v5.ipynb no Google Colab")
        print("  3. Faça download do lbot_translator_v5.pt")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
