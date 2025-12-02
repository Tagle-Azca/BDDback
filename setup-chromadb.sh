#!/bin/bash

echo "========================================="
echo "Setup ChromaDB para IngresosBackend"
echo "========================================="
echo ""

# 1. Instalar dependencia npm
echo "1. Instalando chromadb npm package..."
npm install chromadb
if [ $? -eq 0 ]; then
    echo "   ChromaDB npm package instalado correctamente"
else
    echo "   Error al instalar chromadb npm package"
    exit 1
fi

echo ""
echo "2. Verificando instalacion de ChromaDB Python..."
pip3 show chromadb > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ChromaDB Python ya esta instalado"
else
    echo "   Instalando ChromaDB Python..."
    pip3 install chromadb --user
fi

echo ""
echo "========================================="
echo "Instalacion completada!"
echo "========================================="
echo ""
echo "Siguientes pasos:"
echo ""
echo "1. Iniciar servidor ChromaDB en una terminal:"
echo "   chroma run --host localhost --port 8000"
echo ""
echo "2. Iniciar tu servidor Node.js en otra terminal:"
echo "   npm run dev"
echo ""
echo "3. Los logs mostraran:"
echo "   ChromaDB: Coleccion 'visitantes_eskayser' inicializada"
echo ""
