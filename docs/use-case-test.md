## **Use Case Testing**  

To verify the contract functionality, follow these steps:  

### **1. Create a Wallet on Citrea**  
- Generate a wallet on Citrea and store the private key for later use in **Hardhat**.  
- Modify the following file to include your wallet address:  
  ```plaintext
  citrea/resources/genesis/bitcoin-regtest/evm.json
  ```  
- Add your wallet address along with balance and code fields as shown below:  

  **Example:**  
  ```json
  {
    "address": "0x8DcEe565A537b71594f754e42B7E863F5Ff7761B",
    "balance": "0xffffffffffffffff",
    "code": "0x"
  }
  ```

---

### **2. Deploy the Briber Brother Contract on Citrea**  
After ensuring that **Bitcoin Regtest** and the **Citrea Sequencer** are running without issues, set up Hardhat (or any other deployment tool of your choice) and deploy the **Briber Brother** contract using the following commands:  

```bash
npm install
npx hardhat compile
npx hardhat ignition deploy ./ignition/modules/BasicDeploymentsModule.js --network citrea
```

---

### **3. Record a Bribe Transaction**  
- Once the contract is deployed, the previously created **Citrea wallet address** can be indexed.  
- Any transaction to be included in a block can be recorded in the contract along with:  
  - **The bribe amount**  
  - **An IPFS link**  
- This recording action triggers an **event**, which miners can monitor to track incentivized transactions.  

---

### **4. Claim the Bribe After the Transaction is Mined**  
Once the incentivized transaction is successfully included in a Bitcoin block:  
- The **coinbase transaction** should contain an **OP_RETURN output** that includes the **index of the wallet address**.  
- The `bribeMe` function should then be called with the correct parameters to transfer the **bribe amount** to the indexed address.  

---

### **5. Generate Required Parameters Using Python Helper Scripts**  
Helper scripts written in Python can be used to generate the required parameters for the `bribeMe` function of the contract. These scripts provide the following functionalities:  

- **Merkle proof generation and verification**  
- **Raw transaction parsing**  
- **Block header creation**  

Using these scripts, you can **verify the parameters** before submitting them to the contract.  

---

### **6. Ensuring Security and Correctness**  
- If any parameter is **incorrect or modified**, the `bribeMe` function **should fail**, ensuring the integrity of the process.  
