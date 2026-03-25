FROM rust:1-bookworm AS builder
WORKDIR /build
RUN apt-get update && apt-get install -y cmake libclang-dev && rm -rf /var/lib/apt/lists/*
COPY . .
RUN cargo build --release --package moq-relay

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /build/target/release/moq-relay /usr/local/bin/moq-relay
ENTRYPOINT ["moq-relay"]
