// src/components/SuccessMessage.tsx
import React from 'react';

type SuccessMessageProps = {
  children: React.ReactNode;
  reset: () => void;
};

const SuccessMessage: React.FC<SuccessMessageProps> = ({ children, reset }) => (
  <div className="success-message">
    <div>{children}</div>
    <button onClick={reset}>Dismiss</button>
  </div>
);

export default SuccessMessage;
