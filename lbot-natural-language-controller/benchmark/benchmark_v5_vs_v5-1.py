#!/usr/bin/env python3
"""
LBot V5 vs V5.1 (RASA) Benchmark Comparison
============================================

Compares the performance of LBot V5 (baseline GPT) vs V5.1 (with RASA)
using the trained models: lbot_translator_v5.pt and lbot_translator_v5-1.pt

Metrics:
- Accuracy (overall and by category)
- Inference time
- Error analysis
- RASA relation matrix visualization (V5.1 only)

Usage:
    python benchmark_v5_vs_v5-1.py
    
Requirements:
    - torch
    - numpy
    - matplotlib
    - seaborn (optional, for better visualizations)
    - lbot_translator_v5.pt
    - lbot_translator_v5-1.pt
    - benchmark_test_set.txt
"""

import torch
import torch.nn as nn
from torch.nn import functional as F
import math
import numpy as np
import os
import time
from dataclasses import dataclass
from collections import defaultdict
import json

try:
    import matplotlib.pyplot as plt
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False
    print("⚠️  Warning: matplotlib not available. Visualizations will be skipped.")

try:
    import seaborn as sns
    SEABORN_AVAILABLE = True
except ImportError:
    SEABORN_AVAILABLE = False


# ============================================================================
# MODEL DEFINITIONS
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
    """Standard causal self-attention (used in both V5 and V5.1)"""
    
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


class RelationalSelfAttention(nn.Module):
    """Relational-Aware Self-Attention (RASA) - V5.1 only"""
    
    def __init__(self, config):
        super().__init__()
        self.n_head = config.n_head
        self.n_embd = config.n_embd
        self.dropout = config.dropout
        
        # Projections for Q, K, V
        self.q_rel = nn.Linear(config.n_embd, config.n_embd, bias=config.bias)
        self.k_rel = nn.Linear(config.n_embd, config.n_embd, bias=config.bias)
        self.v_rel = nn.Linear(config.n_embd, config.n_embd, bias=config.bias)
        self.c_proj = nn.Linear(config.n_embd, config.n_embd, bias=config.bias)
        
        # Relation bias matrix [vocab_size x vocab_size]
        # This learns relations between all token pairs
        self.relation_bias = nn.Parameter(torch.randn(config.vocab_size, config.vocab_size) * 0.02)
        
        # Learnable scale for relation bias (prevents over-amplification)
        self.relation_scale = nn.Parameter(torch.tensor(0.1))
        
        # Dropout
        self.attn_dropout = nn.Dropout(config.dropout)
        self.resid_dropout = nn.Dropout(config.dropout)
        self.dropout_layer = nn.Dropout(config.dropout)
        
        # Causal mask
        self.register_buffer("bias", torch.tril(torch.ones(config.block_size, config.block_size))
                           .view(1, 1, config.block_size, config.block_size))

    def forward(self, x, input_ids=None):
        B, T, C = x.size()
        
        # Q, K, V projections
        q = self.q_rel(x).view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        k = self.k_rel(x).view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        v = self.v_rel(x).view(B, T, self.n_head, C // self.n_head).transpose(1, 2)
        
        # Standard attention scores
        att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(k.size(-1)))
        
        # Add relational bias if input_ids provided
        if input_ids is not None:
            # Get pairwise relation bias for current tokens
            rel_bias = self.relation_bias[input_ids.unsqueeze(-1), input_ids.unsqueeze(-2)]
            # Scale the bias using learnable parameter with sigmoid
            rel_bias = rel_bias * torch.sigmoid(self.relation_scale)
            # Apply dropout to bias
            rel_bias = self.dropout_layer(rel_bias)
            # Add to attention scores (broadcast across heads)
            att = att + rel_bias.unsqueeze(1)
        
        # Apply causal mask
        att = att.masked_fill(self.bias[:,:,:T,:T] == 0, float('-inf'))
        att = F.softmax(att, dim=-1)
        att = self.attn_dropout(att)
        
        # Apply attention to values
        y = att @ v
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        y = self.resid_dropout(self.c_proj(y))
        
        return y


