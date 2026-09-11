import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import './index.css';
import { ArcadeProvider } from './state';
import { Player } from './screens/Player';
import { Host } from './screens/Host';
import { JoinDisplay, PlayDisplay } from './screens/Displays';
const Screen =
  location.pathname === '/host'
    ? Host
    : location.pathname === '/display/join'
      ? JoinDisplay
      : location.pathname === '/display/play'
        ? PlayDisplay
        : Player;
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="min-h-svh bg-[#F7F7F2] font-[Poppins,sans-serif] text-[#252525] antialiased selection:bg-[#DDEBE0]">
      <ArcadeProvider>
        <Screen />
      </ArcadeProvider>
    </div>
  </React.StrictMode>,
);
