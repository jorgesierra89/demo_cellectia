FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl python3 python3-pip zstd \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://ollama.com/install.sh | sh

# Configuración de usuario
RUN useradd -m -u 1000 user
ENV HOME=/home/user
ENV PATH=/home/user/.local/bin:$PATH
ENV OLLAMA_MODELS=/home/user/.ollama/models

WORKDIR $HOME/app

# --- MEJORA DE PERMISOS ---
# Creamos las carpetas necesarias para Ollama y ChromaDB
RUN mkdir -p /home/user/.ollama/models && \
    mkdir -p /home/user/app/chroma_db && \
    chown -R user:user /home/user

# Copiar archivos (asegurando propiedad del usuario)
COPY --chown=user . $HOME/app

RUN pip3 install --no-cache-dir -r requirements.txt

# Asegurar permisos de ejecución
RUN chmod +x run.sh

USER user
EXPOSE 7860
CMD ["./run.sh"]