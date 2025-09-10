#!/bin/bash

# L-Bot Socket Control - Script de Setup
# Este script configura e compila o módulo socket control do projeto L-Bot

echo "🤖 L-Bot Socket Control - Setup"
echo "================================"

# Verificar se o Enki está compilado
ENKI_PATH="/Users/guilherme.mendesrosa/code/enki"
ENKI_BUILD_PATH="$ENKI_PATH/build"

if [ ! -d "$ENKI_BUILD_PATH" ]; then
    echo "❌ Enki não encontrado em $ENKI_BUILD_PATH"
    echo "📋 Primeiro compile o Enki:"
    echo "   cd $ENKI_PATH"
    echo "   mkdir -p build && cd build"
    echo "   cmake .. && make"
    exit 1
fi

if [ ! -f "$ENKI_BUILD_PATH/enki/libenki.a" ]; then
    echo "❌ Biblioteca Enki não encontrada!"
    echo "📋 Compile o Enki primeiro:"
    echo "   cd $ENKI_BUILD_PATH && make"
    exit 1
fi

echo "✅ Enki encontrado em $ENKI_PATH"

# Verificar Qt5
if ! command -v qmake &> /dev/null; then
    echo "❌ Qt5 não encontrado!"
    echo "📋 Instale Qt5:"
    echo "   brew install qt5  # macOS"
    echo "   sudo apt-get install qt5-default  # Ubuntu"
    exit 1
fi

echo "✅ Qt5 encontrado"

# Criar diretório build
echo "📁 Criando diretório build..."
mkdir -p build
cd build

# Configurar CMake
echo "⚙️  Configurando CMake..."
if cmake ..; then
    echo "✅ CMake configurado com sucesso"
else
    echo "❌ Erro na configuração CMake"
    exit 1
fi

# Compilar
echo "🔨 Compilando..."
if make; then
    echo "✅ Compilação concluída com sucesso!"
    echo ""
    echo "🚀 Para executar:"
    echo "   ./lbot-socket-control"
    echo ""
    echo "🐍 Para usar o controlador Python:"
    echo "   cd .. && python3 robot_controller.py"
else
    echo "❌ Erro na compilação"
    exit 1
fi
