// ✅ Polyfill Buffer for @somnia-chain/streams browser compatibility
import { Buffer } from 'buffer';

// Make Buffer available globally BEFORE any other imports
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  (window as any).global = window;
  (window as any).process = (window as any).process || { env: {} };
}

import { createRoot } from "react-dom/client";
import { ApolloProvider } from '@apollo/client/react';
import App from "./App.tsx";
import "./index.css";
import { apolloClient } from './lib/apollo-client';

createRoot(document.getElementById("root")!).render(
  <ApolloProvider client={apolloClient}>
    <App />
  </ApolloProvider>
);
