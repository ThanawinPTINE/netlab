import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab6 from './Lab6';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab6 />
    </Providers>
  </StrictMode>,
);
