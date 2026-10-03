import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab7 from './Lab7';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab7 />
    </Providers>
  </StrictMode>,
);
