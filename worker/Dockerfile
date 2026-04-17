FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Installation de Python, OpenCV deps et création de l'utilisateur non root (prodesign)
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1000 prodesign \
    && adduser --system --uid 1000 --ingroup prodesign --home /app prodesign

COPY requirements.txt .
# Use a virtual environment to avoid PIP warnings about "break-system-packages"
RUN python3 -m venv /app/venv && \
    /app/venv/bin/pip install --no-cache-dir -r requirements.txt

# Copie du code avec les permissions correctes
COPY --chown=prodesign:prodesign . .
RUN mkdir -p /app/outputs && chown -R prodesign:prodesign /app/outputs

USER prodesign

CMD ["/app/venv/bin/python", "-u", "main.py"]
