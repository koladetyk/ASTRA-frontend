import React from "react";
import { useWallet } from "./WalletProvider";

const WalletConnect = () => {
  const { walletAddress, connectStatus, connectWallet, disconnectWallet, network } = useWallet();

  return (
    <div>
      <h2>Freighter Wallet Connection</h2>
      {!walletAddress ? (
        <button onClick={connectWallet} disabled={connectStatus === "Connecting..."}>
          {connectStatus === "Connecting..." ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div>
          <p>Connected Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
          <p>Network: {network}</p>
          <button onClick={disconnectWallet}>Disconnect</button>
        </div>
      )}
      <p>Status: {connectStatus}</p>
    </div>
  );
};

export default WalletConnect;
