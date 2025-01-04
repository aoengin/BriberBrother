use std::sync::mpsc;

use bitcoin::{
    absolute, block::Header, hashes::Hash, Address, Amount, Block, OutPoint, ScriptBuf,
    Transaction, TxIn, TxMerkleNode, Txid, Witness, Wtxid,
};
use bitcoincore_rpc::json::{GetBlockTemplateResult, GetBlockTemplateResultTransaction};

use crate::{multi_threading::spawn_mining_threads, sha256_hash};
 

static OP_RETURN_PREFIX_WITNESS: &[u8] = &[0x6a, 0x24, 0xaa, 0x21, 0xa9, 0xed];
static OP_RETURN_PREFIX_INDEX: &[u8] = &[0x6a, 0x08];




pub fn mine_block(
    block_template: GetBlockTemplateResult,
    coinbase_address: Address,
    height_bytes: Vec<u8>,
    index : u64,
) -> Block {
    let wtxid_root = calculate_wtxid_root(&block_template.transactions);

    let coinbase_tx = get_coinbase_transaction(
        block_template.coinbase_value,
        coinbase_address,
        wtxid_root,
        height_bytes,
        index
    );

    let merkle_root = calculate_txid_root(coinbase_tx.compute_txid(), &block_template.transactions);

    let mut block_txs: Vec<Transaction> = Vec::with_capacity(1 + block_template.transactions.len());
    block_txs.push(coinbase_tx);


    print_type_of(&block_template.target);
    block_txs.extend(
        block_template
            .transactions
            .into_iter()
            .map(|tx| tx.transaction().unwrap()),
    );

    loop {
        let (sender, receiver) = mpsc::channel::<Header>();

        let num_threads = 1;
        let max_nonce = 4294967295;

        let mut target = [0u8; 32]; 
        let len = block_template.target.len().min(32);
    
        target[..len].copy_from_slice(&block_template.target[..len]); 
        println!("Array: {:?}", target); // Remaining elements will be zeroes
        
        spawn_mining_threads(
            num_threads,
            sender,
            max_nonce,
            block_template.previous_block_hash,
            merkle_root,
            block_template.version,
            target,
        );

        match receiver.recv() {
            Ok(header) => {
                let block = Block {
                    header,
                    txdata: block_txs,
                };

                println!("Block mined: {:#?}", block);

                return block;
            }
            Err(_) => {
            }
        }
    }
}

fn print_type_of<T>(_: &T) {
    println!("{}", std::any::type_name::<T>());
}

fn get_coinbase_transaction(
    coinbase_amount: Amount,
    coinbase_address: Address,
    wtxid_root: [u8; 32],
    height_bytes: Vec<u8>,
    index : u64,
) -> Transaction {
    let txin_outpoint = OutPoint {
        txid: Txid::all_zeros(),
        vout: 0xffffffff,
    };

    let mut op_return_vec = OP_RETURN_PREFIX_WITNESS.to_vec();
    op_return_vec.extend_from_slice(&wtxid_root);
    let op_return_script = ScriptBuf::from(op_return_vec);

    let mut address_index_op_return_vec = OP_RETURN_PREFIX_INDEX.to_vec();
    address_index_op_return_vec.extend_from_slice(&index.to_be_bytes());
    let address_index_op_return_script = ScriptBuf::from(address_index_op_return_vec);

    let mut coinbase_tx = Transaction {
        version: bitcoin::transaction::Version(2),
        lock_time: absolute::LockTime::from_consensus(0),
        input: vec![TxIn {
            previous_output: txin_outpoint,
            sequence: bitcoin::transaction::Sequence::ENABLE_RBF_NO_LOCKTIME,
            script_sig: ScriptBuf::default(),
            witness: Witness::new(),
        }],
        output: vec![
            bitcoin::transaction::TxOut {
                value: coinbase_amount,
                script_pubkey: coinbase_address.script_pubkey(),
            },
            bitcoin::transaction::TxOut {
                value: Amount::from_sat(0),
                script_pubkey: op_return_script,
            },
            bitcoin::transaction::TxOut {
                value: Amount::from_sat(0),
                script_pubkey: address_index_op_return_script,
            },
        ],
    };

    let input_script = ScriptBuf::from(height_bytes);
    coinbase_tx.input[0].script_sig = input_script;
    coinbase_tx.input[0].witness.push([0u8; 32]);
    // println!("Coinbase transaction: {:#?}", coinbase_tx);

    coinbase_tx
}

fn calculate_wtxid_root(transactions: &[GetBlockTemplateResultTransaction]) -> [u8; 32] {
    let mut wtxid_vec: Vec<Wtxid> = Vec::with_capacity(1 + transactions.len());
    wtxid_vec.push(Wtxid::all_zeros());

    for tx in transactions.iter() {
        wtxid_vec.push(tx.wtxid);
    }

    // println!("Block template wtxids: {:?}", wtxid_vec);

    let wtxid_root = bitcoin::merkle_tree::calculate_root(wtxid_vec.into_iter()).unwrap();
    let mut wtxid_root_comm = sha256_hash!(wtxid_root, [0u8; 32]);
    wtxid_root_comm = sha256_hash!(wtxid_root_comm);

    wtxid_root_comm
}

fn calculate_txid_root(
    coinbase_txid: Txid,
    transactions: &[GetBlockTemplateResultTransaction],
) -> TxMerkleNode {
    let mut txid_vec: Vec<Txid> = Vec::with_capacity(1 + transactions.len());
    txid_vec.push(coinbase_txid);

    for tx in transactions.iter() {
        txid_vec.push(tx.txid);
    }

    // println!("Block template txids: {:?}", txid_vec);

    let txid_root = bitcoin::merkle_tree::calculate_root(txid_vec.into_iter()).unwrap();

    txid_root.into()
}
