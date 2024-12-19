import React, { createContext, useContext, useState, useEffect } from "react";
import {
  isConnected,
  requestAccess,
  getAddress,
  getNetwork,
} from "@stellar/freighter-api";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [connectStatus, setConnectStatus] = useState("Initializing...");
  const [network, setNetwork] = useState(null);

  useEffect(() => {
    const initializeWallet = async () => {
      try {
        const connectionStatus = await isConnected();
        if (connectionStatus.isConnected) {
          const addressObj = await getAddress();
          setWalletAddress(addressObj.address);
          const networkObj = await getNetwork();
          setNetwork(networkObj.network);
          setConnectStatus("Connected");
        } else {
          setConnectStatus("Ready to connect");
        }
      } catch (error) {
        console.error("Error initializing wallet:", error);
        setConnectStatus("Error initializing wallet");
      }
    };

    initializeWallet();
  }, []);

  const connectWallet = async () => {
    try {
      setConnectStatus("Connecting...");
      const accessObj = await requestAccess();
      if (accessObj.error) {
        throw new Error(accessObj.error);
      }
      setWalletAddress(accessObj.address);
      const networkObj = await getNetwork();
      setNetwork(networkObj.network);
      setConnectStatus("Connected");
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setConnectStatus("Connection failed");
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setNetwork(null);
    setConnectStatus("Disconnected");
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        connectStatus,
        network,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
