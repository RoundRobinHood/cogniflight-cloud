// temporary per session in-memory mock of what will happen on backend to generate tokens. 
// Replace with API calls later.
import React, { createContext, useContext, useMemo } from "react";

const TokenStoreContext = createContext(null);

export function TokenStoreProvider({ children }) {
  // In-memory Map: token -> seed payload
  const [store, setStore] = React.useState(new Map());

  const api = useMemo(
    () => ({
      // Read a token’s seed payload
      get: (t) => store.get(t),

      // Create/update a token with a seed payload
      set: (t, seed) =>
        setStore((prev) => {
          const next = new Map(prev);
          next.set(t, seed);
          return next;
        }),

      // Remove a token
      remove: (t) =>
        setStore((prev) => {
          const next = new Map(prev);
          next.delete(t);
          return next;
        }),

      // List all (handy for debugging)
      list: () => Array.from(store.entries()).map(([token, seed]) => ({ token, seed })),

      // Clear everything
      clear: () => setStore(new Map()),
    }),
    [store]
  );

  return (
    <TokenStoreContext.Provider value={api}>
      {children}
    </TokenStoreContext.Provider>
  );
}

export function useTokenStore() {
  const ctx = useContext(TokenStoreContext);
  if (!ctx) throw new Error("useTokenStore must be used within TokenStoreProvider");
  return ctx;
}
