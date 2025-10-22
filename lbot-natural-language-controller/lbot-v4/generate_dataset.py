#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🤖 Gerador de Dataset LBML V4
Gera 700+ exemplos de comandos em português → LBML (com deslocamento e rotação)

Formato LBML:
- Deslocamento: D<valor><direção>;  (F/B/L/R)
- Rotação: R<valor><direção>;  (L/R)
- Exemplo: D40F;R90R;D20L;
"""

import random
import os

# ============================================================================
# CONFIGURAÇÃO DE VARIAÇÕES LINGUÍSTICAS
# ============================================================================

# Verbos de deslocamento
VERBOS_DESLOCAMENTO = [
    "vá", "vou", "ande", "andar", "caminhe", "caminar",
    "mova-se", "mover", "desloque-se", "deslocar",
    "prossiga", "prosseguir", "siga", "seguir", "avance", "avançar"
]

# Verbos de rotação
VERBOS_ROTACAO = [
    "gire", "girar", "vire", "virar", "rotacione", "rotacionar",
    "dê meia-volta", "faça meia-volta", "dê um giro", "rotação"
]

# Indicadores de direção para deslocamento
DIR_FRENTE = ["frente", "à frente", "pra frente", "para frente", "adiante"]
DIR_TRAS = ["trás", "atrás", "para trás", "pra trás", "ré", "retrocesso"]
DIR_ESQUERDA = ["esquerda", "à esquerda", "para esquerda", "pra esquerda"]
DIR_DIREITA = ["direita", "à direita", "para direita", "pra direita"]

# Indicadores de direção para rotação
ROT_ESQUERDA = ["esquerda", "à esquerda", "anti-horário", "contra-horário"]
ROT_DIREITA = ["direita", "à direita", "horário", "sentido horário"]

# Unidades de medida
UNIDADES_DISTANCIA = [
    ("metro", 100),
    ("metros", 100),
    ("m ", 100),
    ("centímetro", 1),
    ("centímetros", 1),
    ("cm", 1),
    ("milímetro", 0.1),
    ("milímetros", 0.1),
    ("mm", 0.1),
]

# Multiplicadores especiais
MULTIPLICADORES = {
    "meia": 0.5,
    "quarto": 0.25,
    "três quartos": 0.75,
    "dez": 10,
    "vinte": 20,
    "trinta": 30,
    "quarenta": 40,
    "cinquenta": 50,
}

# Conectores para múltiplos comandos
CONECTORES = [
    ", depois", ", em seguida", ", logo após", ", então",
    "e depois", "e em seguida", "e logo após", "e então",
    ",", "; depois", "; em seguida", "; então"
]

# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

def converter_unidade(valor, unidade):
    """Converte valor com unidade para centímetros"""
    for unit, factor in UNIDADES_DISTANCIA:
        if unidade.strip().lower() in unit:
            resultado = int(valor * factor)
            return max(1, resultado)  # Mínimo 1cm
    return None

def processar_distancia(texto):
    """Extrai valor numérico e unidade de texto como '40 centímetros'"""
    palavras = texto.lower().split()
    for i, palavra in enumerate(palavras):
        try:
            valor = float(palavra.replace(",", "."))
            # Procura unidade nos próximos palavras
            if i + 1 < len(palavras):
                unidade_parte = " ".join(palavras[i+1:])
                resultado = converter_unidade(valor, unidade_parte)
                if resultado:
                    return resultado
        except ValueError:
            continue
    return None

# ============================================================================
# GERADORES DE EXEMPLOS
# ============================================================================

def gerar_deslocamento_simples(num_exemplos_por_direcao=10000):
    """Gera exemplos simples de deslocamento: D[n]F; etc"""
    exemplos = []
    
    # Deslocamento frente
    for _ in range(num_exemplos_por_direcao):
        valor = random.choice([1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 90, 100, 120, 150, 200])
        verbo = random.choice(VERBOS_DESLOCAMENTO)
        direcao = random.choice(DIR_FRENTE)
        unidade = random.choice(["centímetros", "cm", "metros", "m", "", " ", "  "])
        
        if random.random() > 0.3:
            comando_pt = f"{verbo} {valor} {unidade} {direcao}".replace("  ", " ").strip()
        else:
            comando_pt = f"{verbo} {direcao} {valor} {unidade}".replace("  ", " ").strip()
        
        lbml = f"D{valor}F;"
        exemplos.append((comando_pt, lbml))
    
    # Deslocamento trás
    for _ in range(num_exemplos_por_direcao):
        valor = random.choice([1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 90, 100])
        verbo = random.choice(VERBOS_DESLOCAMENTO)
        direcao = random.choice(DIR_TRAS)
        unidade = random.choice(["centímetros", "cm", "metros", "m", "", " "])
        
        comando_pt = f"{verbo} {valor} {unidade} {direcao}".replace("  ", " ").strip()
        lbml = f"D{valor}B;"
        exemplos.append((comando_pt, lbml))
    
    # Deslocamento esquerda
    for _ in range(num_exemplos_por_direcao):
        valor = random.choice([1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80])
        verbo = random.choice(VERBOS_DESLOCAMENTO)
        direcao = random.choice(DIR_ESQUERDA)
        unidade = random.choice(["centímetros", "cm", "", " "])
        
        comando_pt = f"{verbo} {valor} {unidade} {direcao}".replace("  ", " ").strip()
        lbml = f"D{valor}L;"
        exemplos.append((comando_pt, lbml))
    
    # Deslocamento direita
    for _ in range(num_exemplos_por_direcao):
        valor = random.choice([1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80])
        verbo = random.choice(VERBOS_DESLOCAMENTO)
        direcao = random.choice(DIR_DIREITA)
        unidade = random.choice(["centímetros", "cm", "", " "])
        
        comando_pt = f"{verbo} {valor} {unidade} {direcao}".replace("  ", " ").strip()
        lbml = f"D{valor}R;"
        exemplos.append((comando_pt, lbml))
    
    return exemplos

def gerar_rotacao_simples(num_exemplos_por_direcao=15000):
    """Gera exemplos simples de rotação: R[n]L; etc"""
    exemplos = []
    
    # Rotação esquerda
    for _ in range(num_exemplos_por_direcao):
        valor = random.choice([30, 45, 60, 90, 120, 135, 150, 180, 210, 270, 315, 360])
        verbo = random.choice(VERBOS_ROTACAO)
        direcao = random.choice(ROT_ESQUERDA)
        
        # Variações: com/sem "graus"
        if random.random() > 0.3:
            comando_pt = f"{verbo} {valor} graus {direcao}".strip()
        else:
            comando_pt = f"{verbo} {valor}° {direcao}".strip()
        
        lbml = f"R{valor}L;"
        exemplos.append((comando_pt, lbml))
    
    # Rotação direita
    for _ in range(num_exemplos_por_direcao):
        valor = random.choice([30, 45, 60, 90, 120, 135, 150, 180, 210, 270, 315, 360])
        verbo = random.choice(VERBOS_ROTACAO)
        direcao = random.choice(ROT_DIREITA)
        
        if random.random() > 0.3:
            comando_pt = f"{verbo} {valor} graus {direcao}".strip()
        else:
            comando_pt = f"{verbo} {valor}° {direcao}".strip()
        
        lbml = f"R{valor}R;"
        exemplos.append((comando_pt, lbml))
    
    return exemplos

def gerar_comandos_compostos(num_2_acoes=40000, num_3_acoes=25000, num_4plus_acoes=15000):
    """Gera exemplos com múltiplas ações: D40F;R90R;D20L;"""
    exemplos = []
    
    # 2 ações
    for _ in range(num_2_acoes):
        tipo1 = random.choice(["D", "R"])
        tipo2 = random.choice(["D", "R"])
        
        if tipo1 == "D":
            dir1 = random.choice(["F", "B", "L", "R"])
            val1 = random.choice([10, 20, 30, 40, 50])
            cmd1_pt = f"{'ande' if random.random() > 0.5 else 'vá'} {val1} para {'frente' if dir1=='F' else 'trás' if dir1=='B' else 'esquerda' if dir1=='L' else 'direita'}"
            cmd1_lbml = f"D{val1}{dir1};"
        else:
            dir1 = random.choice(["L", "R"])
            val1 = random.choice([45, 90, 180])
            cmd1_pt = f"gire {val1} graus para {'esquerda' if dir1=='L' else 'direita'}"
            cmd1_lbml = f"R{val1}{dir1};"
        
        if tipo2 == "D":
            dir2 = random.choice(["F", "B", "L", "R"])
            val2 = random.choice([10, 20, 30, 40, 50])
            cmd2_pt = f"{'ande' if random.random() > 0.5 else 'vá'} {val2} para {'frente' if dir2=='F' else 'trás' if dir2=='B' else 'esquerda' if dir2=='L' else 'direita'}"
            cmd2_lbml = f"D{val2}{dir2};"
        else:
            dir2 = random.choice(["L", "R"])
            val2 = random.choice([45, 90, 180])
            cmd2_pt = f"gire {val2} graus para {'esquerda' if dir2=='L' else 'direita'}"
            cmd2_lbml = f"R{val2}{dir2};"
        
        conector = random.choice(CONECTORES)
        comando_pt = f"{cmd1_pt}{conector} {cmd2_pt}"
        lbml = f"{cmd1_lbml}{cmd2_lbml}"
        exemplos.append((comando_pt, lbml))
    
    # 3 ações
    for _ in range(num_3_acoes):
        lbml = ""
        comando_pt = ""
        
        for i in range(3):
            if random.random() > 0.4:  # 60% deslocamento, 40% rotação
                dir_move = random.choice(["F", "B", "L", "R"])
                val = random.choice([10, 20, 30, 40])
                if i > 0:
                    comando_pt += random.choice(CONECTORES) + " "
                comando_pt += f"{'ande' if random.random() > 0.5 else 'vá'} {val} para {'frente' if dir_move=='F' else 'trás' if dir_move=='B' else 'esquerda' if dir_move=='L' else 'direita'}"
                lbml += f"D{val}{dir_move};"
            else:
                dir_rot = random.choice(["L", "R"])
                val = random.choice([45, 90, 180])
                if i > 0:
                    comando_pt += random.choice(CONECTORES) + " "
                comando_pt += f"gire {val} graus para {'esquerda' if dir_rot=='L' else 'direita'}"
                lbml += f"R{val}{dir_rot};"
        
        exemplos.append((comando_pt, lbml))
    
    # 4+ ações
    for _ in range(num_4plus_acoes):
        lbml = ""
        comando_pt = ""
        
        for i in range(random.randint(4, 5)):
            if random.random() > 0.5:
                dir_move = random.choice(["F", "B", "L", "R"])
                val = random.choice([10, 15, 20, 30])
                if i > 0:
                    comando_pt += random.choice(CONECTORES) + " "
                comando_pt += f"{'ande' if random.random() > 0.5 else 'vá'} {val} para {'frente' if dir_move=='F' else 'trás' if dir_move=='B' else 'esquerda' if dir_move=='L' else 'direita'}"
                lbml += f"D{val}{dir_move};"
            else:
                dir_rot = random.choice(["L", "R"])
                val = random.choice([45, 90])
                if i > 0:
                    comando_pt += random.choice(CONECTORES) + " "
                comando_pt += f"gire {val} graus para {'esquerda' if dir_rot=='L' else 'direita'}"
                lbml += f"R{val}{dir_rot};"
        
        exemplos.append((comando_pt, lbml))
    
    return exemplos

def gerar_conversao_unidades(num_metros=5000, num_mm=3000, num_especiais=2000):
    """Gera exemplos com conversão de unidades"""
    exemplos = []
    
    # Metros para cm
    for _ in range(num_metros):
        metros = random.choice([1, 2, 3, 0.5, 1.5])
        cm = int(metros * 100)
        direcao = random.choice(["F", "B", "L", "R"])
        dir_nome = {"F": "frente", "B": "trás", "L": "esquerda", "R": "direita"}[direcao]
        
        unidade = "metro" if metros == 1 else "metros"
        comando_pt = f"ande {metros} {unidade} para {dir_nome}"
        lbml = f"D{cm}{direcao};"
        exemplos.append((comando_pt, lbml))
    
    # Milímetros para cm
    for _ in range(num_mm):
        mm = random.choice([50, 100, 150, 200, 300, 500])
        cm = int(mm / 10)
        direcao = random.choice(["F", "B", "L", "R"])
        dir_nome = {"F": "frente", "B": "trás", "L": "esquerda", "R": "direita"}[direcao]
        
        comando_pt = f"vá {mm}mm para {dir_nome}"
        lbml = f"D{cm}{direcao};"
        exemplos.append((comando_pt, lbml))
    
    # Meia-volta, quarto de volta
    for _ in range(num_especiais // 2):
        variacao = random.choice(["dê meia-volta", "faça meia-volta", "meia-volta", "dê meia volta"])
        comando_pt = variacao
        lbml = "R180L;" if random.random() > 0.5 else "R180R;"
        exemplos.append((comando_pt, lbml))
    
    for _ in range(num_especiais // 2):
        direcao = random.choice(["esquerda", "direita"])
        dir_code = "L" if direcao == "esquerda" else "R"
        comando_pt = f"gire um quarto de volta para {direcao}"
        lbml = f"R90{dir_code};"
        exemplos.append((comando_pt, lbml))
    
    return exemplos

def gerar_variacoes_linguisticas(num_variacoes=5000):
    """Gera variações das mesmas instruções com linguagem diferente"""
    exemplos = []
    
    pares = [
        ("vá 30 para frente", "D30F;"),
        ("caminhe 40 centímetros à esquerda", "D40L;"),
        ("mova-se 25 para trás", "D25B;"),
        ("desloque-se 50 para direita", "D50R;"),
        ("gire 90 graus à esquerda", "R90L;"),
        ("vire 180 graus à direita", "R180R;"),
        ("rotacione 45 graus para esquerda", "R45L;"),
        ("ande 20 para frente e gire 90 graus", "D20F;R90L;"),
        ("prossiga 35 centímetros adiante", "D35F;"),
        ("siga 45 metros para trás", "D4500B;"),
    ]
    
    variadores = [
        lambda x: x,  # Original
        lambda x: x.replace("vá", "ande"),
        lambda x: x.replace("vá", "caminhe"),
        lambda x: x.replace("para", "à"),
        lambda x: x.replace("para frente", "à frente"),
        lambda x: x.replace("centímetros", "cm"),
        lambda x: x.replace("metros", "m"),
        lambda x: x.replace("gire", "vire"),
        lambda x: x.replace("gire", "rotacione"),
    ]
    
    for _ in range(num_variacoes):
        comando_base, lbml_base = random.choice(pares)
        variador = random.choice(variadores)
        comando_var = variador(comando_base)
        exemplos.append((comando_var, lbml_base))
    
    return exemplos

# ============================================================================
# GERAÇÃO DO DATASET
# ============================================================================

def gerar_dataset_completo():
    """Gera o dataset completo com ~150k exemplos (compatível com V3)"""
    print("🤖 Gerando Dataset LBML V4 - Escala Completa")
    print("=" * 70)
    print("⚠️  Isso pode levar alguns minutos...")
    print("=" * 70)
    
    todos_exemplos = []
    
    # Deslocamento simples (~40k)
    print("📍 Gerando deslocamentos simples (4 direções)...")
    exemplos_desl = gerar_deslocamento_simples(num_exemplos_por_direcao=10000)
    todos_exemplos.extend(exemplos_desl)
    print(f"   ✅ {len(exemplos_desl):,} exemplos")
    
    # Rotação simples (~30k)
    print("🔄 Gerando rotações simples (2 direções)...")
    exemplos_rot = gerar_rotacao_simples(num_exemplos_por_direcao=15000)
    todos_exemplos.extend(exemplos_rot)
    print(f"   ✅ {len(exemplos_rot):,} exemplos")
    
    # Comandos compostos (~80k)
    print("🔗 Gerando comandos compostos (2-5 ações)...")
    exemplos_comp = gerar_comandos_compostos(
        num_2_acoes=40000,
        num_3_acoes=25000,
        num_4plus_acoes=15000
    )
    todos_exemplos.extend(exemplos_comp)
    print(f"   ✅ {len(exemplos_comp):,} exemplos")
    
    # Conversão de unidades (~10k)
    print("📏 Gerando conversões de unidades...")
    exemplos_unid = gerar_conversao_unidades(
        num_metros=5000,
        num_mm=3000,
        num_especiais=2000
    )
    todos_exemplos.extend(exemplos_unid)
    print(f"   ✅ {len(exemplos_unid):,} exemplos")
    
    # Variações linguísticas (~5k)
    print("🌐 Gerando variações linguísticas...")
    exemplos_var = gerar_variacoes_linguisticas(num_variacoes=5000)
    todos_exemplos.extend(exemplos_var)
    print(f"   ✅ {len(exemplos_var):,} exemplos")
    
    # Embaralhar
    print("🔀 Embaralhando exemplos...")
    random.shuffle(todos_exemplos)
    
    print("=" * 70)
    print(f"📊 TOTAL: {len(todos_exemplos):,} exemplos gerados!")
    print(f"📊 Comparação: V3 tinha ~143k exemplos")
    print("=" * 70)
    
    return todos_exemplos

def salvar_dataset(exemplos, nome_arquivo="lbot_dataset_v4.txt"):
    """Salva o dataset em formato texto"""
    caminho = os.path.join(os.path.dirname(__file__), nome_arquivo)
    
    with open(caminho, 'w', encoding='utf-8') as f:
        for entrada, saida in exemplos:
            f.write(f"Entrada: {entrada}\n")
            f.write(f"Saída: {saida}\n\n")
    
    print(f"💾 Dataset salvo em: {caminho}")
    return caminho

def validar_dataset(exemplos):
    """Valida alguns exemplos do dataset"""
    print("\n✅ Validação de Exemplos:")
    print("=" * 60)
    
    amostras = random.sample(exemplos, min(10, len(exemplos)))
    for i, (entrada, saida) in enumerate(amostras, 1):
        print(f"{i:2d}. '{entrada}'")
        print(f"    → '{saida}'")
    
    print("=" * 60)

# ============================================================================
# EXECUÇÃO PRINCIPAL
# ============================================================================

if __name__ == "__main__":
    # Gerar dataset
    dataset = gerar_dataset_completo()
    
    # Validar
    validar_dataset(dataset)
    
    # Salvar
    arquivo = salvar_dataset(dataset)
    
    print("\n🎉 Dataset V4 pronto para treinamento!")
    print(f"📌 Próximo passo: Treinar o modelo com este dataset")
