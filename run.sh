#!/bin/bash

echo "🚀 Iniciando Ollama..."
# Ejecutamos ollama directamente para evitar problemas de permisos
ollama serve & 

# Esperar a que Ollama responda
until curl -s http://localhost:11434/api/tags > /dev/null; do
  echo "⏳ Esperando a que Ollama arranque..."
  sleep 5
done

echo "🦙 Descargando Gemma 2 2B (Versión ágil)..."
# Cambiamos a gemma2:2b para que sea fluido en CPU
while ! ollama pull gemma2:2b; do
    echo "⚠️ Error de red. Reintentando descarga en 10s..."
    sleep 10
done

echo "🧹 Limpiando bloqueos de base de datos..."
rm -f /home/user/app/chroma_db/*.lock

echo "✅ Sistema listo. Iniciando Cellectia 4.0..."
python3 main.py