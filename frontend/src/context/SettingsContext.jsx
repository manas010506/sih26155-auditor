import React, { createContext, useContext, useState } from 'react';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [useLocalModel, setUseLocalModel] = useState(true);
  const [defaultFramework, setDefaultFramework] = useState('CIS');
  const [defaultSort, setDefaultSort] = useState('severity-desc');

  return (
    <SettingsContext.Provider
      value={{
        useLocalModel, setUseLocalModel,
        defaultFramework, setDefaultFramework,
        defaultSort, setDefaultSort
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
