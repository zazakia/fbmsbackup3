import React, { createContext, useContext } from 'react';

interface NavigationContextType {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: React.ReactNode;
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  activeModule,
  onModuleChange
}) => {
  return (
    <NavigationContext.Provider value={{ activeModule, onModuleChange }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export default NavigationContext;