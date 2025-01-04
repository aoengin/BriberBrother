# Makefile for Rust Miner

# Name of the binary
BIN_NAME = miner

# Specify the Rust toolchain
RUST_TOOLCHAIN = stable

# Specify any additional libraries or dependencies if needed
# RUSTFLAGS = --release

# Default target
all: build

# Build the Rust project
build:
	cargo +$(RUST_TOOLCHAIN) build $(RUSTFLAGS)

# Run the Rust binary
run: build
	./target/debug/$(BIN_NAME)

# Clean up build artifacts
clean:
	cargo +$(RUST_TOOLCHAIN) clean

# Format the code
format:
	cargo fmt

# Lint the code
lint:
	cargo clippy

# Help command
help:
	@echo "Available commands:"
	@echo "  make all       - Build the project"
	@echo "  make run       - Run the project"
	@echo "  make clean     - Clean the project"
	@echo "  make format    - Format the code"
	@echo "  make lint      - Lint the code"
	@echo "  make help      - Show this help message"

.PHONY: all build run clean format lint help