class MLP(nn.Module):
    """Feedforward network"""
    
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


class BlockV5(nn.Module):
    """Transformer block for V5 (standard GPT)"""
    
    def __init__(self, config):
        super().__init__()
        self.ln_1 = nn.LayerNorm(config.n_embd)
        self.attn = CausalSelfAttention(config)
        self.ln_2 = nn.LayerNorm(config.n_embd)
        self.mlp = MLP(config)

    def forward(self, x, input_ids=None):
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x


class BlockV51(nn.Module):
    """Transformer block for V5.1 (with RASA)"""
    
    def __init__(self, config):
        super().__init__()
        self.ln_1 = nn.LayerNorm(config.n_embd)
        self.attn = CausalSelfAttention(config)
        
        # RASA layer with its own layer norm (matching trained model)
        self.ln_rel = nn.LayerNorm(config.n_embd)
        self.rasa = RelationalSelfAttention(config)
        
        self.ln_2 = nn.LayerNorm(config.n_embd)
        self.mlp = MLP(config)

    def forward(self, x, input_ids=None):
        # Causal self-attention
        x = x + self.attn(self.ln_1(x))
        # Relational self-attention (RASA)
        x = x + self.rasa(self.ln_rel(x), input_ids=input_ids)
        # MLP
        x = x + self.mlp(self.ln_2(x))
        return x


class GPTV5(nn.Module):
    """GPT model for V5 (baseline)"""
    
    def __init__(self, config):
        super().__init__()
        self.config = config

        self.transformer = nn.ModuleDict(dict(
            wte = nn.Embedding(config.vocab_size, config.n_embd),
            wpe = nn.Embedding(config.block_size, config.n_embd),
            drop = nn.Dropout(config.dropout),
            h = nn.ModuleList([BlockV5(config) for _ in range(config.n_layer)]),
            ln_f = nn.LayerNorm(config.n_embd),
        ))
        self.lm_head = nn.Linear(config.n_embd, config.vocab_size, bias=False)
        self.transformer.wte.weight = self.lm_head.weight

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


class GPTV51(nn.Module):
    """GPT model for V5.1 (with RASA)"""
    
    def __init__(self, config):
        super().__init__()
        self.config = config

        self.transformer = nn.ModuleDict(dict(
            wte = nn.Embedding(config.vocab_size, config.n_embd),
            wpe = nn.Embedding(config.block_size, config.n_embd),
            drop = nn.Dropout(config.dropout),
            h = nn.ModuleList([BlockV51(config) for _ in range(config.n_layer)]),
            ln_f = nn.LayerNorm(config.n_embd),
        ))
        self.lm_head = nn.Linear(config.n_embd, config.vocab_size, bias=False)
        self.transformer.wte.weight = self.lm_head.weight

    def forward(self, idx, targets=None):
        device = idx.device
        b, t = idx.size()
        pos = torch.arange(0, t, dtype=torch.long, device=device)

        tok_emb = self.transformer.wte(idx)
        pos_emb = self.transformer.wpe(pos)
        x = self.transformer.drop(tok_emb + pos_emb)
        
        for block in self.transformer.h:
            x = block(x, input_ids=idx)
        
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
# MODEL LOADERS
# ============================================================================

