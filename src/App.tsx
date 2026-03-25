import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './components/pages/HomePage';

function App() {
  const [page, setPage] = useState<'home' | 'editor'>('home');

  if (page === 'editor') return <AppShell />;
  return <HomePage onEnter={() => setPage('editor')} />;
}

export default App;
