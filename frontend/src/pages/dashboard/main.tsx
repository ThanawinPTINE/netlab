import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Dashboard from './Dashboard';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Dashboard />
    </Providers>
  </StrictMode>,
);
