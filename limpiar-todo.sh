#!/bin/bash

# Script para eliminar completamente los contenedores de Docker
# Uso: ./limpiar-todo.sh

echo "ADVERTENCIA: Esto eliminará todos los contenedores y datos"
read -p "¿Estás seguro? (s/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "Deteniendo y eliminando contenedores..."
    docker rm -f cassandra-eskayser chromadb-eskayser 2>/dev/null || true
    echo ""
    echo "Contenedores eliminados completamente"
    echo "Para volver a empezar desde cero: ./iniciar-backend.sh"
else
    echo "Operación cancelada"
fi
