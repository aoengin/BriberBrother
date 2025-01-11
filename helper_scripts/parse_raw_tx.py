import hashlib


def double_sha256(data):
    return hashlib.sha256(hashlib.sha256(data).digest()).digest()


def calculate_txid(version, input_count, inputs, output_count, outputs, locktime):
    concated_input = ""
    for i in range(len(inputs)):
        concated_input += "".join(inputs[i].values())

    concated_output = ""
    for k in range(len(outputs)):
        concated_output += "".join(outputs[k].values())

    txid_data = (
        version
        + input_count
        + concated_input
        + output_count
        + concated_output
        + locktime
    )

    txid_data = bytes.fromhex(txid_data)

    txid_hash = double_sha256(txid_data)

    txid = txid_hash[::-1].hex()
    return txid


def parse_varint(data, offset):
    value = data[offset]
    offset += 1
    if value < 0xFD:
        return f"{value:02x}", offset
    elif value == 0xFD:
        return data[offset : offset + 2].hex(), offset + 2
    elif value == 0xFE:
        return data[offset : offset + 4].hex(), offset + 4
    else:
        return data[offset : offset + 8].hex(), offset + 8


def parse_input(data, offset):
    prev_tx = data[offset : offset + 32].hex()
    offset += 32

    prev_index = data[offset : offset + 4].hex()
    offset += 4

    script_len, offset = parse_varint(data, offset)
    script_sig = data[offset : offset + int(script_len, 16)].hex()
    offset += int(script_len, 16)

    sequence = data[offset : offset + 4].hex()
    offset += 4

    return {
        "prev_tx": prev_tx,
        "prev_index": prev_index,
        "script_len": script_len,
        "script_sig": script_sig,
        "sequence": sequence,
    }, offset


def parse_output(data, offset):
    value = data[offset : offset + 8].hex()
    offset += 8

    script_len, offset = parse_varint(data, offset)
    script_pubkey = data[offset : offset + int(script_len, 16)].hex()
    offset += int(script_len, 16)

    return {
        "value": value,
        "script_len": script_len,
        "script_pubkey": script_pubkey,
    }, offset


def parse_witness(data, offset, input_count):
    witnesses = []
    for _ in range(input_count):
        items = []
        num_items, offset = parse_varint(data, offset)
        num_items = int(num_items, 16)
        for _ in range(num_items):
            item_len, offset = parse_varint(data, offset)
            item_len = int(item_len, 16)
            item = data[offset : offset + item_len].hex()
            offset += item_len
            items.append(item)
        witnesses.append(items)
    return witnesses, offset


def parse_transaction(data):
    offset = 0

    version = data[offset : offset + 4].hex()
    offset += 4

    marker = data[offset]
    flag = data[offset + 1]
    if marker == 0 and flag == 1:
        is_segwit = True
        offset += 2
    else:
        is_segwit = False

    input_count, offset = parse_varint(data, offset)
    input_count_int = int(input_count, 16)
    inputs = []
    for _ in range(input_count_int):
        tx_input, offset = parse_input(data, offset)
        inputs.append(tx_input)

    output_count, offset = parse_varint(data, offset)
    output_count_int = int(output_count, 16)
    outputs = []
    for _ in range(output_count_int):
        tx_output, offset = parse_output(data, offset)
        outputs.append(tx_output)

    witnesses = []
    if is_segwit:
        witnesses, offset = parse_witness(data, offset, input_count_int)

    locktime = data[offset : offset + 4].hex()
    offset += 4

    tx_id = calculate_txid(
        version, input_count, inputs, output_count, outputs, locktime
    )

    concatenated_inputs = ""
    for i in range(len(inputs)):
        concatenated_inputs += "".join(inputs[i].values())

    concatenated_outputs = ""
    for k in range(len(outputs)):
        concatenated_outputs += "".join(outputs[k].values())

    transaction = {
        "version": version,
        "inputs": f"{input_count}{concatenated_inputs}",
        "outputs": f"{output_count}{concatenated_outputs}",
        "locktime": locktime,
        "witnesses": witnesses,
        "tx_id": tx_id,
        "is_segwit": is_segwit,
    }

    return transaction


### TRANSACTION HEX
transaction_hex = "020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff0403a1cd00fdffffff0300000000000000001600142ae1df7f8d8251fb543c333f4a838d133170b2020000000000000000266a24aa21a9ed84e963438d247aee0bbf65c9f28856d6ed1ce9d1eebe20cbb9d38b472078085300000000000000000a6a0800000000000000010120000000000000000000000000000000000000000000000000000000000000000000000000"
## TRANSACTION HEX

transaction_bytes = bytes.fromhex(transaction_hex)
parsed_transaction = parse_transaction(transaction_bytes)

print(parsed_transaction)
