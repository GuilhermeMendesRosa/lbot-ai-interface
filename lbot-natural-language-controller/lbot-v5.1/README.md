# 🤖 LBot V5.1 - Relational-Aware Self-Attention (RASA)

## 📋 Visão Geral

O **LBot V5.1** é uma evolução do modelo V5 que adiciona **Relational-Aware Self-Attention (RASA)** para melhorar a tradução de comandos em português para LBML (LBot Movement Language), especialmente em comandos compostos com múltiplas direções espaciais.

## 🎯 Objetivo

Avaliar se adicionar **consciência relacional espacial** melhora a acurácia do modelo ao capturar explicitamente as relações entre:

- **Tokens de entrada** (português): "frente", "trás", "esquerda", "direita", "gire", "ande"
- **Tokens de saída** (LBML): `F`, `B`, `L`, `R`, `D`, `R`

## 🧠 O que é RASA?

**RASA (Relational-Aware Self-Attention)** é uma camada adicional de atenção que aprende **relações explícitas** entre pares de tokens usando uma **matriz de bias relacional**.

### Arquitetura

Cada bloco transformer V5.1 contém:

```
x → LayerNorm → CausalSelfAttention → residual
  → LayerNorm → RelationalSelfAttention (RASA) → residual  [NOVA!]
  → LayerNorm → MLP → residual
```

### Como Funciona

1. **Matriz de Bias Relacional**: `relation_bias[vocab_size, vocab_size]`
   - Aprende relações entre todos os pares de tokens do vocabulário
   - Valores positivos = tokens relacionados (ex: "frente" → `F`)
   - Valores negativos = tokens opostos (ex: "frente" → `B`)

2. **Attention Score Modificado**:
   ```python
   attention = (Q @ K^T) / sqrt(d_k) + relation_bias[i, j]
   ```
   - O bias relacional modifica os scores de atenção
   - Tokens relacionados recebem maior atenção
   - Tokens opostos recebem menor atenção

3. **Aprendizado**:
   - A matriz `relation_bias` é **treinável** (não pré-definida)
   - Atualizada via backpropagation durante treinamento
   - Aprende automaticamente relações do dataset

## 📊 Comparação: V5 vs V5.1

| Aspecto | V5 | V5.1 | Diferença |
|---------|----|----|-----------|
| **Arquitetura** | GPT padrão | GPT + RASA | +1 camada/bloco |
| **Parâmetros** | ~1.5M | ~1.7M | +15% (+200K) |
| **Dataset** | 40k exemplos | 40k exemplos | Idêntico |
| **Treinamento** | 15-20 min | 18-25 min | +20% tempo |
| **Hiperparâmetros** | Todos mantidos | Todos mantidos | Controle experimental |

### Mudanças Mínimas

- ✅ **Adicionado**: Camada `RelationalSelfAttention` após cada `CausalSelfAttention`
- ✅ **Mantido**: Dataset, learning rate, batch size, max_iters, dropout, etc.
- ✅ **Objetivo**: Isolar o efeito da RASA para comparação justa

## 🚀 Como Usar

### 1. Upload do Dataset

```python
# Faça upload do lbot_dataset_v5-1.txt (idêntico ao v5)
uploaded = files.upload()
```

### 2. Treinar o Modelo

Execute todas as células do notebook `lbot_training_v5-1.ipynb` no Google Colab:

1. Instalar dependências
2. Carregar dataset
3. Definir modelo com RASA
4. Treinar por 5000 iterações
5. Salvar modelo como `lbot_translator_v5-1.pt`

**Tempo esperado**: ~18-25 minutos em GPU T4 do Colab

### 3. Testar Traduções

```python
# Testar comando
result = lbot_translator("vá 30 centímetros para frente e depois gire 90 graus para direita")
print(result)  # Esperado: D30F;R90R;
```

### 4. Analisar Relações Aprendidas

```python
# Visualizar matriz de relações
analyze_relational_bias()
```

Isso mostra um heatmap das relações espaciais que a RASA aprendeu.

### 5. Comparar com V5

```python
# Executar testes de acurácia
accuracy, results = compare_models_performance()
```

Compare os resultados com V5 para avaliar ganho do RASA.

## 📈 Métricas Esperadas

### Acurácia por Tipo de Comando

| Tipo | V5 (baseline) | V5.1 (esperado) | Ganho |
|------|---------------|-----------------|-------|
| **Simples** (1 ação) | 95-98% | 95-98% | ~0% |
| **Compostos** (2 ações) | 85-90% | 88-93% | +2-3% |
| **Compostos** (3 ações) | 80-85% | 85-90% | +3-5% |

### Onde RASA Deve Ajudar

✅ **Comandos com múltiplas direções**:
- "vá frente e depois vire direita"
- "ande esquerda, gire direita, vá trás"

✅ **Sequências espaciais complexas**:
- Comandos onde ordem das direções importa
- Transições entre diferentes tipos de movimento

❌ **Comandos simples**:
- RASA não deve melhorar muito comandos de 1 ação
- Overhead de processamento sem benefício semântico

## 🔬 Análise das Relações

Após o treinamento, você pode visualizar quais relações a RASA aprendeu:

