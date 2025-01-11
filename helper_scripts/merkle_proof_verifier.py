import hashlib


def little_endian_to_bytes(hex_str):
    return bytes.fromhex(hex_str)[::-1]


def bytes_to_little_endian(b):
    return b[::-1].hex()


def byte_to_hex(data):
    return data.hex()


def hash256(data):
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()


def verify_merkle_proof(txid, proof, root, index):
    current_hash = little_endian_to_bytes(txid)
    for sibling_hash in proof:
        sibling_hash_bytes = little_endian_to_bytes(sibling_hash)
        if index % 2 == 0:
            current_hash = hash256(current_hash + sibling_hash_bytes)
        else:
            current_hash = hash256(sibling_hash_bytes + current_hash)

        index //= 2

        current_hash = byte_to_hex(current_hash)

    return current_hash == merkle_root


# INPUTS
txid = "a071ebb30cd0cd16485add251491cd6ed085bae046b02d75a5fa33c2072d7297"
merkle_root = "da927053edb38bd5446e669622a3cceef7e23d727075297c035c0f56639773f0"
proof = ["0000000000000000000000000000000000000000000000000000000000000000"]
index = 1
# INPUTS

is_valid = verify_merkle_proof(txid, proof, merkle_root, index)
print("Merkle Proof Valid:", is_valid)