class LBotModel:
    """Base class for LBot models"""
    
    def __init__(self, model_path, model_class, version):
        self.version = version
        self.model_path = model_path
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        print(f"\n🔄 Loading {version} from {model_path}...")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        # Load checkpoint
        checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
        
        # Extract vocabulary
        self.stoi = checkpoint['stoi']
        self.itos = checkpoint['itos']
        
        # Recreate model
        config = checkpoint['config']
        self.model = model_class(config)
        self.model.load_state_dict(checkpoint['model'])
        self.model.eval()
        
        # Move to device
        if self.device == 'cuda':
            self.model = self.model.cuda()
            print(f"✅ {version} loaded on GPU")
        else:
            print(f"✅ {version} loaded on CPU")
        
        # Model info
        params = sum(p.numel() for p in self.model.parameters())
        print(f"📊 Parameters: {params:,}")
        print(f"📊 Vocabulary: {len(self.stoi)} characters")
    
    def encode(self, text):
        """Convert text to token indices"""
        return [self.stoi[c] for c in text]
    
    def decode(self, tokens):
        """Convert token indices to text"""
        return ''.join([self.itos[i] for i in tokens])
    
    def translate(self, command, temperature=0.05, max_tokens=80):
        """Translate Portuguese command to LBML"""
        # Prepare input
        input_text = f"{command.strip()} ->"
        input_ids = torch.tensor(self.encode(input_text), dtype=torch.long).unsqueeze(0)
        
        if self.device == 'cuda':
            input_ids = input_ids.cuda()
        
        # Generate
        start_time = time.time()
        with torch.no_grad():
            generated = self.model.generate(
                input_ids,
                max_new_tokens=max_tokens,
                temperature=temperature,
                top_k=5
            )
        inference_time = time.time() - start_time
        
        # Decode and extract result
        full_result = self.decode(generated[0].tolist())
        
        if "->" in full_result:
            parts = full_result.split("->", 1)
            if len(parts) > 1:
                lbot_command = parts[1].strip().split('\n')[0].strip()
                # Clean: keep only valid LBML characters
                cleaned = ''.join(c for c in lbot_command if c.isdigit() or c in 'DRFBL;')
                
                if cleaned and (cleaned[0] in 'DR'):
                    return cleaned, inference_time
        
        return "ERRO", inference_time


# ============================================================================
# TEST SET LOADER
# ============================================================================

def load_test_set(filepath='benchmark_test_set.txt'):
    """Load benchmark test set with ground truth"""
    print(f"\n📋 Loading test set from {filepath}...")
    
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Test set not found: {filepath}")
    
    test_cases = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('#') or line.startswith('='):
                continue
            
            # Parse: Entrada: <cmd> | Saída: <lbml>
            if 'Entrada:' in line and 'Saída:' in line:
                parts = line.split('|')
                if len(parts) == 2:
                    entrada = parts[0].replace('Entrada:', '').strip()
                    saida = parts[1].replace('Saída:', '').strip()
                    
                    # Categorize
                    category = categorize_command(saida)
                    
                    test_cases.append({
                        'input': entrada,
                        'expected': saida,
                        'category': category
                    })
    
    print(f"✅ Loaded {len(test_cases)} test cases")
    
    # Count by category
    categories = defaultdict(int)
    for tc in test_cases:
        categories[tc['category']] += 1
    
    print(f"\n📊 Test set distribution:")
    for cat, count in sorted(categories.items()):
        print(f"   • {cat}: {count} ({count/len(test_cases)*100:.1f}%)")
    
    return test_cases


def categorize_command(lbml_code):
    """Categorize LBML command by complexity"""
    actions = lbml_code.count(';')
    
    if actions == 1:
        if lbml_code.startswith('D'):
            return 'Simple Displacement'
        elif lbml_code.startswith('R'):
            return 'Simple Rotation'
    elif actions == 2:
        return 'Compound (2 actions)'
    elif actions == 3:
        return 'Compound (3 actions)'
    
    return 'Other'


# ============================================================================
# EVALUATION
# ============================================================================

