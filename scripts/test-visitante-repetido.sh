#!/bin/bash

# Script para probar que el contador funciona cuando un visitante regresa

BASE_URL="http://localhost:5002"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  Test Visitante Repetido"
echo "========================================="
echo ""

# Obtener datos del fraccionamiento (asumiendo que ya existe)
echo -e "${YELLOW}Ingresa el ID del fraccionamiento:${NC}"
read FRACC_ID

echo -e "${YELLOW}Ingresa el numero de casa:${NC}"
read NUMERO_CASA

echo -e "${YELLOW}Ingresa tu token de admin:${NC}"
read TOKEN

echo ""
echo "Registrando 5 visitas del mismo visitante..."
echo ""

for i in {1..5}
do
  echo -e "${YELLOW}Visita #$i...${NC}"

  RESPONSE=$(curl -s -X POST "$BASE_URL/api/fraccionamientos/$FRACC_ID/casas/$NUMERO_CASA/visitas" \
    -H "Authorization: Bearer $TOKEN" \
    -F "nombre=Maria Rodriguez" \
    -F "motivo=Limpieza")

  TOTAL_VISITAS=$(echo $RESPONSE | jq -r '.visitante.totalVisitas')
  ES_NUEVO=$(echo $RESPONSE | jq -r '.visitante.esNuevo')

  echo "  Total visitas: $TOTAL_VISITAS"
  echo "  Es nuevo: $ES_NUEVO"

  if [ "$ES_NUEVO" = "false" ]; then
    echo -e "${GREEN}  Sistema detecto visitante repetido!${NC}"
    echo $RESPONSE | jq '.visitante.estadisticas'
  fi

  echo ""
  sleep 1
done

echo "========================================="
echo -e "${GREEN}Test Completado!${NC}"
echo "========================================="
echo ""
echo "Verifica en MongoDB que el contador se incremento 5 veces"
echo ""
