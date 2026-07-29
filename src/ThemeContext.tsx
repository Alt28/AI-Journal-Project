import { createContext, PropsWithChildren, useContext } from 'react';

import { Palette, lightPalette } from './theme';

const ThemeContext = createContext<Palette>(lightPalette);

export const ThemeProvider = ({
  palette,
  children,
}: PropsWithChildren<{ palette: Palette }>) => (
  <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);
