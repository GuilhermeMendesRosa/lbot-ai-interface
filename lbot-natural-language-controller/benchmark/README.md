# 📊 Benchmark LBot V5 vs V5.1 (RASA)

Comparação sistemática entre o modelo baseline (V5) e a versão com Relational-Aware Self-Attention (V5.1).

---

## 📁 Estrutura

```
benchmark/
├── benchmark_v5_vs_v5-1.py          # Script principal de benchmark
├── benchmark_test_set.txt            # 342 casos de teste balanceados
├── benchmark_results.md              # Relatório gerado automaticamente
├── generate_charts.py                # Gera gráficos para apresentação
├── presentation_charts/              # Gráficos PNG para slides
│   ├── 01_accuracy_comparison.png
│   ├── 02_category_performance.png
│   ├── 03_accuracy_gains.png
│   ├── 04_accuracy_vs_time.png
│   ├── 05_computational_cost.png
│   ├── 06_disagreement_analysis.png
│   └── 07_executive_scorecard.png
└── README.md                         # Este arquivo
```

---

## 🚀 Como Usar

### 1. Executar Benchmark

```bash
cd lbot-natural-language-controller
python3 benchmark/benchmark_v5_vs_v5-1.py
```

**Saída:**
- `benchmark_results.md` - Relatório detalhado em Markdown
- Console - Resumo executivo com métricas principais

### 2. Gerar Gráficos

```bash
python3 benchmark/generate_charts.py
```

**Saída:**
- 7 gráficos PNG em `presentation_charts/`
- Resolução 300 DPI (pronto para impressão)

---

## 📊 Resultados Resumidos

| Métrica | V5 | V5.1 (RASA) | Diferença |
|---------|---:|------------:|----------:|
| **Acurácia Geral** | 61.11% | 62.57% | **+1.46%** ✅ |
| **Compostos (3 ações)** | 32.50% | 37.50% | **+5.00%** ✅ |
| **Tempo de Inferência** | 500ms | 689ms | **+38%** ⚠️ |

**Conclusão:** RASA melhora comandos complexos mas aumenta latência.

---

## 📋 Test Set

- **Total:** 342 comandos
- **Distribuição:**
  - 38.6% deslocamentos simples
  - 36.3% rotações simples
  - 13.5% compostos (2 ações)
  - 11.7% compostos (3 ações)

**Formato:**
```
Entrada: vá 40 centímetros para frente | Saída: D40F;
Entrada: gire 90 graus para direita | Saída: R90R;
```

---

## 🎯 Gráficos Disponíveis

1. **01_accuracy_comparison.png** - Comparação de acurácia geral (barras)
2. **02_category_performance.png** - Performance por categoria (agrupado)
3. **03_accuracy_gains.png** - Delta de ganhos/perdas (barras)
4. **04_accuracy_vs_time.png** - Trade-off acurácia vs latência (scatter)
5. **05_computational_cost.png** - Custo computacional (tempo + parâmetros)
6. **06_disagreement_analysis.png** - Distribuição de desacordos (pizza)
7. **07_executive_scorecard.png** - Resumo executivo (tabela visual)

---

## 🔬 Documentação Completa

Ver: **`../RASA_FINAL_REPORT.md`**

Inclui:
- Arquitetura detalhada do RASA
- Implementação PyTorch
- Correções aplicadas
- Análise de trade-offs
- Recomendações de uso
- Trabalhos futuros

---

## 📦 Dependências

```bash
pip install torch numpy matplotlib seaborn
```

---

**Última atualização:** 22 de Novembro de 2025  
**Benchmark executado em:** CPU (compatível com GPU)
