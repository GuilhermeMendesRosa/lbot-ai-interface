# 🏆 LBot V5 vs V5.1 (RASA) Benchmark

Benchmark comparativo entre o modelo LBot V5 (GPT baseline) e V5.1 (com Relational-Aware Self-Attention).

## 📋 Visão Geral

Este benchmark compara:
- **LBot V5**: GPT padrão (~1.5M parâmetros)
- **LBot V5.1 (RASA)**: GPT + Relational-Aware Self-Attention (~1.7M parâmetros)

### Métricas Avaliadas

1. **Acurácia Geral**: Porcentagem de traduções corretas
2. **Acurácia por Categoria**:
   - Comandos simples de deslocamento (D)
   - Comandos simples de rotação (R)
   - Comandos compostos (2 ações)
   - Comandos compostos (3 ações)
3. **Tempo de Inferência**: Velocidade média de tradução
4. **Análise de Erros**: Onde cada modelo falhou
5. **Matriz de Relações RASA**: Visualização das relações aprendidas (V5.1)

## 📦 Arquivos

```
lbot-natural-language-controller/
├── benchmark_test_set.txt          # 400 casos de teste balanceados
├── benchmark_v5_vs_v5-1.py         # Script principal de benchmark
├── benchmark_results.md            # Relatório em Markdown (gerado)
├── benchmark_results/              # Visualizações (gerado)
│   ├── overall_accuracy.png
│   ├── category_accuracy.png
│   ├── inference_time.png
│   └── rasa_relation_matrix.png
├── lbot-v5/
│   └── lbot_translator_v5.pt       # Modelo V5 treinado (necessário)
└── lbot-v5.1/
    └── lbot_translator_v5-1.pt     # Modelo V5.1 treinado (necessário)
```

## 🚀 Como Executar

### 1. Pré-requisitos

Certifique-se de ter os modelos treinados:
- ✅ `lbot-v5/lbot_translator_v5.pt`
- ✅ `lbot-v5.1/lbot_translator_v5-1.pt`

Se não tiver, treine os modelos primeiro:
```bash
# V5: Execute lbot-v5/lbot_training_v5.ipynb no Google Colab
# V5.1: Execute lbot-v5.1/lbot_training_v5-1.ipynb no Google Colab
```

### 2. Instalar Dependências

```bash
pip install torch numpy matplotlib seaborn
```

**Nota**: `matplotlib` e `seaborn` são opcionais (apenas para visualizações)

### 3. Executar Benchmark

```bash
cd lbot-natural-language-controller
python benchmark_v5_vs_v5-1.py
```

### 4. Tempo de Execução

- CPU: ~5-10 minutos para 400 casos de teste
- GPU: ~2-3 minutos

### 5. Resultados

O script gerará:
- ✅ `benchmark_results.md` - Relatório completo
- ✅ `benchmark_results/` - Diretório com gráficos

## 📊 Conjunto de Teste

O `benchmark_test_set.txt` contém **400 casos de teste** balanceados:

| Categoria | Quantidade | Porcentagem |
|-----------|------------|-------------|
| **Deslocamento Simples** | 150 | 37.5% |
| **Rotação Simples** | 150 | 37.5% |
| **Compostos (2 ações)** | 60 | 15.0% |
| **Compostos (3 ações)** | 40 | 10.0% |
| **TOTAL** | **400** | **100%** |

### Exemplos de Teste

**Simples - Deslocamento:**
```
Entrada: vá 40 centímetros para frente | Saída: D40F;
```

**Simples - Rotação:**
```
Entrada: gire 90 graus para direita | Saída: R90R;
```

**Composto - 2 ações:**
```
Entrada: vá 40 centímetros para frente e depois gire 90 graus para direita | Saída: D40F;R90R;
```

**Composto - 3 ações:**
```
Entrada: vá 30 centímetros para frente, gire 90 graus para direita e depois ande 20 centímetros para frente | Saída: D30F;R90R;D20F;
```

## 🔍 O que o Benchmark Analisa

### 1. Acurácia Geral
- Porcentagem de traduções **exatamente corretas**
- Comparação direta entre V5 e V5.1

### 2. Desempenho por Categoria
- Qual modelo é melhor em comandos simples?
- Qual modelo é melhor em comandos compostos?
- RASA ajuda em comandos com múltiplas direções?

### 3. Análise de Discordâncias
- Casos onde os modelos discordam
- Casos onde V5.1 acerta e V5 erra (ganho do RASA)
- Casos onde V5 acerta e V5.1 erra (regressão do RASA)
- Casos onde ambos erram

### 4. Tempo de Inferência
- V5.1 é mais lento? Quanto?
- O overhead do RASA vale a pena?

### 5. Matriz de Relações RASA (V5.1 apenas)
- Visualização das relações aprendidas
- Verifica se RASA aprendeu relações espaciais corretas:
  - "frente" ↔ `F`
  - "trás" ↔ `B`
  - "esquerda" ↔ `L`
  - "direita" ↔ `R`

