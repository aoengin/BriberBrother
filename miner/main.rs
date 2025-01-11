use bitcoin::Address;

use bitcoincore_rpc::json;
use bitcoincore_rpc::Auth;
use bitcoincore_rpc::RpcApi;
use miner::mine_block;
use std::env;
use std::str::FromStr;
use submitter::submit_mined_block;

mod miner;
mod multi_threading;
mod sha256d;
mod submitter;

#[tokio::main]
async fn main() {
    let rpc_user = env::var("RPC_USER").expect("RPC_USER not set in .env");
    let rpc_password = env::var("RPC_PASSWORD").expect("RPC_PASSWORD not set in .env");
    let rpc_url = env::var("RPC_URL").expect("RPC_URL not set in .env");
    let coinbase_address_str =
        env::var("COINBASE_ADDRESS").expect("COINBASE_ADDRESS not set in .env");

    let index = 1;
    let auth = Auth::UserPass(rpc_user, rpc_password);
    let rpc = bitcoincore_rpc::Client::new(&rpc_url, auth).unwrap();

    let coinbase_address = Address::from_str(&coinbase_address_str)
        .unwrap()
        .assume_checked();

    loop {
        std::thread::sleep(std::time::Duration::from_secs(20));
        let height = rpc.get_block_count().unwrap();
        println!("Mining block at height {}", height);

        // TODO: Dynamic height encoding - currently hardcoded for fixed length 
        // PLEASE NOTE: This is a temporary workaround for the height encoding issue
        
        let new_height = height + 1;
        let height_bytes = new_height.to_le_bytes();  // Convert to little-endian byte array
        let size = height_bytes.iter().rposition(|&x| x != 0).map_or(1, |pos| pos + 1); // Find the number of used bytes

        let mut height_vec = vec![3 as u8]; // First byte is the length
        height_vec.extend_from_slice(&height_bytes[..size]); 
        // add 00 to end
        height_vec.push(0);
        println!("Height: {:?}", height_vec);

        let block_template = rpc
            .get_block_template(
                json::GetBlockTemplateModes::Template,
                &[
                    json::GetBlockTemplateRules::Csv,
                    json::GetBlockTemplateRules::Taproot,
                    json::GetBlockTemplateRules::SegWit,
                ],
                &[],
            )
            .unwrap();
        

        let block = mine_block(
            block_template,
            coinbase_address.clone(),
            height_vec,
            index, 
            &rpc,
        ).unwrap();

        match submit_mined_block(block, &rpc) {
            Ok(_) => {
                println!("Block submitted successfully!");
            }
            Err(submitter::SubmitError::RpcError(e)) => {
                println!("Error submitting block: {}", e);
            }
            Err(submitter::SubmitError::Interrupted) => {
                println!("Another miner found the block first. Restarting mining...");
            }
        }

        println!("Restarting mining for the next block...");
    }
}
