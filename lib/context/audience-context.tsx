'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface AudienceContextType {
  // Placeholder - will be rebuilt
  isConfigured: boolean;
}

const AudienceContext = createContext<AudienceContextType | undefined>(undefined);

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [isConfigured] = useState(false);
  
  return (
    <AudienceContext.Provider value={{ isConfigured }}>
      {children}
    </AudienceContext.Provider>
  );
}

export function useAudience() {
  const context = useContext(AudienceContext);
  if (!context) {
    throw new Error('useAudience must be used within AudienceProvider');
  }
  return context;
}

