
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torch.nn as nn
from torch.nn import functional as F
import math
import numpy as np
from dataclasses import dataclass
import uvicorn

# Suas classes originais (GPTConfig, CausalSelfAttention, etc.)
@dataclass
class GPTConfig:
    block_size: int = 128
    vocab_size: int = 50
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

# Funções de carregamento e tradução
def load_lbot_model(path='lbot_translator.pt'):
    checkpoint = torch.load(path, map_location='cpu', weights_only=False)
    stoi = checkpoint['stoi']
    itos = checkpoint['itos']

    def encode_text(s):
        return [stoi[c] for c in s]

    def decode_text(l):
        return ''.join([itos[i] for i in l])

    config = checkpoint['config']
    model = GPT(config)
    model.load_state_dict(checkpoint['model'])
    model.eval()

    return model, encode_text, decode_text, stoi, itos

def lbot_translator(command, model, encode, decode):
    input_text = f"{command.strip()} ->"
    input_ids = torch.tensor(encode(input_text), dtype=torch.long).unsqueeze(0)

    with torch.no_grad():
        generated = model.generate(
            input_ids,
            max_new_tokens=50,
            temperature=0.05,
            top_k=5
        )

    full_result = decode(generated[0].tolist())

    if "->" in full_result:
        parts = full_result.split("->", 1)
        if len(parts) > 1:
            lbot_command = parts[1].strip().split('\n')[0].strip()
            lbot_command = ''.join(c for c in lbot_command if c.isdigit() or c in 'FBLR')
            return lbot_command

    return "ERRO"

# === API REST COM CORS DESABILITADO ===
app = FastAPI(title="LBot Translator API", version="1.0.0")

# Configurar CORS para permitir todas as origens
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todas as origens
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos os métodos
    allow_headers=["*"],  # Permite todos os headers
)

# Modelos Pydantic
class TranslateRequest(BaseModel):
    command: str

# Variáveis globais para o modelo
model = None
encode_fn = None
decode_fn = None

@app.on_event("startup")
async def startup_event():
    """Carrega o modelo na inicialização da API"""
    global model, encode_fn, decode_fn
    try:
        model, encode_fn, decode_fn, _, _ = load_lbot_model()
        print("✅ Modelo LBot carregado com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao carregar modelo: {e}")
        raise e

@app.get("/")
async def health_check():
    """Endpoint de health check"""
    return {"status": "online"}

@app.post("/translate")
async def translate_command(request: TranslateRequest):
    """Traduz comando em português para LBot"""
    if model is None:
        raise HTTPException(status_code=503, detail="Modelo não carregado")

    try:
        lbot_command = lbot_translator(request.command, model, encode_fn, decode_fn)
        return {"result": lbot_command}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na tradução: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
