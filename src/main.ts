import { startShell } from '@app/shell';

import './styles.css';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('The application root is missing.');
}

startShell(root);
