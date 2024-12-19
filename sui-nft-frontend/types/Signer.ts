// File: ../types/Signer.ts

export enum SignerType {
    Extension = 'Extension',
    // Add other signer types as needed
  }
  
  export interface Signer {
    type: SignerType;
    getAddress: () => Promise<string>;
    accounts: string[];
    currentAccount: string;
    signAndExecuteTransactionBlock: (transaction: any) => Promise<any>;
    // Add other properties as needed
  }
  