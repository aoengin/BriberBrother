use std::sync::atomic::AtomicBool;
use std::sync::mpsc::Sender;
use std::sync::Arc;
use std::{
    time::{ UNIX_EPOCH},
};
use bitcoin::hashes::Hash;
use bitcoin::{
    block::{Header, Version},
    BlockHash, CompactTarget, TxMerkleNode,
};
use chrono::Utc;

pub fn spawn_mining_threads(
    num_threads: u32,
    sender: Sender<Header>,
    max_nonce: u32,
    last_block_hash: BlockHash,
    merkle_root: TxMerkleNode,
    block_version: u32,
    target: [u8; 32],
) {
    let nonces_per_thread = (max_nonce / num_threads);

    for i in 0..num_threads {
        let sender_clone = sender.clone();
        let start_nonce = i * nonces_per_thread;
        let end_nonce = if i == num_threads - 1 {
            max_nonce
        } else {
            (i + 1) * nonces_per_thread - 1
        };

        let finish_signal = Arc::new(AtomicBool::new(false));
        std::thread::spawn(move || {
            mine_range(
                finish_signal.clone(),
                start_nonce,
                end_nonce,
                sender_clone,
                last_block_hash,
                merkle_root,
                block_version,
                target,
            );
        });
    }
}

fn mine_range(
    finish_signal: Arc<AtomicBool>,
    start_nonce: u32,
    end_nonce: u32,
    sender: Sender<Header>,
    last_block_hash: BlockHash,
    merkle_root: TxMerkleNode,
    block_version: u32,
    target: [u8; 32],
) {
    let check_interval = (end_nonce - start_nonce) / 1_048_576;

    for nonce in start_nonce..=end_nonce {
        let timestamp = Utc::now().timestamp() as u32;

        let block_header = Header {
            version: Version::from_consensus(block_version as i32),
            prev_blockhash: last_block_hash,
            merkle_root,
            time: timestamp,
            bits: CompactTarget::from_hex("0x207fffff").unwrap(),
            nonce,
        };
        let hash = block_header.block_hash();
        let mut hash_vec: [u8; 32] = hash.to_byte_array();
        hash_vec.reverse();
        if &hash_vec[..] < &target[..] {
            println!("Block hash: {:#?}", hash_vec);
            println!("Nonce: {:#?}", nonce);
            println!("Target: {:#?}", target);

            println!("Block header: {:#?}", block_header);

            if let Err(e) = sender.send(block_header) {
                println!("Failed to send block through channel: {:?}", e);
            } else {
                finish_signal.store(true, std::sync::atomic::Ordering::Relaxed);
            }

            break;
        }

        if nonce % check_interval == 0 && finish_signal.load(std::sync::atomic::Ordering::Relaxed) {
            break;
        }
    }
}
