import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab3 from './Lab3';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab3 />
    </Providers>
  </StrictMode>,
);