## 📈 Métricas Esperadas

### Hipótese 1: RASA melhora comandos compostos
Se RASA funciona bem:
- ✅ Acurácia geral: V5.1 > V5 (+2-5%)
- ✅ Comandos simples: V5 ≈ V5.1
- ✅ Comandos compostos: V5.1 >> V5 (+3-5%)
- ⚠️ Tempo: V5.1 ~15-20% mais lento

### Hipótese 2: RASA não ajuda significativamente
Se RASA não tem impacto:
- ➖ Acurácia geral: V5 ≈ V5.1 (±1%)
- ➖ Comandos simples: V5 ≈ V5.1
- ➖ Comandos compostos: V5 ≈ V5.1
- ⚠️ Tempo: V5.1 mais lento sem benefício

### Hipótese 3: RASA prejudica performance
Se RASA causa problemas:
- ❌ Acurácia geral: V5.1 < V5 (-2% ou mais)
- ❌ Repetições triplicadas (bug conhecido)
- ❌ Matriz de relações sem padrão claro
- ⚠️ Tempo: V5.1 mais lento com pior acurácia

## 🔧 Personalização

### Adicionar mais casos de teste

Edite `benchmark_test_set.txt`:
```
Entrada: <seu comando> | Saída: <LBML esperado>
```

### Ajustar temperatura de inferência

Edite `benchmark_v5_vs_v5-1.py`:
```python
def translate(self, command, temperature=0.05, max_tokens=80):
    # Reduza temperature para mais determinístico
    # Aumente temperature para mais variação
```

### Mudar categoria de testes

Modifique função `categorize_command()` para adicionar novas categorias.

## 📊 Exemplo de Relatório

```markdown
# LBot Benchmark: V5 vs V5.1 (RASA)

## 📋 Executive Summary

✅ **V5.1 (RASA) shows improvement:** +3.25% accuracy

- Inference time increased by 4.2ms (18.5% slower)

## 🎯 Overall Performance

| Metric | V5 | V5.1 (RASA) | Difference |
|--------|---:|------------:|-----------:|
| **Accuracy** | 88.50% | 91.75% | +3.25% |
| **Correct Predictions** | 354/400 | 367/400 | +13 |
| **Avg Inference Time** | 22.7ms | 26.9ms | +4.2ms |

## 📂 Performance by Category

| Category | V5 | V5.1 (RASA) | Difference |
|----------|---:|------------:|-----------:|
| Simple Displacement | 96.67% | 97.33% | +0.66% |
| Simple Rotation | 95.33% | 96.00% | +0.67% |
| Compound (2 actions) | 85.00% | 90.00% | +5.00% |
| Compound (3 actions) | 75.00% | 82.50% | +7.50% |
```

## 🤝 Interpretando os Resultados

### ✅ RASA está funcionando se:
1. Acurácia em compostos > +3% vs V5
2. Matriz de relações mostra padrões espaciais claros
3. V5.1 corrige erros de direção do V5
4. Relational scale está entre 0.2-0.5

### ⚠️ RASA precisa ajustes se:
1. Acurácia similar ao V5 (±1%)
2. Matriz de relações sem padrão
3. Tempo muito maior sem ganho
4. Relational scale < 0.1 ou > 0.7

### ❌ RASA tem problemas se:
1. Acurácia pior que V5 (-2% ou mais)
2. Repetições triplicadas (ex: `D40F;D40F;D40F;`)
3. Matriz explodida ou colapsada
4. Muitos casos onde V5 acerta e V5.1 erra

## 📚 Referências

- **V5 README**: `lbot-v5/README.md`
- **V5.1 README**: `lbot-v5.1/README.md`
- **Training Notebooks**:
  - V5: `lbot-v5/lbot_training_v5.ipynb`
  - V5.1: `lbot-v5.1/lbot_training_v5-1.ipynb`

## 🐛 Troubleshooting

### Erro: Modelos não encontrados
```
❌ Error: V5 model not found at lbot-v5/lbot_translator_v5.pt
```
**Solução**: Treine os modelos primeiro nos notebooks do Google Colab

### Erro: Test set não encontrado
```
❌ Error: Test set not found at benchmark_test_set.txt
```
**Solução**: Execute o script no diretório `lbot-natural-language-controller/`

### Visualizações não geradas
```
⚠️  Warning: matplotlib not available. Visualizations will be skipped.
```
**Solução**: Instale matplotlib: `pip install matplotlib seaborn`

### Out of memory (GPU)
**Solução**: Execute em CPU (mais lento mas funciona):
```python
# O script detecta automaticamente e usa CPU
```

## 📞 Contato

Para dúvidas sobre o benchmark, consulte:
- READMEs dos modelos V5 e V5.1
- Código comentado em `benchmark_v5_vs_v5-1.py`

---

**Versão**: 1.0  
**Data**: Novembro 2025  
**Compatível com**: LBot V5 e V5.1