def evaluate_model(model, test_cases):
    """Evaluate model on test set"""
    print(f"\n🧪 Evaluating {model.version}...")
    
    results = []
    correct = 0
    total_time = 0
    
    category_stats = defaultdict(lambda: {'correct': 0, 'total': 0})
    
    for i, tc in enumerate(test_cases):
        predicted, inference_time = model.translate(tc['input'])
        total_time += inference_time
        
        is_correct = (predicted == tc['expected'])
        if is_correct:
            correct += 1
            category_stats[tc['category']]['correct'] += 1
        
        category_stats[tc['category']]['total'] += 1
        
        results.append({
            'input': tc['input'],
            'expected': tc['expected'],
            'predicted': predicted,
            'correct': is_correct,
            'category': tc['category'],
            'inference_time': inference_time
        })
        
        # Progress
        if (i + 1) % 50 == 0:
            print(f"   Progress: {i+1}/{len(test_cases)} ({(i+1)/len(test_cases)*100:.1f}%)")
    
    # Calculate metrics
    accuracy = correct / len(test_cases) * 100
    avg_time = total_time / len(test_cases) * 1000  # ms
    
    # Category accuracies
    category_accuracies = {}
    for cat, stats in category_stats.items():
        category_accuracies[cat] = stats['correct'] / stats['total'] * 100
    
    print(f"\n✅ {model.version} Evaluation Complete")
    print(f"   • Overall Accuracy: {accuracy:.2f}%")
    print(f"   • Avg Inference Time: {avg_time:.2f}ms")
    print(f"   • Correct: {correct}/{len(test_cases)}")
    
    return {
        'version': model.version,
        'accuracy': accuracy,
        'correct': correct,
        'total': len(test_cases),
        'avg_inference_time': avg_time,
        'total_inference_time': total_time,
        'category_accuracies': category_accuracies,
        'results': results
    }


def compare_models(v5_results, v51_results):
    """Compare results between V5 and V5.1"""
    print("\n" + "="*80)
    print("📊 BENCHMARK COMPARISON: V5 vs V5.1 (RASA)")
    print("="*80)
    
    # Overall comparison
    print("\n🎯 Overall Performance:")
    print(f"{'Metric':<30} {'V5':>15} {'V5.1':>15} {'Difference':>15}")
    print("-" * 80)
    print(f"{'Accuracy':<30} {v5_results['accuracy']:>14.2f}% {v51_results['accuracy']:>14.2f}% {v51_results['accuracy']-v5_results['accuracy']:>+14.2f}%")
    print(f"{'Correct Predictions':<30} {v5_results['correct']:>15} {v51_results['correct']:>15} {v51_results['correct']-v5_results['correct']:>+15}")
    print(f"{'Avg Inference Time (ms)':<30} {v5_results['avg_inference_time']:>14.2f} {v51_results['avg_inference_time']:>14.2f} {v51_results['avg_inference_time']-v5_results['avg_inference_time']:>+14.2f}")
    
    # Category comparison
    print("\n📂 Performance by Category:")
    print(f"{'Category':<30} {'V5':>15} {'V5.1':>15} {'Difference':>15}")
    print("-" * 80)
    
    all_categories = sorted(set(list(v5_results['category_accuracies'].keys()) + 
                                list(v51_results['category_accuracies'].keys())))
    
    for cat in all_categories:
        v5_acc = v5_results['category_accuracies'].get(cat, 0)
        v51_acc = v51_results['category_accuracies'].get(cat, 0)
        diff = v51_acc - v5_acc
        print(f"{cat:<30} {v5_acc:>14.2f}% {v51_acc:>14.2f}% {diff:>+14.2f}%")
    
    # Disagreements analysis
    print("\n🔍 Disagreements Analysis:")
    disagreements = []
    both_wrong = []
    v5_only_correct = []
    v51_only_correct = []
    
    for v5_res, v51_res in zip(v5_results['results'], v51_results['results']):
        if v5_res['predicted'] != v51_res['predicted']:
            disagreements.append({
                'input': v5_res['input'],
                'expected': v5_res['expected'],
                'v5': v5_res['predicted'],
                'v51': v51_res['predicted'],
                'category': v5_res['category']
            })
        
        if not v5_res['correct'] and not v51_res['correct']:
            both_wrong.append(v5_res)
        elif v5_res['correct'] and not v51_res['correct']:
            v5_only_correct.append(v5_res)
        elif not v5_res['correct'] and v51_res['correct']:
            v51_only_correct.append(v51_res)
    
    print(f"   • Total disagreements: {len(disagreements)}")
    print(f"   • Both models wrong: {len(both_wrong)}")
    print(f"   • V5 correct, V5.1 wrong: {len(v5_only_correct)}")
    print(f"   • V5.1 correct, V5 wrong: {len(v51_only_correct)}")
    
    return {
        'disagreements': disagreements,
        'both_wrong': both_wrong,
        'v5_only_correct': v5_only_correct,
        'v51_only_correct': v51_only_correct
    }


