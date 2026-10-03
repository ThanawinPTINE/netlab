import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab10 from './Lab10';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab10 />
    </Providers>
  </StrictMode>,
);
