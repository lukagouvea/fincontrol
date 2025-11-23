import './index.css';
import React from "react";
import { createRoot } from "react-dom/client"; // 1. Mude a importação
import { App } from "./App";

// 2. Encontre o elemento no DOM
const container = document.getElementById("root");

// 3. Verificação de segurança (importante para TypeScript)
if (container) {
  // 4. Crie a raiz e renderize
  const root = createRoot(container);
  root.render(
    // O StrictMode é opcional, mas recomendado para desenvolvimento
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Não foi possível encontrar o elemento root.");
}