# ============================================================================
# VISUALIZATION
# ============================================================================

def visualize_comparison(v5_results, v51_results, output_dir='benchmark_results'):
    """Create visualizations comparing V5 and V5.1"""
    
    if not MATPLOTLIB_AVAILABLE:
        print("\n⚠️  Skipping visualizations (matplotlib not available)")
        return
    
    os.makedirs(output_dir, exist_ok=True)
    print(f"\n📊 Generating visualizations in {output_dir}/...")
    
    # 1. Overall accuracy comparison
    fig, ax = plt.subplots(figsize=(10, 6))
    models = ['V5', 'V5.1 (RASA)']
    accuracies = [v5_results['accuracy'], v51_results['accuracy']]
    colors = ['#3498db', '#e74c3c']
    
    bars = ax.bar(models, accuracies, color=colors, alpha=0.7, edgecolor='black')
    ax.set_ylabel('Accuracy (%)', fontsize=12)
    ax.set_title('Overall Accuracy: V5 vs V5.1 (RASA)', fontsize=14, fontweight='bold')
    ax.set_ylim([0, 100])
    ax.grid(axis='y', alpha=0.3)
    
    # Add value labels
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}%',
                ha='center', va='bottom', fontsize=11, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/overall_accuracy.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"   ✅ Saved: overall_accuracy.png")
    
    # 2. Category comparison
    categories = sorted(v5_results['category_accuracies'].keys())
    v5_cat_acc = [v5_results['category_accuracies'][cat] for cat in categories]
    v51_cat_acc = [v51_results['category_accuracies'][cat] for cat in categories]
    
    x = np.arange(len(categories))
    width = 0.35
    
    fig, ax = plt.subplots(figsize=(14, 6))
    bars1 = ax.bar(x - width/2, v5_cat_acc, width, label='V5', color='#3498db', alpha=0.7, edgecolor='black')
    bars2 = ax.bar(x + width/2, v51_cat_acc, width, label='V5.1 (RASA)', color='#e74c3c', alpha=0.7, edgecolor='black')
    
    ax.set_xlabel('Category', fontsize=12)
    ax.set_ylabel('Accuracy (%)', fontsize=12)
    ax.set_title('Accuracy by Command Category', fontsize=14, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(categories, rotation=15, ha='right')
    ax.legend(fontsize=11)
    ax.set_ylim([0, 100])
    ax.grid(axis='y', alpha=0.3)
    
    # Add value labels
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height:.1f}',
                    ha='center', va='bottom', fontsize=9)
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/category_accuracy.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"   ✅ Saved: category_accuracy.png")
    
    # 3. Inference time comparison
    fig, ax = plt.subplots(figsize=(10, 6))
    models = ['V5', 'V5.1 (RASA)']
    times = [v5_results['avg_inference_time'], v51_results['avg_inference_time']]
    colors = ['#2ecc71', '#f39c12']
    
    bars = ax.bar(models, times, color=colors, alpha=0.7, edgecolor='black')
    ax.set_ylabel('Average Inference Time (ms)', fontsize=12)
    ax.set_title('Inference Speed Comparison', fontsize=14, fontweight='bold')
    ax.grid(axis='y', alpha=0.3)
    
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}ms',
                ha='center', va='bottom', fontsize=11, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/inference_time.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"   ✅ Saved: inference_time.png")
    
    print(f"\n✅ All visualizations saved to {output_dir}/")