```python
analyze_relational_bias()
```

**Relações esperadas** (valores positivos):
- `D` ↔ `F`, `B`, `L`, `R` (deslocamento + direções)
- `R` ↔ `L`, `R` (rotação + direções)
- `0-9` ↔ `0-9` (dígitos adjacentes)

**Relações opostas** (valores negativos):
- `F` ↔ `B` (frente vs trás)
- `L` ↔ `R` (esquerda vs direita em alguns contextos)

## 📝 Dataset

O V5.1 usa o **mesmo dataset do V5** (`lbot_dataset_v5-1.txt`):

- **40,000 exemplos**
- **Formato**: `Entrada: <comando> -> Saída: <LBML>`
- **Distribuição**:
  - 37.5% comandos simples de deslocamento
  - 37.5% comandos simples de rotação
  - 25% comandos compostos (2-3 ações)

**Motivo**: Comparação justa entre V5 e V5.1 requer dataset idêntico.

## 🎯 Hipótese

**Se RASA funciona**, esperamos:

1. ✅ Melhor acurácia em comandos compostos (+2-5%)
2. ✅ Matriz `relation_bias` deve mostrar relações espaciais claras
3. ✅ Maior robustez em sequências com múltiplas direções
4. ⚠️ Overhead computacional aceitável (+15% parâmetros, +20% tempo)

**Se RASA não ajuda**:

1. ❌ Acurácia similar ou pior que V5
2. ❌ Matriz `relation_bias` não aprende padrões claros
3. ❌ Overfitting (val_loss maior que V5)
4. ❌ Overhead não justifica ganho mínimo

## 🔄 Workflow de Comparação

1. **Treinar V5** no `lbot_dataset_v5.txt`
2. **Treinar V5.1** no `lbot_dataset_v5-1.txt` (idêntico)
3. **Comparar métricas**:
   - Loss de validação
   - Acurácia geral
   - Acurácia por categoria (simples vs compostos)
4. **Analisar relações** aprendidas pela RASA
5. **Decidir**: RASA vale o overhead de +15% parâmetros?

## 📦 Arquivos

- `lbot_training_v5-1.ipynb` - Notebook de treinamento
- `lbot_dataset_v5-1.txt` - Dataset (idêntico ao V5)
- `lbot_translator_v5-1.pt` - Modelo treinado (gerado após treino)
- `README.md` - Este arquivo

## 🏗️ Arquitetura Detalhada

### GPTConfig

```python
block_size = 128    # Contexto de 128 tokens
vocab_size = 70     # Vocabulário de 70 caracteres
n_layer = 6         # 6 blocos transformer
n_head = 6          # 6 cabeças de atenção
n_embd = 384        # Dimensão de embedding 384
dropout = 0.2       # Dropout 0.2
```

### RelationalSelfAttention

```python
class RelationalSelfAttention:
    - q_rel, k_rel, v_rel: Projeções Q, K, V
    - relation_bias[vocab_size, vocab_size]: Matriz de relações
    - attention = (Q @ K^T) / sqrt(d_k) + relation_bias
    - output = softmax(attention) @ V
```

### Block

```python
class Block:
    x → LayerNorm → CausalSelfAttention → residual
      → LayerNorm → RelationalSelfAttention → residual
      → LayerNorm → MLP → residual
```

## 💡 Insights de Design

### Por que RASA pode ajudar?

1. **Relações espaciais são importantes**: "frente" e `F` devem estar semanticamente ligados
2. **Comandos compostos precisam contexto**: "vá frente e vire direita" = duas ações relacionadas
3. **Bias relacional = conhecimento prévio**: Ensina ao modelo que direções importam

### Por que após CausalSelfAttention?

- `CausalSelfAttention`: Captura dependências sequenciais (ordem dos tokens)
- `RelationalSelfAttention`: Captura relações semânticas (significado espacial)
- Combinar ambas = contexto sequencial + consciência espacial

### Por que matriz de bias aprendida?

- Não precisamos definir manualmente "frente" → `F`
- O modelo aprende automaticamente do dataset
- Mais flexível que regras hard-coded

## 🔧 Troubleshooting

### Modelo não converge

- Verifique learning rate (deve ser 1e-3)
- Aumente max_iters se necessário
- Verifique se dataset foi carregado corretamente

### Acurácia pior que V5

- RASA pode precisar mais iterações para convergir
- Tente aumentar dropout (0.2 → 0.25) para evitar overfitting
- Verifique se relation_bias está sendo atualizado (requer_grad=True)

### Out of memory

- Reduza batch_size (32 → 16)
- Use GPU com mais memória (Colab Pro)
- Reduza block_size se necessário (128 → 96)

## 📚 Referências

- **Base**: GPT-2 architecture (decoder-only transformer)
- **RASA**: Inspirado em relational reasoning em Graph Neural Networks
- **Dataset**: LBML V4 (LBot Movement Language Version 4)

## 📞 Contato

Para dúvidas ou sugestões sobre o modelo V5.1 com RASA, consulte o repositório principal do LBot.

---

**Versão**: 5.1  
**Data**: Novembro 2025  
**Status**: Experimental (comparação com V5 em andamento)
