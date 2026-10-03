import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab1 from './Lab1';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab1 />
    </Providers>
  </StrictMode>,
);