def visualize_rasa_relations(model_v51, output_dir='benchmark_results'):
    """Visualize RASA relation bias matrix from V5.1"""
    
    if not MATPLOTLIB_AVAILABLE:
        return
    
    print(f"\n🧠 Analyzing RASA relation matrix...")
    
    # Extract relation bias from first RASA layer
    relation_bias = None
    for block in model_v51.model.transformer.h:
        if hasattr(block, 'rasa'):
            relation_bias = block.rasa.relation_bias.detach().cpu().numpy()
            relation_scale = torch.sigmoid(block.rasa.relation_scale).item()
            break
    
    if relation_bias is None:
        print("   ⚠️  Could not extract RASA relation matrix")
        return
    
    print(f"   • Relation scale: {relation_scale:.4f}")
    print(f"   • Relation matrix shape: {relation_bias.shape}")
    
    # Get character mappings
    chars = [model_v51.itos[i] for i in range(len(model_v51.itos))]
    
    # Focus on important characters for LBML
    important_chars = ['D', 'R', 'F', 'B', 'L', ';', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                       'f', 'r', 'e', 'n', 't', 'á', 's', 'q', 'u', 'd', 'i', 'a']
    
    # Find indices
    important_indices = []
    important_labels = []
    for char in important_chars:
        if char in model_v51.stoi:
            idx = model_v51.stoi[char]
            important_indices.append(idx)
            important_labels.append(char)
    
    if len(important_indices) < 2:
        print("   ⚠️  Not enough important characters found")
        return
    
    # Extract submatrix
    sub_matrix = relation_bias[np.ix_(important_indices, important_indices)]
    
    # Create heatmap
    fig, ax = plt.subplots(figsize=(16, 14))
    
    if SEABORN_AVAILABLE:
        sns.heatmap(sub_matrix, xticklabels=important_labels, yticklabels=important_labels,
                   cmap='RdBu_r', center=0, annot=False, fmt='.3f',
                   cbar_kws={'label': 'Relation Strength'}, ax=ax)
    else:
        im = ax.imshow(sub_matrix, cmap='RdBu_r', aspect='auto')
        ax.set_xticks(np.arange(len(important_labels)))
        ax.set_yticks(np.arange(len(important_labels)))
        ax.set_xticklabels(important_labels)
        ax.set_yticklabels(important_labels)
        plt.colorbar(im, ax=ax, label='Relation Strength')
    
    ax.set_title(f'RASA Relation Matrix (scale={relation_scale:.4f})', 
                fontsize=14, fontweight='bold', pad=20)
    ax.set_xlabel('Token', fontsize=12)
    ax.set_ylabel('Token', fontsize=12)
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/rasa_relation_matrix.png', dpi=300, bbox_inches='tight')
    plt.close()
    print(f"   ✅ Saved: rasa_relation_matrix.png")


# ============================================================================
# REPORT GENERATION
# ============================================================================

