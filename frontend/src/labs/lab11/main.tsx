import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab11 from './Lab11';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab11 />
    </Providers>
  </StrictMode>,
);
