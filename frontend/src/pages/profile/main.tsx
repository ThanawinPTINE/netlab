import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Profile from './Profile';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Profile />
    </Providers>
  </StrictMode>,
);
