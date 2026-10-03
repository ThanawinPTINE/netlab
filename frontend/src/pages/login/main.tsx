import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Login from './Login';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Login />
    </Providers>
  </StrictMode>,
);
