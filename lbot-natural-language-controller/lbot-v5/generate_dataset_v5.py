#!/usr/bin/env python3
"""
LBot Dataset Generator V5 - Optimized Version
==============================================

Generates a clean, focused dataset (~40k examples) for faster training.

Key Improvements from V4:
- Reduced from 165k to ~40k examples (76% reduction)
- Only centimeters and degrees (no unit conversions)
- Maximum 3 actions per compound command (no 4-5 action chains)
- Simplified vocabulary (3-4 core verbs per type)
- Standardized direction phrases
- No ambiguous commands, decimals, or typos
- Better distribution balance

Distribution:
- 15,000 Simple Displacement (D) commands
- 15,000 Simple Rotation (R) commands
- 10,000 Compound commands (2-3 actions)
Total: 40,000 examples

LBML V4 Format:
- Displacement: D<value><direction>; (ex: D40F;)
- Rotation: R<value><direction>; (ex: R90R;)
- Compound: D40F;R90R;D20L;
"""

import random
import re


# ============================================================================
# VOCABULARY DEFINITIONS (Simplified from V4)
# ============================================================================

# Core verbs only (reduced from 16 to 4 for displacement)
DISPLACEMENT_VERBS = [
    "vá",
    "ande",
    "mova-se",
    "desloque-se"
]

# Core rotation verbs (reduced from 10 to 4)
ROTATION_VERBS = [
    "gire",
    "vire",
    "rotacione",
    "faça uma rotação de"
]

# Standardized direction phrases for displacement
DIRECTION_PHRASES = {
    'F': ['para frente', 'para a frente', 'à frente', 'adiante'],
    'B': ['para trás', 'para atrás', 'atrás'],
    'L': ['para esquerda', 'para a esquerda', 'à esquerda'],
    'R': ['para direita', 'para a direita', 'à direita']
}

# Standardized rotation direction phrases
ROTATION_DIRECTION_PHRASES = {
    'L': ['para esquerda', 'para a esquerda', 'à esquerda', 'sentido anti-horário'],
    'R': ['para direita', 'para a direita', 'à direita', 'sentido horário']
}

# Practical value ranges (most commonly used)
DISTANCE_VALUES_CM = [
    1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50,
    60, 70, 75, 80, 90, 100
]

# Standard angles only
ANGLE_VALUES = [30, 45, 60, 90, 120, 135, 150, 180]

# Compound command connectors (simplified)
CONNECTORS = [
    ", depois",
    ", em seguida",
    " e depois",
    "; depois",
    ", então"
]


# ============================================================================
# DATASET GENERATION FUNCTIONS
# ============================================================================

def generate_simple_displacement(count=15000):
    """
    Generate simple displacement commands.
    Format: D<value><direction>;
    
    Example: "ande 40 centímetros para frente" -> "D40F;"
    """
    examples = []
    directions = ['F', 'B', 'L', 'R']
    
    for _ in range(count):
        verb = random.choice(DISPLACEMENT_VERBS)
        value = random.choice(DISTANCE_VALUES_CM)
        direction_code = random.choice(directions)
        direction_phrase = random.choice(DIRECTION_PHRASES[direction_code])
        
        # Build natural language command
        # Format: "<verb> <value> centímetros <direction>"
        entrada = f"{verb} {value} centímetros {direction_phrase}"
        
        # Build LBML code
        saida = f"D{value}{direction_code};"
        
        examples.append((entrada, saida))
    
    return examples


def generate_simple_rotation(count=15000):
    """
    Generate simple rotation commands.
    Format: R<angle><direction>;
    
    Example: "gire 90 graus para direita" -> "R90R;"
    """
    examples = []
    directions = ['L', 'R']
    
    for _ in range(count):
        verb = random.choice(ROTATION_VERBS)
        angle = random.choice(ANGLE_VALUES)
        direction_code = random.choice(directions)
        direction_phrase = random.choice(ROTATION_DIRECTION_PHRASES[direction_code])
        
        # Build natural language command
        # Format: "<verb> <angle> graus <direction>"
        entrada = f"{verb} {angle} graus {direction_phrase}"
        
        # Build LBML code
        saida = f"R{angle}{direction_code};"
        
        examples.append((entrada, saida))
    
    return examples


