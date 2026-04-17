# --- Stage 1: Dependency Pre-fetch ---
FROM rust:bookworm AS builder

# Configuration réseau
ENV CARGO_HTTP_TIMEOUT=300
ENV CARGO_NET_RETRY=10
ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse

WORKDIR /usr/src/video_engine
RUN apt-get update && apt-get install -y pkg-config libssl-dev build-essential && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs && cargo build --release || true && rm -rf src/
COPY . .
RUN cargo build --release

# --- Stage 2: Web Server Runtime ---
FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg libssl3 ca-certificates fonts-dejavu && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r -g 1000 prodesign && \
    useradd -r -u 1000 -g prodesign -d /app prodesign

COPY --from=builder --chown=prodesign:prodesign /usr/src/video_engine/target/release/video_engine /app/video-engine
RUN mkdir -p /app/outputs && chown prodesign:prodesign /app/outputs

USER prodesign
EXPOSE 8081
CMD ["./video-engine"]
