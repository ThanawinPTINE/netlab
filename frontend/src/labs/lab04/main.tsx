import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab4 from './Lab4';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab4 />
    </Providers>
  </StrictMode>,
);
