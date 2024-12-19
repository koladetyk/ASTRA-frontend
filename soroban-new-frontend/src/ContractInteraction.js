import React, { useState } from "react";
import { 
  TransactionBuilder, 
  Networks, 
  Contract, 
  Account, 
  Address, 
  XdrLargeInt,
  nativeToScVal,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { useWallet } from "./WalletProvider";

const ContractInteraction = () => {
  const [amount, setAmount] = useState("");
  const [maker, setMaker] = useState("");
  const [treasury, setTreasury] = useState("");
  const [shopper, setShopper] = useState("");
  const [creator, setCreator] = useState("");
  const [escrowBalance, setEscrowBalance] = useState(null);
  const [escrowCount, setEscrowCount] = useState(null);
  const [escrowId, setEscrowId] = useState("");
  const [status, setStatus] = useState("");
  const { walletAddress } = useWallet(); // Retrieve walletAddress from WalletProvider

  // Helper function to add a delay
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  
  const initiateEscrow = async () => {
    if (!walletAddress) {
      setStatus("Please connect your wallet first.");
      console.warn("No wallet address found.");
      return;
    }

    try {
        const rpcUrl = "https://soroban-testnet.stellar.org/"; // Soroban RPC URL for testnet
        const server = new rpc.Server(rpcUrl);
        const contractId = "CDHSSGBZSCGEUBZ63E4KJWCMTGOMK53XIVNBVJGVMYXDYJQFBTKECGGV";
  
        // Create a proper StellarSdk.Account object
        //const account = new Account(walletAddress, sequence);
        const account=await server.getAccount(walletAddress)
  
        const contract = new Contract(contractId);

      // Convert amount to u128 using XdrLargeInt
      const amountBigInt = BigInt(amount);
      if (amountBigInt < 0 || amountBigInt > BigInt("340282366920938463463374607431768211455")) {
        throw new Error("Amount out of range for u128");
      }

      const amountScVal = new XdrLargeInt("u128", [amountBigInt]).toU128();

      // Prepare the arguments for the contract call
      const args = [
        "initiate_escrow", // Function name
        amountScVal, // Convert amount to u128
        new Address(maker).toScVal(), // Maker address as ScVal
        new Address(treasury).toScVal(), // Treasury address as ScVal
        new Address(shopper).toScVal(), // Shopper address as ScVal
        creator ? new Address (creator). toScVal() : nativeToScVal(null), // Optional creator address
      ];

      console.log("Amount SC VAL: ", amountScVal);

      console.log("Contract arguments:", args);

      // Build the transaction
      const transaction = new TransactionBuilder(account, {
        fee: "1000",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call(...args)) // Call the contract function
        .setTimeout(30)
        .build();

      console.log("Transaction built:", transaction);

     // Prepare the transaction using Soroban RPC
     const preparedTransaction = await server.prepareTransaction(transaction);

     console.log("Prepared transaction:", preparedTransaction);

     // Sign the transaction using Freighter
     const signedXDR = await signTransaction(preparedTransaction.toXDR(), {
       networkPassphrase: Networks.TESTNET,
     });

     console.log("Signed transaction XDR:", signedXDR);

     // Submit the transaction using Soroban RPC
     const result = await server.sendTransaction(
       TransactionBuilder.fromXDR(signedXDR.signedTxXdr, Networks.TESTNET)
     );

     console.log("Transaction result:", result);

     if (result.status === "PENDING") {
      setStatus(`Transaction submitted and pending. Hash: ${result.hash}`);
      console.log("Transaction is pending, adding delay...");
      
      // Add a small sleep duration before polling the transaction.
      await sleep(8000); // 8 seconds delay
    
      server
        .getTransaction(result.hash)
        .then((txResult) => {
          console.log("Transaction status:", txResult);
    
          if (txResult.status === "SUCCESS") {
            try {
              // Get the return value from txResult, not result
              const returnValue = txResult.returnValue;
              
              // Parse the tuple return value <symbol,u64>
              if (returnValue && returnValue._arm === "vec") {
                // The tuple is represented as a vector of two elements
                const tupleValues = returnValue._value;
                
                // Second element (index 1) contains the u64 escrow_id
                const escrowId = scValToNative(tupleValues[1]);
                
                setEscrowId(escrowId);
                setStatus(`Escrow initiated successfully! Escrow ID: ${escrowId}`);
              } else {
                throw new Error("Unexpected return value format");
              }
            } catch (error) {
              console.error("Error parsing return value:", error);
              setStatus("Error parsing transaction result.");
            }
          } else {
            setStatus(`Transaction failed: ${txResult.error || "Unknown error"}`);
            console.error("Transaction error:", txResult);
          }
        })
        .catch((error) => {
          console.error("Transaction status error:", error);
          setStatus(`Error checking transaction status: ${error.message}`);
        });
    } else if (result.status === "SUCCESS") {
      setStatus(`Transaction successful! Hash: ${result.hash}`);
    } else {
      setStatus(`Transaction failed: ${result.error || "Unknown error"}`);
      console.error("Transaction submission error:", result);
    }
    } catch (error) {
      console.error("Error initiating escrow:", error);
      setStatus("Failed to initiate escrow.");
    }
  };

  const completeMilestone = async () => {
    if (!walletAddress) {
        setStatus("Please connect your wallet first.");
        console.warn("No wallet address found.");
        return;
    }

    try {
        const rpcUrl = "https://soroban-testnet.stellar.org/"; // Soroban RPC URL for testnet
        const server = new rpc.Server(rpcUrl);
        const contractId = "CDHSSGBZSCGEUBZ63E4KJWCMTGOMK53XIVNBVJGVMYXDYJQFBTKECGGV";

        const account = await server.getAccount(walletAddress);

        const contract = new Contract(contractId);

        // Prepare the arguments for the contract call
        const args = [
          "complete_milestone",
          new Address(shopper).toScVal(),
          nativeToScVal(parseInt(escrowId, 10), { type: 'u64' })
        ];

        console.log("Contract arguments:", args);

        // Build the transaction
        const transaction = new TransactionBuilder(account, {
            fee: "1000",
            networkPassphrase: Networks.TESTNET,
        })
            .addOperation(contract.call(...args)) // Call the contract function
            .setTimeout(30)
            .build();

        console.log("Transaction built:", transaction);

        // Prepare the transaction using Soroban RPC
        const preparedTransaction = await server.prepareTransaction(transaction);

        console.log("Prepared transaction:", preparedTransaction);

        // Sign the transaction using Freighter
        const signedXDR = await signTransaction(preparedTransaction.toXDR(), {
            networkPassphrase: Networks.TESTNET,
        });

        console.log("Signed transaction XDR:", signedXDR);

        // Submit the transaction using Soroban RPC
        const result = await server.sendTransaction(
            TransactionBuilder.fromXDR(signedXDR.signedTxXdr, Networks.TESTNET)
        );

        console.log("Transaction result:", result);

        if (result.status === "PENDING") {
            setStatus(`Transaction submitted and pending. Hash: ${result.hash}`);
            console.log("Transaction is pending, polling for final status...");

            // Poll transaction status
            const maxAttempts = 30; // Adjust based on your needs
            const delay = 2000; // 2 seconds delay
            let attempts = 0;

            while (attempts < maxAttempts) {
                await sleep(delay); // Add a delay before polling
                const txResult = await server.getTransaction(result.hash);

                if (txResult.status === "SUCCESS") {
                    const returnValue = txResult.returnValue;
                    // Convert ScVal symbol to native JavaScript string
                    const symbolValue = scValToNative(returnValue);
                    console.log("Symbol returned:", symbolValue);
                    //setStatus(`Milestone completed successfully! Result: ${symbolValue}`);
                    setStatus(`Milestone completed successfully! Symbol: ${symbolValue}`);
                    return;
                } else if (txResult.status === "FAILED") {
                    console.error("Transaction failed:", txResult);
                    setStatus(`Transaction failed: ${txResult.error || "Unknown error"}`);
                    return;
                }

                attempts++;
            }

            throw new Error("Transaction status polling timed out.");
        } else if (result.status === "SUCCESS") {
            setStatus(`Milestone completed successfully! Hash: ${result.hash}`);
        } else {
            setStatus(`Transaction failed: ${result.error || "Unknown error"}`);
            console.error("Transaction submission error:", result);
        }
    } catch (error) {
        console.error("Error completing milestone:", error);
        setStatus("Failed to complete milestone.");
    }
};

// Helper function to parse a u128 value manually
const parseU128Manually = (value) => {
  if (!value || value._arm !== "u128" || !value._value || !value._value._attributes) {
    throw new Error("Invalid u128 value structure");
  }

  try {
    const hi = BigInt(value._value._attributes.hi._value || "0"); // Higher 64 bits
    const lo = BigInt(value._value._attributes.lo._value || "0"); // Lower 64 bits

    // Combine hi and lo to form the full 128-bit value
    const result = (hi << 64n) + lo;

    return result.toString(); // Return as a string to handle large values safely
  } catch (error) {
    console.error("Error parsing u128 manually:", error);
    throw new Error("Failed to parse u128 value");
  }
};

// Updated function to extract and parse balance
const extractBalanceFromTxResult = (txResult) => {
  if (!txResult || !txResult.returnValue) {
    throw new Error("No return value in transaction result");
  }

  const returnValue = txResult.returnValue;

  console.log("Raw returnValue:", JSON.stringify(returnValue, null, 2));

  if (returnValue._arm !== "u128") {
    throw new Error(`Unexpected return type: ${returnValue._arm}`);
  }

  try {
    const balance = parseU128Manually(returnValue); // Use manual parser for u128
    return balance;
  } catch (error) {
    console.error("Error extracting balance:", error);
    throw new Error("Failed to extract balance from transaction result");
  }
};

// Usage in getEscrowBalance
const getEscrowBalance = async () => {
  if (!walletAddress) {
    setStatus("Please connect your wallet first.");
    console.warn("No wallet address found.");
    return;
  }

  try {
    const rpcUrl = "https://soroban-testnet.stellar.org/"; // Soroban RPC URL for testnet
    const server = new rpc.Server(rpcUrl);
    const contractId = "CDHSSGBZSCGEUBZ63E4KJWCMTGOMK53XIVNBVJGVMYXDYJQFBTKECGGV";

    const account = await server.getAccount(walletAddress); // Get the account information
    const contract = new Contract(contractId);

    // Prepare the arguments for the contract call
    const args = [
      "get_escrow_balance", // Function name
      new Address(shopper).toScVal(), // Shopper address
      nativeToScVal(parseInt(escrowId, 10), { type: 'u64' })
    ];

    console.log("Contract arguments:", args);

    // Build the transaction
    const transaction = new TransactionBuilder(account, {
      fee: "1000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(...args)) // Call the contract function
      .setTimeout(30)
      .build();

    console.log("Transaction built:", transaction);

    // Prepare the transaction using Soroban RPC
    const preparedTransaction = await server.prepareTransaction(transaction);

    console.log("Prepared transaction:", preparedTransaction);

    // Sign the transaction using Freighter
    const signedXDR = await signTransaction(preparedTransaction.toXDR(), {
      networkPassphrase: Networks.TESTNET,
    });

    console.log("Signed transaction XDR:", signedXDR);

    // Submit the transaction using Soroban RPC
    const result = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedXDR.signedTxXdr, Networks.TESTNET)
    );

    console.log("Transaction result:", result);

    if (result.status === "PENDING") {
      setStatus(`Transaction submitted and pending. Hash: ${result.hash}`);
      console.log("Transaction is pending, polling for final status...");

      // Poll transaction status
      const maxAttempts = 30; // Adjust based on your needs
      const delay = 2000; // 2 seconds delay
      let attempts = 0;

      while (attempts < maxAttempts) {
        await sleep(delay); // Add a delay before polling
        const txResult = await server.getTransaction(result.hash);

        console.log("Transaction status during polling:", JSON.stringify(txResult, null, 2));

        if (txResult.status === "SUCCESS") {
          console.log("Transaction succeeded, full result:", txResult);

          // Extract the escrow balance from the response
          const balance = extractBalanceFromTxResult(txResult);
          console.log("Parsed balance:", balance);

          setEscrowBalance(balance);
          setStatus(`Escrow balance retrieved: ${balance}`);
          return;
        } else if (txResult.status === "FAILED") {
          console.error("Transaction failed:", txResult);
          setStatus(`Transaction failed: ${txResult.error || "Unknown error"}`);
          return;
        }

        attempts++;
      }

      throw new Error("Transaction status polling timed out.");
    } else if (result.status === "SUCCESS") {
      console.log("Transaction result on initial success:", result);

      // Extract the escrow balance from the response
      const balance = extractBalanceFromTxResult(result);
      console.log("Parsed balance:", balance);

      setEscrowBalance(balance);
      setStatus(`Escrow balance retrieved: ${balance}`);
    } else {
      const errorMessage = result?.error || "Unknown error";
      setStatus(`Transaction failed: ${errorMessage}`);
      console.error("Transaction submission error:", result);
    }
  } catch (error) {
    console.error("Error getting escrow balance:", error);
    setStatus("Failed to get escrow balance.");
  }
};

const getEscrowCount = async () => {
  if (!walletAddress) {
    setStatus("Please connect your wallet first.");
    return;
  }

  try {
    const rpcUrl = "https://soroban-testnet.stellar.org/"; // Soroban RPC URL for testnet
    const server = new rpc.Server(rpcUrl);
    const contractId = "CDHSSGBZSCGEUBZ63E4KJWCMTGOMK53XIVNBVJGVMYXDYJQFBTKECGGV";

    const account = await server.getAccount(walletAddress);
    const contract = new Contract(contractId);

    const args = ["get_escrow_count", new Address(shopper).toScVal()];

    const transaction = new TransactionBuilder(account, {
      fee: "1000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(...args))
      .setTimeout(30)
      .build();

    const preparedTransaction = await server.prepareTransaction(transaction);
    const signedXDR = await signTransaction(preparedTransaction.toXDR(), {
      networkPassphrase: Networks.TESTNET,
    });
    const result = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedXDR.signedTxXdr, Networks.TESTNET)
    );

    if (result.status === "PENDING") {
      setStatus(`Transaction submitted and pending. Hash: ${result.hash}`);
      console.log("Transaction is pending, polling for final status...");

      // Poll transaction status
      const maxAttempts = 30; // Adjust based on your needs
      const delay = 2000; // 2 seconds delay
      let attempts = 0;

      while (attempts < maxAttempts) {
        await sleep(delay); // Add a delay before polling
        const txResult = await server.getTransaction(result.hash);

        console.log("Transaction status during polling:", JSON.stringify(txResult, null, 2));

        if (txResult.status === "SUCCESS") {
          const escrowCount = parseInt(txResult.returnValue._value, 10);
          setEscrowCount(escrowCount);
          setStatus(`Escrow count retrieved: ${escrowCount}`);

          return;
        } else if (txResult.status === "FAILED") {
          console.error("Transaction failed:", txResult);
          setStatus(`Transaction failed: ${txResult.error || "Unknown error"}`);
          return;
        }

        attempts++;
      }

      throw new Error("Transaction status polling timed out.");
    } else if (result.status === "SUCCESS") {
      console.log("Transaction result on initial success:", result);

      // Extract the escrow balance from the response
      const balance = extractBalanceFromTxResult(result);
      console.log("Parsed balance:", balance);

      setEscrowBalance(balance);
      setStatus(`Escrow balance retrieved: ${balance}`);
    } else {
      const errorMessage = result?.error || "Unknown error";
      setStatus(`Transaction failed: ${errorMessage}`);
      console.error("Transaction submission error:", result);
    }

  } catch (error) {
    console.error("Error getting escrow count:", error);
    setStatus("Failed to get escrow count.");
  }
};

return (
  <div>
    <h2>Contract Interaction</h2>
    <input
      type="text"
      placeholder="Amount (u128)"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
    />
    <input
      type="text"
      placeholder="Maker Address"
      value={maker}
      onChange={(e) => setMaker(e.target.value)}
    />
    <input
      type="text"
      placeholder="Treasury Address"
      value={treasury}
      onChange={(e) => setTreasury(e.target.value)}
    />
    <input
      type="text"
      placeholder="Shopper Address"
      value={shopper}
      onChange={(e) => setShopper(e.target.value)}
    />
    <input
      type="text"
      placeholder="Creator Address (optional)"
      value={creator}
      onChange={(e) => setCreator(e.target.value)}
    />
    <input
      type="text"
      placeholder="Escrow ID"
      value={escrowId}
      onChange={(e) => setEscrowId(e.target.value)}
    />
    <button onClick={initiateEscrow}>Initiate Escrow</button>
    <button onClick={completeMilestone}>Complete Milestone</button>
    <button onClick={getEscrowBalance}>Get Escrow Balance</button>
    <button onClick={getEscrowCount}>Get Escrow Count</button>
    {escrowBalance !== null && <p>Escrow Balance: {escrowBalance}</p>}
    {escrowCount !== null && <p>Escrow Count: {escrowCount}</p>}
    <p>{status}</p>
  </div>
);
};

export default ContractInteraction;