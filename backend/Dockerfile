# --- Stage 1: Dependency Pre-fetch ---
# Utilisation de 'latest' pour s'assurer d'avoir le compilateur le plus récent (1.90+)
FROM rust:bookworm AS builder

ENV CARGO_HTTP_TIMEOUT=300
ENV CARGO_NET_RETRY=10
ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse

WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
# Suppression de l'update-precise car 'latest' devrait tout supporter nativement
RUN cargo build --release || true && rm -rf src/

COPY . .
RUN cargo build --release

# --- Stage 2: Runtime ---
FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends fonts-dejavu curl ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r -g 1000 prodesign && \
    useradd -r -u 1000 -g prodesign -d /app prodesign

COPY --from=builder --chown=prodesign:prodesign /app/target/release/pro-design-backend /app/pro-design-backend
COPY --from=builder --chown=prodesign:prodesign /app/assets /app/assets
RUN mkdir -p /app/outputs && chown prodesign:prodesign /app/outputs

USER prodesign
EXPOSE 8080
CMD ["./pro-design-backend"]
