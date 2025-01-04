use bitcoin::Block;
use bitcoincore_rpc::{Client, RpcApi};

pub(crate) enum SubmitError {
    RpcError(bitcoincore_rpc::Error),
    Interrupted,
}

pub fn submit_mined_block(
    block: Block,
    rpc: &Client,
) -> Result<(), SubmitError> {
    rpc.submit_block(&block).map_err(SubmitError::RpcError)
}
