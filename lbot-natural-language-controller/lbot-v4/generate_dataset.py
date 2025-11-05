import random
import re
from datetime import datetime

def gerar_dataset_lbml_massivo():
    """
    Gera um dataset massivo de 150.000 exemplos de conversão de linguagem natural para LBML
    com frases mais naturais em português
    """
    dataset = []
    
    # Formas naturais de pedir movimento
    formas_movimento_frente = [
        "anda {} pra frente",
        "vai {} pra frente", 
        "segue {} em frente",
        "avança {}",
        "anda {} adiante",
        "caminha {} pra frente",
        "vai {} reto",
        "continua {} pra frente",
        "segue {} adiante",
        "prossegue {} pra frente",
        "dá {} pra frente",
        "faz {} pra frente",
        "anda {} para a frente",
        "vai {} para frente",
        "move {} pra frente",
        "desloca {} pra frente",
        "percorre {} pra frente",
        "caminha {} adiante",
        "marcha {} pra frente",
        "avança {} adiante"
    ]
    
    formas_movimento_tras = [
        "volta {} pra trás",
        "recua {}",
        "anda {} pra trás",
        "vai {} pra trás",
        "retrocede {}",
        "volta {}",
        "anda {} de ré",
        "vai {} de costas",
        "dá {} pra trás",
        "faz {} pra trás",
        "move {} pra trás",
        "desloca {} pra trás",
        "caminha {} pra trás",
        "anda {} para trás",
        "vai {} para trás",
        "recua {} para trás",
        "retorna {}",
        "regride {}"
    ]
    
    formas_movimento_lateral = [
        "vai {} pra esquerda",
        "vai {} pra direita",
        "anda {} pro lado esquerdo",
        "anda {} pro lado direito",
        "move {} pra esquerda",
        "move {} pra direita",
        "desloca {} pra esquerda",
        "desloca {} pra direita",
        "vai {} pro lado",
        "anda {} de lado",
        "segue {} pela esquerda",
        "segue {} pela direita",
        "caminha {} pra esquerda",
        "caminha {} pra direita",
        "dá {} pro lado",
        "faz {} pro lado esquerdo",
        "faz {} pro lado direito"
    ]
    
    formas_rotacao = [
        "vira {} pra direita",
        "vira {} pra esquerda",
        "gira {} pra direita",
        "gira {} pra esquerda",
        "rotaciona {} pra direita",
        "rotaciona {} pra esquerda",
        "faz uma curva de {} pra direita",
        "faz uma curva de {} pra esquerda",
        "vira {} à direita",
        "vira {} à esquerda",
        "gira {} no sentido horário",
        "gira {} no sentido anti-horário",
        "dá um giro de {} pra direita",
        "dá um giro de {} pra esquerda",
        "faz um giro de {}",
        "vira o corpo {} pra direita",
        "vira o corpo {} pra esquerda"
    ]
    
    # Formas de expressar quantidades de distância (sempre em cm)
    def gerar_expressao_distancia(valor):
        opcoes = [
            f"{valor} centímetros",
            f"{valor}cm",
            f"{valor} cm"
        ]
        
        # Adicionar variações ocasionais
        if random.random() < 0.3:
            opcoes.extend([
                f"uns {valor}cm",
                f"mais ou menos {valor}cm",
                f"cerca de {valor}cm"
            ])
        
        return random.choice(opcoes)
    
    # Formas de expressar ângulos
    def gerar_expressao_angulo(valor):
        if valor == 90:
            opcoes = [
                "90 graus",
                "noventa graus",
                "um ângulo reto"
            ]
        elif valor == 180:
            opcoes = [
                "180 graus",
                "meia volta",
                "cento e oitenta graus"
            ]
        elif valor == 360:
            opcoes = [
                "360 graus",
                "uma volta completa",
                "uma volta inteira",
                "trezentos e sessenta graus"
            ]
        elif valor == 45:
            opcoes = [
                "45 graus",
                "quarenta e cinco graus"
            ]
        elif valor == 30:
            opcoes = [
                "30 graus",
                "trinta graus"
            ]
        elif valor == 60:
            opcoes = [
                "60 graus",
                "sessenta graus"
            ]
        elif valor == 270:
            opcoes = [
                "270 graus",
                "duzentos e setenta graus",
                "três quartos de volta"
            ]
        else:
            opcoes = [
                f"{valor} graus"
            ]
        
        return random.choice(opcoes)
    
    # Adicionar prefixos e sufixos ocasionais para naturalidade
    prefixos_opcionais = [
        "", "", "", "",  # Mais chances de não ter prefixo
        "agora ",
        "por favor, ",
        "pode ",
        "preciso que você ",
        "quero que você ",
        "tenta ",
        "vai lá e "
    ]
    
    sufixos_opcionais = [
        "", "", "", "",  # Mais chances de não ter sufixo
        " por favor",
        " agora",
        " pra mim",
        " ok?",
        " tá?",
        " beleza?"
    ]
    
    print("Gerando dataset de 150.000 exemplos...")
    print("Isso pode levar alguns minutos...")
    
    # 1. Comandos simples de movimento para frente (15.000)
    print("Gerando comandos de movimento para frente...")
    for i in range(15000):
        if i % 3000 == 0:
            print(f"  {i}/15000...")
        
        valor = random.choice([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200, 250, 300, 
                              15, 25, 35, 45, 55, 65, 75, 85, 95, 110, 130, 140, 160, 180, 220])
        distancia = gerar_expressao_distancia(valor)
        template = random.choice(formas_movimento_frente)
        
        entrada = template.format(distancia)
        
        # Adicionar prefixo/sufixo ocasionalmente
        if random.random() < 0.3:
            entrada = random.choice(prefixos_opcionais) + entrada
        if random.random() < 0.2:
            entrada = entrada + random.choice(sufixos_opcionais)
        
        saida = f"D{valor}F;"
        dataset.append((entrada.strip(), saida))
    
    # 2. Comandos simples de movimento para trás (10.000)
    print("Gerando comandos de movimento para trás...")
    for i in range(10000):
        if i % 2000 == 0:
            print(f"  {i}/10000...")
        
        valor = random.choice([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200])
        distancia = gerar_expressao_distancia(valor)
        template = random.choice(formas_movimento_tras)
        
        entrada = template.format(distancia)
        
        if random.random() < 0.3:
            entrada = random.choice(prefixos_opcionais) + entrada
        if random.random() < 0.2:
            entrada = entrada + random.choice(sufixos_opcionais)
        
        saida = f"D{valor}B;"
        dataset.append((entrada.strip(), saida))
    
    # 3. Comandos simples de movimento lateral (15.000)
    print("Gerando comandos de movimento lateral...")
    for i in range(15000):
        if i % 3000 == 0:
            print(f"  {i}/15000...")
        
        valor = random.choice([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150])
        distancia = gerar_expressao_distancia(valor)
        
        # Escolher template e direção
        template = random.choice(formas_movimento_lateral)
        if "esquerda" in template or "esquerdo" in template:
            dir_code = "L"
        elif "direita" in template or "direito" in template:
            dir_code = "R"
        else:
            dir_code = random.choice(["L", "R"])
            if dir_code == "L":
                template = template.replace("pro lado", "pro lado esquerdo")
                template = template.replace("de lado", "de lado para a esquerda")
            else:
                template = template.replace("pro lado", "pro lado direito")
                template = template.replace("de lado", "de lado para a direita")
        
        entrada = template.format(distancia)
        
        if random.random() < 0.3:
            entrada = random.choice(prefixos_opcionais) + entrada
        if random.random() < 0.2:
            entrada = entrada + random.choice(sufixos_opcionais)
        
        saida = f"D{valor}{dir_code};"
        dataset.append((entrada.strip(), saida))
    
    # 4. Comandos simples de rotação (20.000)
    print("Gerando comandos de rotação...")
    for i in range(20000):
        if i % 4000 == 0:
            print(f"  {i}/20000...")
        
        valor = random.choice([15, 30, 45, 60, 90, 120, 135, 150, 180, 270, 360])
        angulo = gerar_expressao_angulo(valor)
        template = random.choice(formas_rotacao)
        
        # Determinar direção baseado no template
        if "direita" in template or "horário" in template and "anti" not in template:
            dir_code = "R"
        elif "esquerda" in template or "anti-horário" in template:
            dir_code = "L"
        else:
            dir_code = random.choice(["L", "R"])
        
        entrada = template.format(angulo)
        
        if random.random() < 0.3:
            entrada = random.choice(prefixos_opcionais) + entrada
        if random.random() < 0.2:
            entrada = entrada + random.choice(sufixos_opcionais)
        
        saida = f"R{valor}{dir_code};"
        dataset.append((entrada.strip(), saida))
    
    # 5. Comandos compostos de 2 ações (25.000)
    print("Gerando comandos compostos de 2 ações...")
    conectores = [
        " e depois ",
        " e ",
        ", depois ",
        " e então ",
        ", aí ",
        " e em seguida ",
        ", em seguida ",
        ". Depois ",
        " para então ",
        ", logo após "
    ]
    
    for i in range(25000):
        if i % 5000 == 0:
            print(f"  {i}/25000...")
        
        comandos = []
        saidas = []
        
        for _ in range(2):
            tipo = random.choice(["mov_frente", "mov_tras", "mov_lateral", "rotacao"])
            
            if tipo == "mov_frente":
                valor = random.choice([20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200])
                distancia = gerar_expressao_distancia(valor)
                template = random.choice(formas_movimento_frente)
                comandos.append(template.format(distancia))
                saidas.append(f"D{valor}F;")
            
            elif tipo == "mov_tras":
                valor = random.choice([20, 30, 40, 50, 60, 70, 80, 90, 100])
                distancia = gerar_expressao_distancia(valor)
                template = random.choice(formas_movimento_tras)
                comandos.append(template.format(distancia))
                saidas.append(f"D{valor}B;")
            
            elif tipo == "mov_lateral":
                valor = random.choice([20, 30, 40, 50, 60, 70, 80, 90, 100])
                distancia = gerar_expressao_distancia(valor)
                dir_code = random.choice(["L", "R"])
                if dir_code == "L":
                    comandos.append(f"vai {distancia} pra esquerda")
                else:
                    comandos.append(f"vai {distancia} pra direita")
                saidas.append(f"D{valor}{dir_code};")
            
            else:  # rotacao
                valor = random.choice([30, 45, 60, 90, 180, 360])
                angulo = gerar_expressao_angulo(valor)
                dir_code = random.choice(["L", "R"])
                if dir_code == "L":
                    comandos.append(f"vira {angulo} pra esquerda")
                else:
                    comandos.append(f"vira {angulo} pra direita")
                saidas.append(f"R{valor}{dir_code};")
        
        entrada = comandos[0] + random.choice(conectores) + comandos[1]
        
        if random.random() < 0.2:
            entrada = random.choice(prefixos_opcionais) + entrada
        if random.random() < 0.15:
            entrada = entrada + random.choice(sufixos_opcionais)
        
        saida = "".join(saidas)
        dataset.append((entrada.strip(), saida))
    
    # 6. Comandos compostos de 3 ações (20.000)
    print("Gerando comandos compostos de 3 ações...")
    for i in range(20000):
        if i % 4000 == 0:
            print(f"  {i}/20000...")
        
        comandos = []
        saidas = []
        
        for _ in range(3):
            tipo = random.choice(["mov_frente", "mov_tras", "mov_lateral", "rotacao"])
            
            if tipo == "mov_frente":
                valor = random.choice([20, 30, 40, 50, 60, 70, 80, 90, 100])
                distancia = gerar_expressao_distancia(valor)
                comandos.append(f"anda {distancia} pra frente")
                saidas.append(f"D{valor}F;")
            
            elif tipo == "mov_tras":
                valor = random.choice([20, 30, 40, 50, 60])
                distancia = gerar_expressao_distancia(valor)
                comandos.append(f"recua {distancia}")
                saidas.append(f"D{valor}B;")
            
            elif tipo == "mov_lateral":
                valor = random.choice([20, 30, 40, 50])
                distancia = gerar_expressao_distancia(valor)
                dir_code = random.choice(["L", "R"])
                if dir_code == "L":
                    comandos.append(f"vai {distancia} pra esquerda")
                else:
                    comandos.append(f"vai {distancia} pra direita")
                saidas.append(f"D{valor}{dir_code};")
            
            else:  # rotacao
                valor = random.choice([45, 90, 180])
                angulo = gerar_expressao_angulo(valor)
                dir_code = random.choice(["L", "R"])
                if dir_code == "L":
                    comandos.append(f"gira {angulo} pra esquerda")
                else:
                    comandos.append(f"gira {angulo} pra direita")
                saidas.append(f"R{valor}{dir_code};")
        
        # Construir entrada com conectores variados
        entrada = comandos[0] + random.choice(conectores) + comandos[1] + random.choice(conectores) + comandos[2]
        
        saida = "".join(saidas)
        dataset.append((entrada.strip(), saida))
    
    # 7. Comandos coloquiais e naturais (15.000)
    print("Gerando comandos coloquiais...")
    comandos_coloquiais = [
        # Frente
        ("vai reto", "D50F;"),
        ("segue em frente", "D100F;"),
        ("continua andando", "D80F;"),
        ("vai adiante", "D60F;"),
        ("anda mais um pouco", "D40F;"),
        ("avança mais", "D70F;"),
        ("prossegue", "D50F;"),
        ("vai em frente mais um pouco", "D60F;"),
        ("continua reto", "D80F;"),
        ("segue adiante", "D70F;"),
        ("anda pra frente", "D50F;"),
        ("vai pra frente", "D60F;"),
        ("dá uns passos pra frente", "D90F;"),
        ("caminha pra frente", "D70F;"),
        ("marcha em frente", "D100F;"),
        
        # Trás
        ("volta um pouco", "D30B;"),
        ("recua", "D40B;"),
        ("dá ré", "D50B;"),
        ("volta pra trás", "D60B;"),
        ("anda de costas", "D40B;"),
        ("retrocede", "D50B;"),
        ("vai pra trás", "D40B;"),
        ("recua um pouco", "D30B;"),
        ("volta", "D40B;"),
        ("dá uns passos pra trás", "D60B;"),
        
        # Lateral
        ("vai pro lado", "D40R;"),
        ("anda de lado", "D50L;"),
        ("move pro lado direito", "D40R;"),
        ("move pro lado esquerdo", "D40L;"),
        ("desloca pra direita", "D50R;"),
        ("desloca pra esquerda", "D50L;"),
        
        # Rotação
        ("vira pra direita", "R90R;"),
        ("vira pra esquerda", "R90L;"),
        ("gira", "R180R;"),
        ("dá meia volta", "R180L;"),
        ("faz uma curva", "R90R;"),
        ("vira o corpo", "R90L;"),
        ("rotaciona", "R180R;"),
        ("dá uma volta", "R360R;"),
        ("gira completamente", "R360L;"),
        ("vira totalmente", "R180R;"),
        
        # Expressões com quantidades implícitas
        ("anda um pouquinho", "D20F;"),
        ("anda bastante", "D200F;"),
        ("anda muito", "D300F;"),
        ("anda pouco", "D30F;"),
        ("vai longe", "D250F;"),
        ("vai pertinho", "D15F;"),
        ("dá um passinho", "D25F;"),
        ("dá um passo grande", "D80F;"),
        ("dá um passo pequeno", "D20F;"),
        ("avança bastante", "D150F;"),
        ("avança pouco", "D30F;"),
        ("recua bastante", "D100B;"),
        ("recua pouco", "D20B;"),
        ("vira um pouquinho", "R30R;"),
        ("vira bastante", "R120L;"),
        ("gira um pouco", "R45R;"),
        ("gira muito", "R270L;")
    ]
    
    for i in range(15000):
        if i % 3000 == 0:
            print(f"  {i}/15000...")
        
        cmd, saida = random.choice(comandos_coloquiais)
        
        # Adicionar variações
        if random.random() < 0.3:
            cmd = random.choice(prefixos_opcionais) + cmd
        if random.random() < 0.2:
            cmd = cmd + random.choice(sufixos_opcionais)
        
        dataset.append((cmd.strip(), saida))
    
    # 8. Formas geométricas (10.000)
    print("Gerando comandos de formas geométricas...")
    for i in range(10000):
        if i % 2000 == 0:
            print(f"  {i}/10000...")
        
        tamanho = random.choice([30, 40, 50, 60, 70, 80, 90, 100, 120, 150])
        
        formas = [
            (f"faz um quadrado de {tamanho} centímetros",
             f"D{tamanho}F;R90R;D{tamanho}F;R90R;D{tamanho}F;R90R;D{tamanho}F;R90R;"),
            (f"desenha um quadrado de {tamanho}cm",
             f"D{tamanho}F;R90R;D{tamanho}F;R90R;D{tamanho}F;R90R;D{tamanho}F;R90R;"),
            (f"faz um triângulo de {tamanho}cm",
             f"D{tamanho}F;R120R;D{tamanho}F;R120R;D{tamanho}F;R120R;"),
            (f"desenha um L de {tamanho}cm",
             f"D{tamanho}F;R90R;D{tamanho//2}F;"),
            (f"faz um retângulo de {tamanho}cm por {tamanho//2}cm",
             f"D{tamanho}F;R90R;D{tamanho//2}F;R90R;D{tamanho}F;R90R;D{tamanho//2}F;R90R;"),
            (f"desenha uma cruz",
             f"D{tamanho}F;D{tamanho//2}B;R90R;D{tamanho//2}R;D{tamanho}L;"),
            (f"faz um T",
             f"D{tamanho}F;D{tamanho//2}B;R90R;D{tamanho//2}R;D{tamanho}L;"),
            (f"desenha um hexágono de {tamanho}cm",
             f"D{tamanho}F;R60R;D{tamanho}F;R60R;D{tamanho}F;R60R;D{tamanho}F;R60R;D{tamanho}F;R60R;D{tamanho}F;R60R;"),
            (f"faz um pentágono de {tamanho}cm",
             f"D{tamanho}F;R72R;D{tamanho}F;R72R;D{tamanho}F;R72R;D{tamanho}F;R72R;D{tamanho}F;R72R;"),
            (f"desenha um zigue-zague",
             f"D{tamanho//2}F;R45R;D{tamanho//2}F;R45L;D{tamanho//2}F;R45R;D{tamanho//2}F;")
        ]
        
        forma = random.choice(formas)
        entrada = forma[0]
        
        if random.random() < 0.2:
            entrada = random.choice(["por favor, ", "agora ", "pode ", ""]) + entrada
        
        dataset.append((entrada.strip(), forma[1]))
    
    # 9. Comandos com repetição (10.000)
    print("Gerando comandos com repetição...")
    for i in range(10000):
        if i % 2000 == 0:
            print(f"  {i}/10000...")
        
        num_rep = random.choice([2, 3, 4, 5])
        valor = random.choice([20, 30, 40, 50, 60])
        
        repeticoes = [
            (f"dá {num_rep} passos pra frente",
             "".join([f"D30F;" for _ in range(num_rep)])),
            (f"anda {num_rep} vezes {valor}cm pra frente",
             "".join([f"D{valor}F;" for _ in range(num_rep)])),
            (f"gira {num_rep} vezes",
             "".join([f"R360R;" for _ in range(num_rep)])),
            (f"faz {num_rep} giros de 90 graus",
             "".join([f"R90R;" for _ in range(num_rep)])),
            (f"vai e volta {valor}cm",
             f"D{valor}F;D{valor}B;"),
            (f"anda pra frente e volta {num_rep} vezes",
             "".join([f"D{valor}F;D{valor}B;" for _ in range(num_rep)])),
            (f"repete {num_rep} vezes: anda {valor}cm",
             "".join([f"D{valor}F;" for _ in range(num_rep)])),
            (f"faz {num_rep} movimentos de {valor}cm",
             "".join([f"D{valor}F;" for _ in range(num_rep)]))
        ]
        
        rep = random.choice(repeticoes)
        dataset.append((rep[0], rep[1]))
    
    # 10. Comandos criativos/interpretativos (10.000)
    print("Gerando comandos criativos...")
    comandos_criativos = [
        ("faz uma dancinha", "D20F;R90L;D20B;R90R;D20F;R180L;"),
        ("balança pra lá e pra cá", "D30L;D60R;D30L;"),
        ("faz um vai e vem", "D50F;D50B;D50F;D50B;"),
        ("simula uma caminhada", "D30F;D30F;D30F;"),
        ("faz um movimento circular", "D20F;R90R;D20F;R90R;D20F;R90R;D20F;R90R;"),
        ("imita um pêndulo", "R30L;R60R;R60L;R30R;"),
        ("desenha um oito", "D30F;R90R;D30F;R90R;D30F;R90R;D30F;R90L;D30F;R90L;D30F;R90L;D30F;R90L;"),
        ("faz uma espiral", "D20F;R90R;D30F;R90R;D40F;R90R;D50F;R90R;"),
        ("explora o ambiente", "D50F;R90R;D30F;R90L;D40F;R180R;D20F;"),
        ("faz uma patrulha", "D100F;R90R;D100F;R90R;D100F;R90R;D100F;R90R;"),
        ("circula", "D50F;R90R;D50F;R90R;D50F;R90R;D50F;R90R;"),
        ("foge", "D300F;"),
        ("escapa", "D200B;R90L;D150F;"),
        ("procura algo", "R90L;R180R;R90L;D50F;"),
        ("investiga", "D30F;R45R;D20F;R45L;D30F;"),
        ("contorna", "R90L;D50F;R90R;D100F;R90R;D50F;R90L;"),
        ("desvia", "R45L;D50F;R45R;"),
        ("serpenteia", "D30F;R30R;D30F;R30L;D30F;R30R;D30F;"),
        ("ziguezagueia", "D40F;R60R;D40F;R60L;D40F;R60R;"),
        ("rodopia", "R720R;"),
        ("dá uma pirueta", "R360R;"),
        ("faz uma manobra", "D50B;R180R;D100F;"),
        ("estaciona", "D30F;R90R;D20R;"),
        ("faz uma curva fechada", "D20F;R90R;D20F;"),
        ("faz uma curva aberta", "D50F;R45R;D50F;")
    ]
    
    for i in range(10000):
        if i % 2000 == 0:
            print(f"  {i}/10000...")
        
        cmd, saida = random.choice(comandos_criativos)
        
        if random.random() < 0.2:
            cmd = random.choice(["agora ", "pode ", "tenta ", ""]) + cmd
        
        dataset.append((cmd.strip(), saida))
    
    # Embaralhar dataset
    print("Embaralhando dataset...")
    random.shuffle(dataset)
    
    # Salvar arquivo
    print("Salvando arquivo...")
    with open('lbot_dataset_v4.txt', 'w', encoding='utf-8') as f:
        for i, (entrada, saida) in enumerate(dataset):
            if i % 10000 == 0 and i > 0:
                print(f"  Salvando: {i}/150000...")
            f.write(f"Entrada: {entrada}\n")
            f.write(f"Saída: {saida}\n\n")
    
    print(f"\n✅ Dataset 'lbot_dataset_v4.txt' gerado com sucesso!")
    print(f"Total de exemplos: {len(dataset)}")
    
    # Estatísticas
    print("\n📊 Estatísticas do dataset:")
    mov_frente = sum(1 for _, s in dataset if 'DF' in s)
    mov_tras = sum(1 for _, s in dataset if 'DB' in s)
    mov_lateral = sum(1 for _, s in dataset if 'DL' in s or 'DR' in s)
    rotacoes = sum(1 for _, s in dataset if 'R' in s and 'D' not in s)
    compostos = sum(1 for _, s in dataset if 'D' in s and 'R' in s)
    
    print(f"  - Movimentos para frente: {mov_frente:,}")
    print(f"  - Movimentos para trás: {mov_tras:,}")
    print(f"  - Movimentos laterais: {mov_lateral:,}")
    print(f"  - Apenas rotações: {rotacoes:,}")
    print(f"  - Comandos compostos: {compostos:,}")

if __name__ == "__main__":
    start_time = datetime.now()
    gerar_dataset_lbml_massivo()
    end_time = datetime.now()
    print(f"\n⏱️ Tempo de execução: {end_time - start_time}")
    print(f"📁 Arquivo 'lbot_dataset_v4.txt' pronto para uso!")