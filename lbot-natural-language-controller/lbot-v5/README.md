# LBot V5 - Optimized Training

LBot V5 is an optimized version designed for faster training with a cleaner, more focused dataset.

## 🎯 Key Improvements over V4

| Metric | V4 | V5 | Improvement |
|--------|----|----|-------------|
| **Dataset Size** | 165,000 examples | 40,000 examples | 76% smaller |
| **Model Parameters** | ~3.2M | ~1.5M | 53% smaller |
| **Training Iterations** | 8,000 | 5,000 | 37% fewer |
| **Block Size** | 256 tokens | 128 tokens | 50% smaller |
| **Training Time** | ~45-60 min | ~15-20 min | 3x faster |
| **Max Actions** | Up to 5 | Up to 3 | More focused |

## 📊 Dataset Distribution

- **15,000 Simple Displacement** (37.5%) - Commands like "vá 40 centímetros para frente"
- **15,000 Simple Rotation** (37.5%) - Commands like "gire 90 graus para direita"
- **10,000 Compound** (25.0%) - Commands with 2-3 actions

**Total: 40,000 examples** in `lbot_dataset_v5.txt` (2.9MB)

## 🎯 Design Philosophy

### Focused Vocabulary
- **4 displacement verbs:** vá, ande, mova-se, desloque-se
- **4 rotation verbs:** gire, vire, rotacione, faça uma rotação de
- Standardized direction phrases
- No linguistic variations that add noise

### Standardized Units
- ✅ **Centimeters only** (1-100cm range)
- ✅ **Standard angles** (30°, 45°, 60°, 90°, 120°, 135°, 150°, 180°)
- ❌ No unit conversions (meters, millimeters)
- ❌ No decimal values

### Clean Commands
- ❌ No ambiguous examples
- ❌ No intentional typos
- ❌ No overly complex 4-5 action chains
- ✅ Maximum 3 actions per compound command

## 📁 Files

### 1. `generate_dataset_v5.py`
Dataset generator script that creates 40,000 balanced examples.

**Usage:**
```bash
python3 generate_dataset_v5.py
```

**Output:** `lbot_dataset_v5.txt` (2.9MB, 120,000 lines)

### 2. `lbot_training_v5.ipynb`
Google Colab training notebook with optimized configuration.

**Model Configuration:**
- Block size: 128 tokens (reduced from 256)
- Layers: 6 (reduced from 8)
- Embedding dimension: 384 (reduced from 512)
- Attention heads: 6 (reduced from 8)
- Dropout: 0.2 (increased for regularization)
- Learning rate: 1e-3 (increased for faster convergence)
- Training iterations: 5,000 (reduced from 8,000)

**Training Steps:**
1. Upload `lbot_dataset_v5.txt` to Colab
2. Run all cells sequentially
3. Download trained `lbot_translator_v5.pt` model
4. Estimated training time: ~15-20 minutes on Colab GPU

### 3. `lbot_v5.py`
Standalone Python script for runtime translation.

**Usage:**

Single command mode:
```bash
python3 lbot_v5.py "ande 40 centímetros para frente"
# Output: D40F;
```

Interactive mode:
```bash
python3 lbot_v5.py
# Then type commands at the prompt
```

**Requirements:**
- PyTorch
- NumPy
- `lbot_translator_v5.pt` (trained model file)

### 4. `lbot_dataset_v5.txt`
Generated dataset file (2.9MB, 40,000 examples).

**Format:**
```
Entrada: <Portuguese command>
Saída: <LBML code>
<blank line>
```

## 🔄 LBML V4 Format (unchanged)

The output format remains the same as V4:

### Displacement Commands
- Format: `D<value><direction>;`
- Directions: `F` (frente), `B` (trás), `L` (esquerda), `R` (direita)
- Example: `D40F;` = Move 40cm forward

### Rotation Commands
- Format: `R<value><direction>;`
- Directions: `L` (left/anti-horário), `R` (right/horário)
- Example: `R90R;` = Rotate 90° right

### Compound Commands
- Multiple actions separated by semicolons
- Example: `D40F;R90R;D20L;` = Move 40cm forward, rotate 90° right, move 20cm left

## 🚀 Quick Start

### Step 1: Generate Dataset
```bash
cd lbot-natural-language-controller/lbot-v5
python3 generate_dataset_v5.py
```

### Step 2: Train Model (Google Colab)
1. Open `lbot_training_v5.ipynb` in Google Colab
2. Upload `lbot_dataset_v5.txt` when prompted
3. Run all cells
4. Download `lbot_translator_v5.pt`

### Step 3: Use the Trained Model
```bash
python3 lbot_v5.py "vá 50 centímetros para frente"
# Output: D50F;
```

## 📊 Expected Performance

- **Accuracy:** ~88-92% (slightly lower than V4's 93-96% due to smaller model)
- **Training time:** ~15-20 minutes on Colab GPU (vs ~45-60 min for V4)
- **Inference speed:** Similar to V4 (~50ms per command)
- **Model size:** ~6MB (vs ~13MB for V4)

## 🔧 Customization

### Adjust Dataset Size
Edit `generate_dataset_v5.py`:
```python
# Change these values in generate_full_dataset()
displacement = generate_simple_displacement(20000)  # Increase to 20k
rotation = generate_simple_rotation(20000)          # Increase to 20k
compound = generate_compound_commands(10000)        # Keep at 10k
```

### Adjust Training Duration
Edit training cell in `lbot_training_v5.ipynb`:
```python
max_iters = 7000  # Increase from 5000 for better accuracy
```

### Adjust Model Size
Edit GPTConfig in `lbot_training_v5.ipynb`:
```python
@dataclass
class GPTConfig:
    block_size: int = 128
    n_layer: int = 8           # Increase for larger model
    n_embd: int = 512          # Increase for more capacity
    # ...
```

## ⚠️ Known Limitations

1. **Lower accuracy than V4** - Tradeoff for faster training
2. **Max 3 actions** - Cannot handle 4-5 action compound commands
3. **Centimeters only** - No automatic unit conversions
4. **Limited vocabulary** - Only 4 verbs per type

## 🤝 Comparison: When to Use V4 vs V5

**Use V4 if:**
- Need highest possible accuracy (93-96%)
- Have long compound commands (4-5 actions)
- Need unit conversions (meters, millimeters)
- Training time is not a concern

**Use V5 if:**
- Training speed is important
- Commands are simple (1-3 actions)
- Only use centimeters and degrees
- Want smaller model size
- Training on free Colab tier

## 📝 Version History

- **V5** (Current) - Optimized for speed with 40k examples
- **V4** - Full-featured with 165k examples
- **V3** - Original implementation

---

Created: November 2025
Model: GPT-based transformer with ~1.5M parameters
