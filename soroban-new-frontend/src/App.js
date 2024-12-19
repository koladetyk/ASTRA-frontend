import React from "react";
import WalletConnect from "./WalletConnect";
import ContractInteraction from "./ContractInteraction";

const App = () => {
  return (
    <div className="App">
      <h1>Freighter Wallet Integration</h1>
      <WalletConnect />
      <ContractInteraction />
    </div>
  );
};

export default App;
