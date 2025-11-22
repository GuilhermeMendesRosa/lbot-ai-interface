"""
Gera gráficos profissionais para apresentação do RASA
Requer: matplotlib, seaborn, numpy
"""

import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from pathlib import Path

# Configurar estilo
sns.set_style("whitegrid")
plt.rcParams['figure.facecolor'] = 'white'
plt.rcParams['font.size'] = 12
plt.rcParams['font.family'] = 'sans-serif'

# Criar diretório de saída
output_dir = Path("benchmark/presentation_charts")
output_dir.mkdir(exist_ok=True, parents=True)

# Dados do benchmark
v5_accuracy = 61.11
v5_1_accuracy = 62.57
v5_time = 500.17
v5_1_time = 688.67
v5_params = 10.7
v5_1_params = 14.3

# Dados por categoria
categories = ['Deslocamentos\nSimples', 'Rotações\nSimples', 'Compostos\n(2 ações)', 'Compostos\n(3 ações)']
v5_scores = [44.70, 100.00, 28.26, 32.50]
v5_1_scores = [46.97, 100.00, 28.26, 37.50]

# ============================================================================
# GRÁFICO 1: Comparação de Acurácia Geral
# ============================================================================
fig, ax = plt.subplots(figsize=(10, 6))

models = ['V5\n(Baseline)', 'V5.1\n(RASA)']
accuracies = [v5_accuracy, v5_1_accuracy]
colors = ['#3498db', '#2ecc71']

bars = ax.bar(models, accuracies, color=colors, width=0.5, edgecolor='black', linewidth=1.5)

# Adicionar valores no topo das barras
for bar, acc in zip(bars, accuracies):
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height + 0.5,
            f'{acc:.2f}%',
            ha='center', va='bottom', fontsize=16, fontweight='bold')

# Adicionar linha de diferença
ax.annotate('', xy=(1, v5_1_accuracy), xytext=(1, v5_accuracy),
            arrowprops=dict(arrowstyle='<->', color='red', lw=2))
ax.text(1.15, (v5_accuracy + v5_1_accuracy) / 2, 
        f'+{v5_1_accuracy - v5_accuracy:.2f}%\nganho',
        fontsize=12, color='red', fontweight='bold', va='center')

ax.set_ylabel('Acurácia (%)', fontsize=14, fontweight='bold')
ax.set_title('Comparação de Acurácia Geral: V5 vs V5.1 (RASA)', 
             fontsize=16, fontweight='bold', pad=20)
ax.set_ylim(0, 70)
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig(output_dir / '01_accuracy_comparison.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 1 salvo: 01_accuracy_comparison.png")
plt.close()

# ============================================================================
# GRÁFICO 2: Acurácia por Categoria (Lado a Lado)
# ============================================================================
fig, ax = plt.subplots(figsize=(14, 7))

x = np.arange(len(categories))
width = 0.35

bars1 = ax.bar(x - width/2, v5_scores, width, label='V5', 
               color='#3498db', edgecolor='black', linewidth=1.5)
bars2 = ax.bar(x + width/2, v5_1_scores, width, label='V5.1 (RASA)', 
               color='#2ecc71', edgecolor='black', linewidth=1.5)

# Adicionar valores no topo
for bars in [bars1, bars2]:
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height + 1,
                f'{height:.1f}%',
                ha='center', va='bottom', fontsize=11, fontweight='bold')

# Destacar melhoria em Compostos 3 ações
ax.annotate('', xy=(3 + width/2, 37.5), xytext=(3 - width/2, 32.5),
            arrowprops=dict(arrowstyle='<->', color='red', lw=2.5))
ax.text(3, 35, '+5.0%', fontsize=14, color='red', 
        fontweight='bold', ha='center',
        bbox=dict(boxstyle='round,pad=0.5', facecolor='yellow', alpha=0.7))

