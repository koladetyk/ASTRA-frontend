import React, { useState } from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

const App = () => {
  const client = useSuiClient(); // Sui client instance
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
        },
      }),
  });

  const [digest, setDigest] = useState('');
  const [createdObjectId, setCreatedObjectId] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [newDesignName, setNewDesignName] = useState('');
  const [newDesignImage, setNewDesignImage] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newFabricType, setNewFabricType] = useState('');

  const [version, setVersion] = useState<string | null>(null);

  const fetchLatestObjectState = async (objectId: string) => {
    try {
      const objectState = await client.getObject({ id: objectId });
      if (objectState?.data) {
        setVersion(objectState.data.version.toString()); // Update local state
        setDigest(objectState.data.digest); // Update digest (optional)
        console.log(`Latest Object Version: ${objectState.data.version}`);
      } else {
        throw new Error("Failed to fetch object state.");
      }
    } catch (error) {
      console.error("Error fetching latest object state:", error);
    }
  };
  

  const handleTransactionResult = async (result: any) => {
    console.log("Transaction result:", result);
  
    // Find the object that matches the NFT type
    const updatedObject = result.objectChanges?.find(
      (change: any) =>
        (change.type === 'mutated' || change.type === 'created') &&
        change.objectType.includes("NftModule::NFT") // Ensure it's the NFT type
    );
  
    if (updatedObject) {
      setCreatedObjectId(updatedObject.objectId);
      setDigest(updatedObject.digest);
      setVersion(updatedObject.version); // Save the latest version
      console.log(
        `Updated object ID: ${updatedObject.objectId}, Version: ${updatedObject.version}, Digest: ${updatedObject.digest}`
      );
  
      // Explicitly fetch the latest object state to ensure consistency
      const objectState = await client.getObject({ id: updatedObject.objectId });
      if (objectState?.data) {
        setVersion(objectState.data.version.toString());
        console.log(`Fetched latest version: ${objectState.data.version}`);
      }
    } else {
      console.warn("No mutated or created NFT object found in transaction result.");
    }
  };
  

  

  const mintNFT = async () => {
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: '0x6a18f9507db74f41447996aac7289f25e268d3fb832f8c8bb36e6dac6445a9a8::NftModule::mint_to_sender',
        arguments: [
          tx.pure.string('designId'),
          tx.pure.string('designName'),
          tx.pure.string('fabricType'),
          tx.pure.string('designImage'),
          tx.pure.string('prompt'),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result: any) => {
            setDigest(result.digest || '');
            const createdObject = result.objectChanges?.find((change: any) => change.type === 'created');
            if (createdObject && createdObject.objectId) {
              setCreatedObjectId(createdObject.objectId);
            }
          },
          onError: (error: any) => {
            console.error('Transaction failed:', error);
          },
        }
      );
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const transferNFT = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      // Add a delay before proceeding (65 seconds)
      console.log("Waiting for 65 seconds to allow object state update...");
      await new Promise((resolve) => setTimeout(resolve, 65000));
  
      // Fetch the latest version before proceeding
      await fetchLatestObjectState(createdObjectId);
  
      if (!version) {
        throw new Error("Failed to resolve latest object version.");
      }
  
      console.log(`Transferring NFT - Object ID: ${createdObjectId}, Version: ${version}`);
  
      const tx = new Transaction();
      tx.moveCall({
        target: '0x6a18f9507db74f41447996aac7289f25e268d3fb832f8c8bb36e6dac6445a9a8::NftModule::transfer_nft',
        arguments: [tx.object(createdObjectId), tx.pure.address(addressInput)],
      });
  
      signAndExecuteTransaction(
        { transaction: tx, chain: 'sui:testnet' },
        {
          onSuccess: () => {
            setResultMessage(`NFT transferred to ${addressInput}`);
          },
          onError: (error: any) => console.error("Transaction failed:", error),
        }
      );
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };
  
  const addUserToDesign = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      // Add a delay before proceeding (65 seconds)
      console.log("Waiting for 65 seconds to allow object state update...");
      await new Promise((resolve) => setTimeout(resolve, 65000));
  
      // Fetch the latest version before proceeding
      await fetchLatestObjectState(createdObjectId);
  
      if (!version) {
        throw new Error("Failed to resolve latest object version.");
      }
  
      console.log(`Adding User to Design - Object ID: ${createdObjectId}, Version: ${version}`);
  
      const tx = new Transaction();
      tx.moveCall({
        target: '0x6a18f9507db74f41447996aac7289f25e268d3fb832f8c8bb36e6dac6445a9a8::NftModule::add_user_of_design',
        arguments: [tx.object(createdObjectId), tx.pure.address(addressInput)],
      });
  
      signAndExecuteTransaction(
        { transaction: tx, chain: 'sui:testnet' },
        {
          onSuccess: () => {
            setResultMessage(`User ${addressInput} added to design`);
          },
          onError: (error: any) => console.error("Transaction failed:", error),
        }
      );
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };  

  const updateDesignName = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      // Add a delay before fetching the latest version (65 seconds)
      console.log("Waiting for 65 seconds to allow object state update...");
      await new Promise((resolve) => setTimeout(resolve, 65000)); // 65 seconds delay
  
      // Fetch the latest version before proceeding
      await fetchLatestObjectState(createdObjectId);
  
      //if (!version) {
      //  throw new Error("Failed to resolve latest object version.");
      //}
  
      console.log(`Updating Design Name - Object ID: ${createdObjectId}, Version: ${version}`);
  
      const tx = new Transaction();
      tx.moveCall({
        target: '0x6a18f9507db74f41447996aac7289f25e268d3fb832f8c8bb36e6dac6445a9a8::NftModule::update_design_name',
        arguments: [tx.object(createdObjectId), tx.pure.string(newDesignName)],
      });
  
      signAndExecuteTransaction(
        { transaction: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result: any) => {
            handleTransactionResult(result); // Update state after mutation
            setResultMessage(`Design name updated to: ${newDesignName}`);
          },
          onError: (error: any) => console.error("Transaction failed:", error),
        }
      );
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };
  

  const updateDesignImage = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      // Add a delay before proceeding (65 seconds)
      console.log("Waiting for 65 seconds to allow object state update...");
      await new Promise((resolve) => setTimeout(resolve, 65000));
  
      // Fetch the latest version before proceeding
      await fetchLatestObjectState(createdObjectId);
  
      if (!version) {
        throw new Error("Failed to resolve latest object version.");
      }
  
      console.log(`Updating Design Image - Object ID: ${createdObjectId}, Version: ${version}`);
  
      const tx = new Transaction();
      tx.moveCall({
        target: '0x6a18f9507db74f41447996aac7289f25e268d3fb832f8c8bb36e6dac6445a9a8::NftModule::update_design_image',
        arguments: [tx.object(createdObjectId), tx.pure.string(newDesignImage)],
      });
  
      signAndExecuteTransaction(
        { transaction: tx, chain: 'sui:testnet' },
        {
          onSuccess: () => {
            setResultMessage(`Design image updated to ${newDesignImage}`);
          },
          onError: (error: any) => console.error("Transaction failed:", error),
        }
      );
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };
  

  const updatePrompt = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      // Add a delay before proceeding (65 seconds)
      console.log("Waiting for 65 seconds to allow object state update...");
      await new Promise((resolve) => setTimeout(resolve, 65000));
  
      // Fetch the latest version before proceeding
      await fetchLatestObjectState(createdObjectId);
  
      if (!version) {
        throw new Error("Failed to resolve latest object version.");
      }
  
      console.log(`Updating Prompt - Object ID: ${createdObjectId}, Version: ${version}`);
  
      const tx = new Transaction();
      tx.moveCall({
        target: '0x6a18f9507db74f41447996aac7289f25e268d3fb832f8c8bb36e6dac6445a9a8::NftModule::update_prompt',
        arguments: [tx.object(createdObjectId), tx.pure.string(newPrompt)],
      });
  
      signAndExecuteTransaction(
        { transaction: tx, chain: 'sui:testnet' },
        {
          onSuccess: () => {
            setResultMessage(`Prompt updated to ${newPrompt}`);
          },
          onError: (error: any) => console.error("Transaction failed:", error),
        }
      );
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };
  

  const updateFabricType = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      // Add a delay before proceeding (65 seconds)
      console.log("Waiting for 65 seconds to allow object state update...");
      await new Promise((resolve) => setTimeout(resolve, 65000));
  
      // Fetch the latest version before proceeding
      await fetchLatestObjectState(createdObjectId);
  
      if (!version) {
        throw new Error("Failed to resolve latest object version.");
      }
  
      console.log(`Updating Fabric Type - Object ID: ${createdObjectId}, Version: ${version}`);
  
      const tx = new Transaction();
      tx.moveCall({
        target: '0x6a18f9507db74f41447996aac7289f25e268d3fb832f8c8bb36e6dac6445a9a8::NftModule::update_fabric_type',
        arguments: [tx.object(createdObjectId), tx.pure.string(newFabricType)],
      });
  
      signAndExecuteTransaction(
        { transaction: tx, chain: 'sui:testnet' },
        {
          onSuccess: (result: any) => {
            const updatedObject = result.objectChanges?.find((change: any) => change.type === 'mutated');
            if (updatedObject && updatedObject.objectId) {
              setCreatedObjectId(updatedObject.objectId);
            }
            setResultMessage(`Fabric type updated to ${newFabricType}`);
          },
          onError: (error: any) => console.error("Transaction failed:", error),
        }
      );
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };
  
  const getOwner = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      console.log("Fetching NFT state to retrieve Owner...");
      const objectState = await client.getObject({
        id: createdObjectId,
        options: { showContent: true },
      });
  
      // Typecast 'content' to the expected structure
      const content = objectState?.data?.content as any;
      const owner = content?.fields?.owner || "Unknown";
  
      console.log(`Owner retrieved successfully: ${owner}`);
      setResultMessage(`Owner: ${owner}`);
    } catch (error) {
      console.error("Error fetching owner:", error);
    }
  };
  
  const getDesignName = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      console.log("Fetching NFT state to retrieve Design Name...");
      const objectState = await client.getObject({
        id: createdObjectId,
        options: { showContent: true },
      });
  
      // Safely check if fields exist
      if (
        objectState?.data?.content &&
        typeof objectState.data.content === "object" &&
        "fields" in objectState.data.content
      ) {
        const fields = (objectState.data.content as any).fields;
        const designName = fields?.design_name || "Unknown";
        console.log(`Design Name retrieved successfully: ${designName}`);
        setResultMessage(`Design Name: ${designName}`);
      } else {
        throw new Error("Fields not found in object state.");
      }
    } catch (error) {
      console.error("Error fetching design name:", error);
    }
  };
  
  const getFabricType = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      console.log("Fetching NFT state to retrieve Fabric Type...");
      const objectState = await client.getObject({
        id: createdObjectId,
        options: { showContent: true },
      });
  
      // Typecast 'content' to the expected structure
      const content = objectState?.data?.content as any;
      const fabricType = content?.fields?.fabric_type || "Unknown";
  
      console.log(`Fabric Type retrieved successfully: ${fabricType}`);
      setResultMessage(`Fabric Type: ${fabricType}`);
    } catch (error) {
      console.error("Error fetching fabric type:", error);
    }
  };
  
  const getPrompt = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      console.log("Fetching NFT state to retrieve Prompt...");
      const objectState = await client.getObject({
        id: createdObjectId,
        options: { showContent: true },
      });
  
      // Typecast 'content' to the expected structure
      const content = objectState?.data?.content as any;
      const prompt = content?.fields?.prompt || "Unknown";
  
      console.log(`Prompt retrieved successfully: ${prompt}`);
      setResultMessage(`Prompt: ${prompt}`);
    } catch (error) {
      console.error("Error fetching prompt:", error);
    }
  };
  
  const getDesignID = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      console.log("Fetching NFT state to retrieve Design ID...");
      const objectState = await client.getObject({
        id: createdObjectId,
        options: { showContent: true },
      });
  
      // Typecast 'content' to the expected structure
      const content = objectState?.data?.content as any;
      const designID = content?.fields?.design_id || "Unknown";
  
      console.log(`Design ID retrieved successfully: ${designID}`);
      setResultMessage(`Design ID: ${designID}`);
    } catch (error) {
      console.error("Error fetching design ID:", error);
    }
  };
  
  const getDesignImage = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      console.log("Fetching NFT state to retrieve Design Image...");
      const objectState = await client.getObject({
        id: createdObjectId,
        options: { showContent: true },
      });
  
      // Typecast 'content' to the expected structure
      const content = objectState?.data?.content as any;
      const designImage = content?.fields?.design_image || "Unknown";
  
      console.log(`Design Image retrieved successfully: ${designImage}`);
      setResultMessage(`Design Image: ${designImage}`);
    } catch (error) {
      console.error("Error fetching design image:", error);
    }
  };
  

  const getPreviousOwners = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      console.log("Fetching NFT state to retrieve Previous Owners...");
      const objectState = await client.getObject({
        id: createdObjectId,
        options: { showContent: true },
      });
  
      // Typecast 'content' to the expected structure
      const content = objectState?.data?.content as any;
      const previousOwners = content?.fields?.previous_owners || [];
  
      console.log(`Previous Owners retrieved successfully: ${previousOwners}`);
      setResultMessage(`Previous Owners: ${previousOwners.join(", ") || "None"}`);
    } catch (error) {
      console.error("Error fetching previous owners:", error);
    }
  };
  
  const getUsersOfDesign = async () => {
    try {
      if (!createdObjectId) {
        throw new Error("Object ID is missing. Please mint an NFT first.");
      }
  
      console.log("Fetching NFT state to retrieve Users of Design...");
      const objectState = await client.getObject({
        id: createdObjectId,
        options: { showContent: true },
      });
  
      // Typecast 'content' to the expected structure
      const content = objectState?.data?.content as any;
      const usersOfDesign = content?.fields?.users_of_design || [];
  
      console.log(`Users of Design retrieved successfully: ${usersOfDesign}`);
      setResultMessage(`Users of Design: ${usersOfDesign.join(", ") || "None"}`);
    } catch (error) {
      console.error("Error fetching users of design:", error);
    }
  };
  
  return (
    <div>
      <header>
        <ConnectButton />
      </header>
      <main>
        <h1>Sui NFT DApp</h1>
        {currentAccount && <p>Connected Wallet: {currentAccount.address}</p>}
        <button onClick={mintNFT}>Mint NFT</button>

        {digest && (
          <div>
            <h2>Transaction Digest</h2>
            <p>{digest}</p>
          </div>
        )}

        {createdObjectId && (
          <div>
            <h2>Created Object ID</h2>
            <p>{createdObjectId}</p>

            <div>
              <h3>Transfer NFT</h3>
              <input
                type="text"
                placeholder="Enter new owner address"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
              />
              <button onClick={transferNFT}>Transfer</button>
            </div>

            <div>
              <h3>Add User to Design</h3>
              <input
                type="text"
                placeholder="Enter user address"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
              />
              <button onClick={addUserToDesign}>Add User</button>
            </div>

            <div>
              <h3>Update Design Name</h3>
              <input
                type="text"
                placeholder="Enter new design name"
                value={newDesignName}
                onChange={(e) => setNewDesignName(e.target.value)}
              />
              <button onClick={updateDesignName}>Update Name</button>
            </div>

            <div>
              <h3>Update Design Image</h3>
              <input
                type="text"
                placeholder="Enter new design image"
                value={newDesignImage}
                onChange={(e) => setNewDesignImage(e.target.value)}
              />
              <button onClick={updateDesignImage}>Update Image</button>
            </div>

            <div>
              <h3>Update Prompt</h3>
              <input
                type="text"
                placeholder="Enter new prompt"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
              />
              <button onClick={updatePrompt}>Update Prompt</button>
            </div>

            <div>
              <h3>Update Fabric Type</h3>
              <input
                type="text"
                placeholder="Enter new fabric type"
                value={newFabricType}
                onChange={(e) => setNewFabricType(e.target.value)}
              />
              <button onClick={updateFabricType}>Update Fabric</button>
            </div>

            <div>
                <h3>Retrieve Data</h3>
                <button onClick={getOwner}>Get Owner</button>
                <button onClick={getDesignName}>Get Design Name</button>
                <button onClick={getFabricType}>Get Fabric Type</button>
                <button onClick={getPrompt}>Get Prompt</button>
                <button onClick={getDesignID}>Get Design ID</button>
                <button onClick={getDesignImage}>Get Design Image</button>
                <button onClick={getPreviousOwners}>Get Previous Owners</button>
                <button onClick={getUsersOfDesign}>Get Users of Design</button>
            </div>

            

            {resultMessage && (
              <div>
                <h2>Result</h2>
                <p>{resultMessage}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
