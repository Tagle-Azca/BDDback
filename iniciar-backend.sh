#!/bin/bash

# Script para iniciar el backend completo de Eskayser
# Uso: ./iniciar-backend.sh

set -e  # Detener si hay errores

echo "Iniciando Backend de Eskayser..."
echo ""

# Verificar que Docker Desktop esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker no está corriendo"
    echo "Abre Docker Desktop y espera a que inicie"
    exit 1
fi

echo "Docker está corriendo"
echo ""

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "ADVERTENCIA: No se encontró node_modules"
    echo "Por favor ejecuta primero: npm install"
    echo ""
    read -p "Deseas instalar dependencias ahora? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "Instalando dependencias..."
        npm install
    else
        exit 1
    fi
fi

echo ""

# Verificar si existen los contenedores
CASSANDRA_EXISTS=$(docker ps -a -q -f name=cassandra-eskayser)
CHROMA_EXISTS=$(docker ps -a -q -f name=chromadb-eskayser)

# Iniciar o crear Cassandra
if [ -z "$CASSANDRA_EXISTS" ]; then
    echo "Creando contenedor de Cassandra..."
    docker run -d --name cassandra-eskayser -p 9042:9042 cassandra:4.1
    CASSANDRA_NUEVO=true
else
    echo "Iniciando Cassandra existente..."
    docker start cassandra-eskayser || true
    CASSANDRA_NUEVO=false
fi

# Iniciar o crear ChromaDB
if [ -z "$CHROMA_EXISTS" ]; then
    echo "Creando contenedor de ChromaDB..."
    docker run -d --name chromadb-eskayser -p 8000:8000 chromadb/chroma:latest
else
    echo "Iniciando ChromaDB existente..."
    docker start chromadb-eskayser || true
fi

echo ""
echo "Esperando a que las bases de datos estén listas..."

# Si Cassandra es nuevo, esperar más tiempo
if [ "$CASSANDRA_NUEVO" = true ]; then
    echo "(Cassandra es nueva, esperando 60 segundos...)"
    sleep 60

    echo "Creando keyspace en Cassandra..."
    docker exec cassandra-eskayser cqlsh -e "CREATE KEYSPACE IF NOT EXISTS eskayser WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};"

    echo "Inicializando datos..."
    node inicializar-datos.js
    node llenar-cassandra.js
else
    # Si ya existe, solo esperar 10 segundos
    sleep 10
fi

echo ""
echo "Probando conexiones a las bases de datos..."
node cli.js test

echo ""
echo "Todo listo! Iniciando servidor..."
echo ""
echo "El backend estará disponible en: http://localhost:5002"
echo "Para ver estadísticas: node cli.js stats"
echo "Para detener: Ctrl+C y luego ejecuta ./detener-backend.sh"
echo ""

# Iniciar el servidor
npm start