def generate_compound_command(num_actions):
    """
    Generate a compound command with 2 or 3 actions.
    
    Args:
        num_actions: 2 or 3
    
    Returns:
        (entrada, saida) tuple
    """
    actions_pt = []
    actions_lbml = []
    
    for i in range(num_actions):
        # Alternate between displacement and rotation for variety
        if i % 2 == 0 or random.random() < 0.5:
            # Displacement
            verb = random.choice(DISPLACEMENT_VERBS)
            value = random.choice(DISTANCE_VALUES_CM)
            direction_code = random.choice(['F', 'B', 'L', 'R'])
            direction_phrase = random.choice(DIRECTION_PHRASES[direction_code])
            
            action_pt = f"{verb} {value} centímetros {direction_phrase}"
            action_lbml = f"D{value}{direction_code};"
        else:
            # Rotation
            verb = random.choice(ROTATION_VERBS)
            angle = random.choice(ANGLE_VALUES)
            direction_code = random.choice(['L', 'R'])
            direction_phrase = random.choice(ROTATION_DIRECTION_PHRASES[direction_code])
            
            action_pt = f"{verb} {angle} graus {direction_phrase}"
            action_lbml = f"R{angle}{direction_code};"
        
        actions_pt.append(action_pt)
        actions_lbml.append(action_lbml)
    
    # Join with connectors
    connector = random.choice(CONNECTORS)
    entrada = connector.join(actions_pt)
    
    # LBML just concatenates
    saida = ''.join(actions_lbml)
    
    return (entrada, saida)


def generate_compound_commands(count=10000):
    """
    Generate compound commands with 2-3 actions.
    
    Distribution:
    - 60% with 2 actions (6,000)
    - 40% with 3 actions (4,000)
    """
    examples = []
    
    # 60% with 2 actions
    two_action_count = int(count * 0.6)
    for _ in range(two_action_count):
        examples.append(generate_compound_command(2))
    
    # 40% with 3 actions
    three_action_count = count - two_action_count
    for _ in range(three_action_count):
        examples.append(generate_compound_command(3))
    
    return examples


def validate_lbml(lbml_code):
    """
    Validate LBML V4 format.
    
    Format: (D<num><FBLR>;|R<num><LR>;)+
    """
    pattern = r'^(D\d+[FBLR];|R\d+[LR];)+$'
    return re.match(pattern, lbml_code) is not None


def save_dataset(examples, filename='lbot_dataset_v5.txt'):
    """
    Save dataset in the standard format:
    Entrada: <command>
    Saída: <lbml>
    <blank line>
    """
    with open(filename, 'w', encoding='utf-8') as f:
        for entrada, saida in examples:
            # Validate LBML before saving
            if not validate_lbml(saida):
                print(f"⚠️  Invalid LBML: {saida} for '{entrada}'")
                continue
            
            f.write(f"Entrada: {entrada}\n")
            f.write(f"Saída: {saida}\n")
            f.write("\n")
    
    print(f"✅ Dataset saved to {filename}")


def generate_full_dataset():
    """
    Generate complete LBot V5 dataset.
    
    Total: ~40,000 examples
    - 15,000 simple displacement
    - 15,000 simple rotation
    - 10,000 compound (2-3 actions)
    """
    print("🤖 LBot Dataset Generator V5")
    print("=" * 50)
    print()
    
    all_examples = []
    
    # 1. Simple Displacement (15k)
    print("📝 Generating 15,000 simple displacement commands...")
    displacement = generate_simple_displacement(15000)
    all_examples.extend(displacement)
    print(f"   ✅ Generated {len(displacement):,} displacement examples")
    
    # 2. Simple Rotation (15k)
    print("📝 Generating 15,000 simple rotation commands...")
    rotation = generate_simple_rotation(15000)
    all_examples.extend(rotation)
    print(f"   ✅ Generated {len(rotation):,} rotation examples")
    
    # 3. Compound Commands (10k)
    print("📝 Generating 10,000 compound commands (2-3 actions)...")
    compound = generate_compound_commands(10000)
    all_examples.extend(compound)
    print(f"   ✅ Generated {len(compound):,} compound examples")
    
    # Shuffle all examples
    print("\n🔀 Shuffling dataset...")
    random.shuffle(all_examples)
    
    # Save to file
    print("💾 Saving dataset...")
    save_dataset(all_examples, 'lbot_dataset_v5.txt')
    
    # Statistics
    print("\n📊 Dataset Statistics:")
    print(f"   • Total examples: {len(all_examples):,}")
    print(f"   • Simple displacement: 15,000 (37.5%)")
    print(f"   • Simple rotation: 15,000 (37.5%)")
    print(f"   • Compound (2-3 actions): 10,000 (25.0%)")
    print()
    
    # Show sample examples
    print("📋 Sample Examples:")
    for i in range(5):
        entrada, saida = all_examples[i]
        print(f"   {i+1}. '{entrada}'")
        print(f"      → {saida}")
    
    print()
    print("✅ Dataset generation complete!")
    print(f"📁 File: lbot_dataset_v5.txt")
    print(f"📊 Size reduction: 165k → 40k examples (76% smaller than V4)")
    print()


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    # Set random seed for reproducibility
    random.seed(42)
    
    # Generate dataset
    generate_full_dataset()
