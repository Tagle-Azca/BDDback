#!/bin/bash

# Script para detener el backend de Eskayser
# Uso: ./detener-backend.sh

echo "Deteniendo Backend de Eskayser..."
echo ""

# Detener contenedores de Docker
echo "Deteniendo bases de datos..."
docker stop cassandra-eskayser chromadb-eskayser 2>/dev/null || true

echo ""
echo "Backend detenido"
echo ""
echo "Los contenedores siguen existiendo pero están detenidos"
echo "Para volver a iniciar: ./iniciar-backend.sh"
echo "Para eliminar completamente: ./limpiar-todo.sh"
