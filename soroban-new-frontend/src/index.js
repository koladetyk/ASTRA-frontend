import React from 'react';
import { createRoot } from 'react-dom/client';
import { WalletProvider } from './WalletProvider';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);
