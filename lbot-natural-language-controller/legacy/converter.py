import json

# Substitua pelo caminho do seu arquivo de entrada
input_file = 'C:/Code/lbot-natural-language-controller/notation-dataset.json'
# Caminho do arquivo de saída
output_file = 'C:/Code/lbot-natural-language-controller/output.txt'

with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

with open(output_file, 'w', encoding='utf-8') as f:
    for item in data:
        input_text = item['input'].strip()
        output_text = item['output'].strip()
        f.write(f"{input_text} -> {output_text}\n")

print(f"Arquivo convertido salvo em {output_file}")