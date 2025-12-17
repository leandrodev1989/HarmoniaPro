import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CSS é carregado via CDN no HTML para garantir estabilidade visual
// import './index.css'; 

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);