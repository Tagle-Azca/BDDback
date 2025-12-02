#!/bin/bash

echo "========================================="
echo "  Setup Local - Todas las Bases de Datos"
echo "========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar Docker
echo -e "${YELLOW}[1/5] Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker no esta instalado${NC}"
    echo "Instala Docker desde: https://www.docker.com/get-started"
    exit 1
fi
echo -e "${GREEN}Docker encontrado${NC}"
echo ""

# MongoDB Local
echo -e "${YELLOW}[2/5] Configurando MongoDB local...${NC}"
if docker ps -a | grep -q mongo-eskayser; then
    echo "Contenedor MongoDB ya existe. Iniciando..."
    docker start mongo-eskayser
else
    echo "Creando contenedor MongoDB..."
    docker run -d \
        --name mongo-eskayser \
        -p 27017:27017 \
        -e MONGO_INITDB_ROOT_USERNAME=eskayser \
        -e MONGO_INITDB_ROOT_PASSWORD=eskayser123 \
        -v mongo-eskayser-data:/data/db \
        mongo:latest
fi
echo -e "${GREEN}MongoDB listo en: mongodb://eskayser:eskayser123@localhost:27017${NC}"
echo ""

# ChromaDB Local
echo -e "${YELLOW}[3/5] Configurando ChromaDB local...${NC}"
if docker ps -a | grep -q chromadb-eskayser; then
    echo "Contenedor ChromaDB ya existe. Iniciando..."
    docker start chromadb-eskayser
else
    echo "Creando contenedor ChromaDB..."
    docker run -d \
        --name chromadb-eskayser \
        -p 8000:8000 \
        -v chromadb-eskayser-data:/chroma/chroma \
        chromadb/chroma
fi
echo -e "${GREEN}ChromaDB listo en: http://localhost:8000${NC}"
echo ""

# Cassandra Local
echo -e "${YELLOW}[4/5] Configurando Cassandra local...${NC}"
if docker ps -a | grep -q cassandra-eskayser; then
    echo "Contenedor Cassandra ya existe. Iniciando..."
    docker start cassandra-eskayser
else
    echo "Creando contenedor Cassandra..."
    docker run -d \
        --name cassandra-eskayser \
        -p 9042:9042 \
        -v cassandra-eskayser-data:/var/lib/cassandra \
        cassandra:latest

    echo "Esperando a que Cassandra este listo (puede tomar 30-60 segundos)..."
    sleep 30
fi
echo -e "${GREEN}Cassandra listo en: localhost:9042${NC}"
echo ""

# Actualizar .env
echo -e "${YELLOW}[5/5] Configurando variables de entorno...${NC}"
cat > .env.local << EOF
PORT=5002

# MongoDB Local
MONGO_URI=mongodb://eskayser:eskayser123@localhost:27017/eskayser?authSource=admin
MONGO_URI_FRACCIONAMIENTO=mongodb://eskayser:eskayser123@localhost:27017/fraccionamientos?authSource=admin
MONGO_URI_ADMINESKAYSER=mongodb://eskayser:eskayser123@localhost:27017/admineskayser?authSource=admin

# JWT
JWT_SECRET=supersecreto_local_desarrollo

# CORS (Frontend local)
CLIENT_URL_PROD=http://localhost:3001
CLIENT_URL_DEV=http://localhost:3001

# OneSignal (opcional para local)
ONESIGNAL_APP_ID=test
ONESIGNAL_API_KEY=test
NOTIFICATION_SECRET=notif_sec_local

# Cloudinary (opcional para local - usar rutas locales)
CLOUDINARY_CLOUD_NAME=test
CLOUDINARY_API_KEY=test
CLOUDINARY_API_SECRET=test

# ChromaDB Local
CHROMA_URL=http://localhost:8000

# Cassandra Local
CASSANDRA_CONTACT_POINTS=localhost
CASSANDRA_DATACENTER=datacenter1
CASSANDRA_KEYSPACE=eskayser
CASSANDRA_USERNAME=cassandra
CASSANDRA_PASSWORD=cassandra
EOF

echo -e "${GREEN}Archivo .env.local creado${NC}"
echo ""

# Resumen
echo "========================================="
echo -e "${GREEN}  Setup Completado!${NC}"
echo "========================================="
echo ""
echo "Servicios corriendo:"
echo "  MongoDB:   mongodb://localhost:27017"
echo "  ChromaDB:  http://localhost:8000"
echo "  Cassandra: localhost:9042"
echo ""
echo "Siguiente paso:"
echo "  1. cp .env.local .env"
echo "  2. npm install"
echo "  3. npm run dev"
echo ""
echo "Para detener los servicios:"
echo "  docker stop mongo-eskayser chromadb-eskayser cassandra-eskayser"
echo ""
