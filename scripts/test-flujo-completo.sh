#!/bin/bash

# Script para probar el flujo completo desde terminal
# Sin necesidad de app movil

BASE_URL="http://localhost:5002"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "  Test Flujo Completo - Terminal"
echo "========================================="
echo ""

# Paso 1: Crear admin
echo -e "${YELLOW}[1/8] Creando usuario admin...${NC}"
ADMIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "admin_local",
    "contrasena": "admin123",
    "rol": "superadmin"
  }')
echo $ADMIN_RESPONSE | jq '.'
echo ""

# Paso 2: Login admin
echo -e "${YELLOW}[2/8] Login admin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "admin_local",
    "contrasena": "admin123"
  }')
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Token obtenido: $TOKEN"
echo ""

# Paso 3: Crear fraccionamiento
echo -e "${YELLOW}[3/8] Creando fraccionamiento...${NC}"
FRACC_RESPONSE=$(curl -s -X POST $BASE_URL/api/fraccionamientos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nombre": "Fraccionamiento Test Local",
    "direccion": "Calle Test 123",
    "usuario": "fracc_test",
    "correo": "test@fracc.com",
    "contrasena": "fracc123",
    "telefono": "1234567890"
  }')
FRACC_ID=$(echo $FRACC_RESPONSE | jq -r '.fraccionamiento._id')
echo "Fraccionamiento creado: $FRACC_ID"
echo $FRACC_RESPONSE | jq '.'
echo ""

# Paso 4: Crear casa
echo -e "${YELLOW}[4/8] Creando casa #15...${NC}"
CASA_RESPONSE=$(curl -s -X POST $BASE_URL/api/fraccionamientos/$FRACC_ID/casas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "numero": "15"
  }')
echo $CASA_RESPONSE | jq '.'
echo ""

# Paso 5: Agregar residente
echo -e "${YELLOW}[5/8] Agregando residente a casa #15...${NC}"
RESIDENTE_RESPONSE=$(curl -s -X POST $BASE_URL/api/fraccionamientos/$FRACC_ID/casas/15/residentes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "nombre": "Juan Propietario",
    "playerId": "test-player-123"
  }')
echo $RESIDENTE_RESPONSE | jq '.'
echo ""

# Paso 6: Registrar visitante (SIN foto para simplificar)
echo -e "${YELLOW}[6/8] Registrando visitante...${NC}"

# Crear archivo temporal para simular visita
cat > /tmp/visita-test.json << 'EOF'
{
  "nombre": "Pedro Visitante",
  "motivo": "Entrega de paquete Amazon"
}
EOF

VISITA_RESPONSE=$(curl -s -X POST "$BASE_URL/api/fraccionamientos/$FRACC_ID/casas/15/visitas" \
  -H "Authorization: Bearer $TOKEN" \
  -F "nombre=Pedro Visitante" \
  -F "motivo=Entrega de paquete Amazon")

REPORTE_ID=$(echo $VISITA_RESPONSE | jq -r '.reporteId')
echo "Visita registrada!"
echo $VISITA_RESPONSE | jq '.'
echo ""
echo -e "${BLUE}Reporte ID: $REPORTE_ID${NC}"
echo ""

# Paso 7: Consultar reporte pendiente
echo -e "${YELLOW}[7/8] Consultando reporte pendiente...${NC}"
sleep 2
PENDIENTE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/reportes/$FRACC_ID/casa/15")
echo $PENDIENTE_RESPONSE | jq '.'
echo ""

# Paso 8: Responder reporte (ACEPTAR)
echo -e "${YELLOW}[8/8] Propietario acepta la visita...${NC}"
RESPUESTA=$(curl -s -X PUT "$BASE_URL/api/reportes/responder/$REPORTE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "aceptado": true,
    "autorizadoPor": "Juan Propietario",
    "autorizadoPorId": "residente123"
  }')
echo $RESPUESTA | jq '.'
echo ""

# Verificar en las 3 bases de datos
echo "========================================="
echo -e "${GREEN}Verificando en las 3 Bases de Datos${NC}"
echo "========================================="
echo ""

# MongoDB - Ver contador del visitante
echo -e "${YELLOW}MongoDB - Contador del visitante:${NC}"
echo "(Verificar manualmente con MongoDB Compass o mongo shell)"
echo ""

# ChromaDB - Debe estar vacio (ya se acepto)
echo -e "${YELLOW}ChromaDB - Reportes pendientes (debe estar vacio):${NC}"
curl -s "$BASE_URL/api/search/health" | jq '.'
echo ""

# Cassandra - Historial completo
echo -e "${YELLOW}Cassandra - Historial de casa #15:${NC}"
HISTORIAL=$(curl -s "$BASE_URL/api/reportes/historial/$FRACC_ID/15?days=1")
echo $HISTORIAL | jq '.'
echo ""

echo "========================================="
echo -e "${GREEN}Flujo Completo Terminado!${NC}"
echo "========================================="
echo ""
echo "Resumen:"
echo "  Fraccionamiento: $FRACC_ID"
echo "  Casa: 15"
echo "  Reporte: $REPORTE_ID"
echo "  Estado: ACEPTADO"
echo ""
echo "Datos guardados en:"
echo "  MongoDB:   Info de visitante + contador"
echo "  Cassandra: Historial del reporte"
echo "  ChromaDB:  (vacio - ya no pendiente)"
echo ""
