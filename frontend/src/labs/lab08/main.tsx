import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab8 from './Lab8';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab8 />
    </Providers>
  </StrictMode>,
);
