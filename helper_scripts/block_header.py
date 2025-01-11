import hashlib


def reverse_hex(hex_str):
    """Reverse the order of bytes in a hex string."""
    return bytes.fromhex(hex_str)[::-1].hex()


def calculate_block_hash(version, prev_block, merkle_root, timestamp, bits, nonce):
    # Reverse each field
    version_reversed = reverse_hex(version)
    prev_block_reversed = reverse_hex(prev_block)
    merkle_root_reversed = reverse_hex(merkle_root)
    timestamp_reversed = reverse_hex(timestamp)
    bits_reversed = reverse_hex(bits)
    nonce_reversed = reverse_hex(nonce)

    print(f"version in LE: {version_reversed}")
    print(f"prev_block in LE: {prev_block_reversed}")
    print(f"merkle_root in LE: {merkle_root_reversed}")
    print(f"timestamp in LE: {timestamp_reversed}")
    print(f"bits in LE: {bits_reversed}")
    print(f"nonce in LE: {nonce_reversed}")

    # Concatenate the reversed fields
    block_header_hex = (
        version_reversed
        + prev_block_reversed
        + merkle_root_reversed
        + timestamp_reversed
        + bits_reversed
        + nonce_reversed
    )

    # Convert the header to bytes
    block_header_bytes = bytes.fromhex(block_header_hex)

    # Double SHA-256 hash
    hash1 = hashlib.sha256(block_header_bytes).digest()
    block_hash = hashlib.sha256(hash1).digest()

    # Reverse the final hash to match Bitcoin's endianness
    return block_hash[::-1].hex()


# Block header values (hex strings) in BE
version = "20000000"
prev_block = "25b666b2b98b0cfaa4a6e4305beb3f56e61f58b6d259e0c934dd8a29db779dc3"
merkle_root = "680981e8a8a23bec58e89bce683fd7cf96a8df901262067748b4fde155949d0c"
timestamp = "677DB882"
bits = "207fffff"
nonce = "00000000"

block_hash = calculate_block_hash(
    version, prev_block, merkle_root, timestamp, bits, nonce
)
print("Block Hash:", block_hash)
