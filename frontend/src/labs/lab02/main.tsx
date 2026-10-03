import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Lab2 from './Lab2';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Lab2 />
    </Providers>
  </StrictMode>,
);
