import React from 'react';
import ReactDOM from 'react-dom/client';

import { Root } from './components/Root.tsx';
import { init } from './init.ts';
import './mockEnv.ts';

import './css/theme.css';
import './index.css';

await init({
  debug: false,
  eruda: false,
  mockForMacOS: false,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
