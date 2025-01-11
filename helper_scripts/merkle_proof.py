import hashlib


def reverse_hex(hex_str):
    return bytes.fromhex(hex_str)[::-1].hex()


def hash256(hex_string):
    binary_data = bytes.fromhex(hex_string)
    hash1 = hashlib.sha256(binary_data).digest()
    hash2 = hashlib.sha256(hash1).digest()
    return hash2.hex()


class MerkleTree:
    def __init__(self, transactions):
        self.leaves = [reverse_hex(tx) for tx in transactions]
        self.levels = []
        self.is_ready = False
        self.build_tree()

    def build_tree(self):
        if not self.leaves:
            self.is_ready = False
            return

        current_level = self.leaves.copy()
        self.levels.append(current_level)

        while len(current_level) > 1:
            new_level = []
            for i in range(0, len(current_level), 2):
                if i + 1 < len(current_level):
                    combined = current_level[i] + current_level[i + 1]
                    new_level.append(hash256(combined))
                else:
                    combined = current_level[i] + current_level[i]
                    new_level.append(hash256(combined))
                    print(new_level)
            current_level = new_level
            self.levels.append(current_level)
        self.is_ready = True

    def get_proof(self, index):
        if not self.is_ready or index < 0 or index >= len(self.leaves):
            return None
        proof = []
        for x in range(0, len(self.levels) - 1):
            level_len = len(self.levels[x])

            if index == level_len - 1 and level_len % 2 == 1:
                proof.append(self.levels[x][index])
                index = index // 2
                continue

            is_right_node = index % 2 == 1
            sibling_index = index - 1 if is_right_node else index + 1

            if 0 <= sibling_index < level_len:
                sibling_value = self.levels[x][sibling_index]
                proof.append(sibling_value)

            index //= 2
        return proof

    def get_merkle_root(self):
        return self.levels[-1][0] if self.levels else None


if __name__ == "__main__":
    # TRANSACTION HASHES
    transactions = [
        "0000000000000000000000000000000000000000000000000000000000000000",
        "a071ebb30cd0cd16485add251491cd6ed085bae046b02d75a5fa33c2072d7297",
    ]
    # TRANSACTION HASHES

    merkle_tree = MerkleTree(transactions)

    index = 1

    proof = merkle_tree.get_proof(index)

    merkle_root = merkle_tree.get_merkle_root()

    print(f"Citrea Witness Root: 0x{merkle_root}")
    print(f"Merkle Proof: 0x{"".join(proof)}")
