#!/bin/bash

echo "🚨 ATENCIÓN: Este script va a ELIMINAR TODA la base de datos y recrearla"
echo ""
read -p "¿Estás seguro? Escribe 'SI' para continuar: " confirm

if [ "$confirm" != "SI" ]; then
    echo "❌ Cancelado"
    exit 1
fi

echo ""
echo "📊 Paso 1: Backup de usuarios..."
node scripts/backup-users.js

echo ""
echo "🔧 Paso 2: Cargando variables de entorno..."
set -a
source ../.env
set +a
echo "✅ Variables cargadas"

echo ""
echo "🗑️  Paso 3: Reseteando base de datos..."
npx prisma migrate reset --force --skip-seed

echo ""
echo "🔧 Paso 4: Aplicando migraciones..."
npx prisma migrate deploy

echo ""
echo "✅ Base de datos recreada exitosamente!"
echo ""
echo "📝 Siguiente paso: Restaurar usuarios con 'node scripts/restore-users.js'"
