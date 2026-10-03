import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from '../../Providers';
import Course from './Course';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Course />
    </Providers>
  </StrictMode>,
);
