import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab5 from './Lab5';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab5 />
    </Providers>
  </StrictMode>,
);
