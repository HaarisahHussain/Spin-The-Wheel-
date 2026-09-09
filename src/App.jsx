import React from 'react';
import QRCodeScreen from './components/QRCodeScreen';
import GameScreen from './components/GameScreen';
import MonitorScreen from './components/MonitorScreen';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const session = params.get('session');
  if (view === 'mobile') return <GameScreen sessionId={session} />;
  if (view === 'monitor') return <MonitorScreen sessionId={session} />;
  return <QRCodeScreen />;
}