ax.set_ylabel('Acurácia (%)', fontsize=14, fontweight='bold')
ax.set_xlabel('Categoria de Comando', fontsize=14, fontweight='bold')
ax.set_title('Desempenho por Categoria: Onde RASA Melhora?', 
             fontsize=16, fontweight='bold', pad=20)
ax.set_xticks(x)
ax.set_xticklabels(categories, fontsize=12)
ax.legend(fontsize=12, loc='upper right')
ax.set_ylim(0, 110)
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig(output_dir / '02_category_performance.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 2 salvo: 02_category_performance.png")
plt.close()

# ============================================================================
# GRÁFICO 3: Delta de Acurácia (Ganhos/Perdas)
# ============================================================================
fig, ax = plt.subplots(figsize=(12, 6))

deltas = [v5_1_scores[i] - v5_scores[i] for i in range(len(categories))]
colors_delta = ['#2ecc71' if d > 0 else '#95a5a6' for d in deltas]

bars = ax.bar(categories, deltas, color=colors_delta, edgecolor='black', linewidth=1.5)

# Adicionar valores
for bar, delta in zip(bars, deltas):
    height = bar.get_height()
    if height != 0:
        ax.text(bar.get_x() + bar.get_width()/2., height + 0.2 if height > 0 else height - 0.2,
                f'{delta:+.2f}%',
                ha='center', va='bottom' if height > 0 else 'top', 
                fontsize=13, fontweight='bold')

ax.axhline(y=0, color='black', linestyle='-', linewidth=2)
ax.set_ylabel('Ganho de Acurácia (pontos percentuais)', fontsize=14, fontweight='bold')
ax.set_xlabel('Categoria de Comando', fontsize=14, fontweight='bold')
ax.set_title('Ganhos do RASA por Categoria (V5.1 - V5)', 
             fontsize=16, fontweight='bold', pad=20)
ax.set_ylim(-1, 6)
ax.grid(axis='y', alpha=0.3)

# Adicionar anotação
ax.text(3, 4.5, '🎯 RASA brilha\nem sequências\ncomplexas!', 
        fontsize=11, ha='center', color='darkgreen', fontweight='bold',
        bbox=dict(boxstyle='round,pad=0.8', facecolor='lightgreen', alpha=0.8))

plt.tight_layout()
plt.savefig(output_dir / '03_accuracy_gains.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 3 salvo: 03_accuracy_gains.png")
plt.close()

# ============================================================================
# GRÁFICO 4: Trade-off Acurácia vs Tempo
# ============================================================================
fig, ax = plt.subplots(figsize=(10, 8))

# Scatter plot
ax.scatter([v5_time], [v5_accuracy], s=500, color='#3498db', 
           edgecolor='black', linewidth=2, label='V5', zorder=3)
ax.scatter([v5_1_time], [v5_1_accuracy], s=500, color='#2ecc71', 
           edgecolor='black', linewidth=2, label='V5.1 (RASA)', zorder=3)

# Anotações
ax.annotate('V5\n(rápido)', xy=(v5_time, v5_accuracy), 
            xytext=(v5_time - 50, v5_accuracy - 1.5),
            fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#3498db', alpha=0.7, edgecolor='black'))

ax.annotate('V5.1 (RASA)\n(mais preciso)', xy=(v5_1_time, v5_1_accuracy), 
            xytext=(v5_1_time + 50, v5_1_accuracy + 1),
            fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.5', facecolor='#2ecc71', alpha=0.7, edgecolor='black'))

# Setas mostrando trade-off
ax.annotate('', xy=(v5_1_time, v5_accuracy), xytext=(v5_time, v5_accuracy),
            arrowprops=dict(arrowstyle='->', color='red', lw=2))
ax.text((v5_time + v5_1_time) / 2, v5_accuracy - 0.5, 
        f'+{v5_1_time - v5_time:.0f}ms\n(+38%)', 
        fontsize=11, color='red', fontweight='bold', ha='center')

ax.annotate('', xy=(v5_1_time, v5_1_accuracy), xytext=(v5_1_time, v5_accuracy),
            arrowprops=dict(arrowstyle='->', color='green', lw=2))
ax.text(v5_1_time + 40, (v5_accuracy + v5_1_accuracy) / 2, 
        f'+{v5_1_accuracy - v5_accuracy:.2f}%', 
        fontsize=11, color='green', fontweight='bold', ha='left')

ax.set_xlabel('Tempo Médio de Inferência (ms)', fontsize=14, fontweight='bold')
ax.set_ylabel('Acurácia (%)', fontsize=14, fontweight='bold')
ax.set_title('Trade-off: Acurácia vs Latência', 
             fontsize=16, fontweight='bold', pad=20)
ax.legend(fontsize=12, loc='lower right')
ax.grid(True, alpha=0.3)
ax.set_xlim(450, 750)
ax.set_ylim(60, 64)

plt.tight_layout()
plt.savefig(output_dir / '04_accuracy_vs_time.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 4 salvo: 04_accuracy_vs_time.png")
plt.close()

# ============================================================================
# GRÁFICO 5: Comparação de Recursos (Tempo e Parâmetros)
# ============================================================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Subplot 1: Tempo
models = ['V5', 'V5.1']
times = [v5_time, v5_1_time]
colors = ['#3498db', '#e74c3c']

bars = ax1.bar(models, times, color=colors, edgecolor='black', linewidth=1.5)
for bar, time in zip(bars, times):
    height = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2., height + 10,
            f'{time:.0f}ms',
            ha='center', va='bottom', fontsize=14, fontweight='bold')

ax1.set_ylabel('Tempo de Inferência (ms)', fontsize=13, fontweight='bold')
ax1.set_title('(A) Latência: +38% mais lento', fontsize=14, fontweight='bold')
ax1.set_ylim(0, 800)
ax1.grid(axis='y', alpha=0.3)

# Subplot 2: Parâmetros
params = [v5_params, v5_1_params]
colors = ['#3498db', '#e74c3c']

bars = ax2.bar(models, params, color=colors, edgecolor='black', linewidth=1.5)
for bar, param in zip(bars, params):
    height = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2., height + 0.3,
            f'{param:.1f}M',
            ha='center', va='bottom', fontsize=14, fontweight='bold')

ax2.set_ylabel('Parâmetros (Milhões)', fontsize=13, fontweight='bold')
ax2.set_title('(B) Tamanho: +33% maior', fontsize=14, fontweight='bold')
ax2.set_ylim(0, 16)
ax2.grid(axis='y', alpha=0.3)

fig.suptitle('Custo Computacional do RASA', fontsize=16, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig(output_dir / '05_computational_cost.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 5 salvo: 05_computational_cost.png")
plt.close()

# ============================================================================
# GRÁFICO 6: Análise de Desacordos
# ============================================================================
fig, ax = plt.subplots(figsize=(10, 7))

disagreement_labels = ['Ambos errados\n(127 casos)', 
                       'V5.1 certo,\nV5 errado\n(6 casos)', 
                       'V5 certo,\nV5.1 errado\n(1 caso)']
disagreement_values = [127, 6, 1]
colors = ['#95a5a6', '#2ecc71', '#e74c3c']
explode = (0, 0.1, 0.05)

wedges, texts, autotexts = ax.pie(disagreement_values, labels=disagreement_labels, 
                                    autopct='%1.1f%%', startangle=90,
                                    colors=colors, explode=explode,
                                    textprops={'fontsize': 12, 'fontweight': 'bold'},
                                    wedgeprops={'edgecolor': 'black', 'linewidth': 1.5})

for autotext in autotexts:
    autotext.set_color('white')
    autotext.set_fontsize(14)

ax.set_title('Distribuição de Desacordos (91 casos totais)\nBalanço: +5 acertos para V5.1', 
             fontsize=14, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig(output_dir / '06_disagreement_analysis.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 6 salvo: 06_disagreement_analysis.png")
plt.close()

# ============================================================================
# GRÁFICO 7: Resumo - Scorecard Visual
# ============================================================================
fig, ax = plt.subplots(figsize=(12, 8))
ax.axis('off')

# Título
ax.text(0.5, 0.95, 'RASA Scorecard: Resumo Executivo', 
        fontsize=20, fontweight='bold', ha='center', transform=ax.transAxes)

# Métricas principais
metrics = [
    ('Acurácia Geral', f'{v5_accuracy:.2f}%', f'{v5_1_accuracy:.2f}%', '+1.46%', 'green'),
    ('Compostos (3 ações)', f'{v5_scores[3]:.2f}%', f'{v5_1_scores[3]:.2f}%', '+5.00%', 'green'),
    ('Deslocamentos', f'{v5_scores[0]:.2f}%', f'{v5_1_scores[0]:.2f}%', '+2.27%', 'green'),
    ('Tempo de Inferência', f'{v5_time:.0f}ms', f'{v5_1_time:.0f}ms', '+38%', 'red'),
    ('Parâmetros', f'{v5_params:.1f}M', f'{v5_1_params:.1f}M', '+33%', 'red'),
]

y_start = 0.85
y_step = 0.14

# Cabeçalho
ax.text(0.15, y_start, 'Métrica', fontsize=13, fontweight='bold', ha='center')
ax.text(0.35, y_start, 'V5', fontsize=13, fontweight='bold', ha='center')
ax.text(0.55, y_start, 'V5.1 (RASA)', fontsize=13, fontweight='bold', ha='center')
ax.text(0.80, y_start, 'Diferença', fontsize=13, fontweight='bold', ha='center')

# Linha horizontal
ax.plot([0.05, 0.95], [y_start - 0.02, y_start - 0.02], 'k-', lw=2, transform=ax.transAxes)

# Dados
for i, (metric, v5_val, v5_1_val, diff, color) in enumerate(metrics):
    y_pos = y_start - (i + 1) * y_step
    
    # Linha de fundo alternada
    if i % 2 == 0:
        ax.add_patch(plt.Rectangle((0.05, y_pos - 0.05), 0.9, 0.11, 
                                   facecolor='lightgray', alpha=0.3, 
                                   transform=ax.transAxes, zorder=0))
    
    ax.text(0.15, y_pos, metric, fontsize=12, ha='center', va='center')
    ax.text(0.35, y_pos, v5_val, fontsize=12, ha='center', va='center')
    ax.text(0.55, y_pos, v5_1_val, fontsize=12, ha='center', va='center', fontweight='bold')
    ax.text(0.80, y_pos, diff, fontsize=13, ha='center', va='center', 
            color=color, fontweight='bold')

# Conclusão
conclusion_y = 0.08
ax.text(0.5, conclusion_y, '✅ Conclusão: RASA melhora acurácia em comandos complexos (+5%),\nmas aumenta custo computacional (+38% tempo, +33% parâmetros)', 
        fontsize=12, ha='center', va='center', 
        bbox=dict(boxstyle='round,pad=1', facecolor='lightyellow', edgecolor='black', linewidth=2),
        transform=ax.transAxes, style='italic')

plt.savefig(output_dir / '07_executive_scorecard.png', dpi=300, bbox_inches='tight')
print(f"✅ Gráfico 7 salvo: 07_executive_scorecard.png")
plt.close()

print(f"\n{'='*60}")
print(f"✅ TODOS OS GRÁFICOS GERADOS COM SUCESSO!")
print(f"{'='*60}")
print(f"📁 Local: {output_dir.absolute()}")
print(f"📊 Total: 7 gráficos prontos para apresentação")
print(f"\nLista de arquivos:")
for i in range(1, 8):
    print(f"  {i}. {list(output_dir.glob(f'0{i}_*.png'))[0].name}")
