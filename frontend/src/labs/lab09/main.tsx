import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab9 from './Lab9';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab9 />
    </Providers>
  </StrictMode>,
);