def generate_markdown_report(v5_results, v51_results, comparison, output_file='benchmark_results.md'):
    """Generate comprehensive markdown report"""
    
    print(f"\n📝 Generating report: {output_file}...")
    
    report = []
    
    # Header
    report.append("# LBot Benchmark: V5 vs V5.1 (RASA)")
    report.append("")
    report.append(f"**Generated:** {time.strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")
    report.append("## 📋 Executive Summary")
    report.append("")
    
    # Summary
    acc_diff = v51_results['accuracy'] - v5_results['accuracy']
    time_diff = v51_results['avg_inference_time'] - v5_results['avg_inference_time']
    
    if acc_diff > 0:
        summary = f"✅ **V5.1 (RASA) shows improvement:** +{acc_diff:.2f}% accuracy"
    elif acc_diff < 0:
        summary = f"⚠️ **V5.1 (RASA) shows degradation:** {acc_diff:.2f}% accuracy"
    else:
        summary = f"➖ **V5.1 (RASA) shows no change:** {acc_diff:.2f}% accuracy"
    
    report.append(summary)
    report.append("")
    
    if time_diff > 0:
        report.append(f"- Inference time increased by {time_diff:.2f}ms ({time_diff/v5_results['avg_inference_time']*100:.1f}% slower)")
    else:
        report.append(f"- Inference time decreased by {abs(time_diff):.2f}ms ({abs(time_diff)/v5_results['avg_inference_time']*100:.1f}% faster)")
    
    report.append("")
    report.append("---")
    report.append("")
    
    # Overall Performance
    report.append("## 🎯 Overall Performance")
    report.append("")
    report.append("| Metric | V5 | V5.1 (RASA) | Difference |")
    report.append("|--------|---:|------------:|-----------:|")
    report.append(f"| **Accuracy** | {v5_results['accuracy']:.2f}% | {v51_results['accuracy']:.2f}% | {acc_diff:+.2f}% |")
    report.append(f"| **Correct Predictions** | {v5_results['correct']}/{v5_results['total']} | {v51_results['correct']}/{v51_results['total']} | {v51_results['correct']-v5_results['correct']:+d} |")
    report.append(f"| **Avg Inference Time** | {v5_results['avg_inference_time']:.2f}ms | {v51_results['avg_inference_time']:.2f}ms | {time_diff:+.2f}ms |")
    report.append("")
    
    # Category Performance
    report.append("## 📂 Performance by Category")
    report.append("")
    report.append("| Category | V5 | V5.1 (RASA) | Difference |")
    report.append("|----------|---:|------------:|-----------:|")
    
    all_categories = sorted(set(list(v5_results['category_accuracies'].keys()) + 
                                list(v51_results['category_accuracies'].keys())))
    
    for cat in all_categories:
        v5_acc = v5_results['category_accuracies'].get(cat, 0)
        v51_acc = v51_results['category_accuracies'].get(cat, 0)
        diff = v51_acc - v5_acc
        report.append(f"| {cat} | {v5_acc:.2f}% | {v51_acc:.2f}% | {diff:+.2f}% |")
    
    report.append("")
    
    # Disagreements
    report.append("## 🔍 Disagreements Analysis")
    report.append("")
    report.append(f"- **Total disagreements:** {len(comparison['disagreements'])}")
    report.append(f"- **Both models wrong:** {len(comparison['both_wrong'])}")
    report.append(f"- **V5 correct, V5.1 wrong:** {len(comparison['v5_only_correct'])}")
    report.append(f"- **V5.1 correct, V5 wrong:** {len(comparison['v51_only_correct'])}")
    report.append("")
    
    # Examples where V5.1 improved
    if comparison['v51_only_correct']:
        report.append("### ✅ Examples where V5.1 (RASA) succeeded but V5 failed")
        report.append("")
        report.append("| Input | Expected | V5 Prediction | V5.1 Prediction | Category |")
        report.append("|-------|----------|---------------|-----------------|----------|")
        
        for example in comparison['v51_only_correct'][:10]:  # Show up to 10
            report.append(f"| {example['input']} | `{example['expected']}` | `{example['predicted']}` | `{example['expected']}` | {example['category']} |")
        
        report.append("")
    
    # Examples where V5.1 regressed
    if comparison['v5_only_correct']:
        report.append("### ⚠️ Examples where V5 succeeded but V5.1 (RASA) failed")
        report.append("")
        report.append("| Input | Expected | V5 Prediction | V5.1 Prediction | Category |")
        report.append("|-------|----------|---------------|-----------------|----------|")
        
        for example in comparison['v5_only_correct'][:10]:  # Show up to 10
            v51_pred = [r for r in v51_results['results'] if r['input'] == example['input']][0]['predicted']
            report.append(f"| {example['input']} | `{example['expected']}` | `{example['expected']}` | `{v51_pred}` | {example['category']} |")
        
        report.append("")
    
    # Visualizations
    report.append("## 📊 Visualizations")
    report.append("")
    report.append("### Overall Accuracy Comparison")
    report.append("![Overall Accuracy](benchmark_results/overall_accuracy.png)")
    report.append("")
    report.append("### Accuracy by Category")
    report.append("![Category Accuracy](benchmark_results/category_accuracy.png)")
    report.append("")
    report.append("### Inference Time Comparison")
    report.append("![Inference Time](benchmark_results/inference_time.png)")
    report.append("")
    report.append("### RASA Relation Matrix (V5.1 only)")
    report.append("![RASA Relations](benchmark_results/rasa_relation_matrix.png)")
    report.append("")
    
    # Conclusion
    report.append("## 💡 Conclusion")
    report.append("")
    
    if acc_diff > 2:
        report.append("✅ **RASA significantly improves accuracy**, especially on compound commands.")
        report.append("The relational awareness helps the model understand spatial relationships better.")
    elif acc_diff > 0:
        report.append("✅ **RASA provides marginal improvement** in accuracy.")
        report.append(f"The +{acc_diff:.2f}% gain may justify the additional {time_diff:.2f}ms inference overhead.")
    elif acc_diff > -2:
        report.append("➖ **RASA shows minimal impact** on accuracy.")
        report.append("The additional complexity may not be justified for this task.")
    else:
        report.append("⚠️ **RASA degrades performance**.")
        report.append("The relational bias may be interfering with the model's predictions.")
    
    report.append("")
    report.append("---")
    report.append("")
    report.append("*Report generated by benchmark_v5_vs_v5-1.py*")
    
    # Write report
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))
    
    print(f"✅ Report saved: {output_file}")


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("="*80)
    print("🤖 LBOT BENCHMARK: V5 vs V5.1 (RASA)")
    print("="*80)
    
    # Check for model files
    base_dir = os.path.dirname(os.path.abspath(__file__))
    v5_model_path = os.path.join(base_dir, 'lbot-v5', 'lbot_translator_v5.pt')
    v51_model_path = os.path.join(base_dir, 'lbot-v5.1', 'lbot_translator_v5-1.pt')
    test_set_path = os.path.join(base_dir, 'benchmark_test_set.txt')
    
    if not os.path.exists(v5_model_path):
        print(f"\n❌ Error: V5 model not found at {v5_model_path}")
        print("Please ensure you have trained the V5 model.")
        return
    
    if not os.path.exists(v51_model_path):
        print(f"\n❌ Error: V5.1 model not found at {v51_model_path}")
        print("Please ensure you have trained the V5.1 model.")
        return
    
    if not os.path.exists(test_set_path):
        print(f"\n❌ Error: Test set not found at {test_set_path}")
        print("Please ensure benchmark_test_set.txt is in the current directory.")
        return
    
    # Load models
    model_v5 = LBotModel(v5_model_path, GPTV5, "V5")
    model_v51 = LBotModel(v51_model_path, GPTV51, "V5.1 (RASA)")
    
    # Load test set
    test_cases = load_test_set(test_set_path)
    
    # Evaluate models
    v5_results = evaluate_model(model_v5, test_cases)
    v51_results = evaluate_model(model_v51, test_cases)
    
    # Compare
    comparison = compare_models(v5_results, v51_results)
    
    # Generate visualizations
    output_dir = os.path.join(base_dir, 'benchmark_results')
    visualize_comparison(v5_results, v51_results, output_dir)
    visualize_rasa_relations(model_v51, output_dir)
    
    # Generate report
    report_path = os.path.join(base_dir, 'benchmark_results.md')
    generate_markdown_report(v5_results, v51_results, comparison, report_path)
    
    print("\n" + "="*80)
    print("✅ BENCHMARK COMPLETE!")
    print("="*80)
    print("\nResults saved:")
    print("   • benchmark_results.md (comprehensive report)")
    print("   • benchmark_results/ (visualizations)")
    print("\n")


if __name__ == "__main__":
    main()
