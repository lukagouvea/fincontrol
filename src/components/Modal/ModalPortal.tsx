import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
type ModalPortalProps = {
  children: React.ReactNode;
  isOpen: boolean;
};
export const ModalPortal: React.FC<ModalPortalProps> = ({
  children,
  isOpen
}) => {
  // Não renderizar nada se o modal não estiver aberto
  if (!isOpen) return null;
  // Criar um portal para renderizar o modal fora da hierarquia do DOM
  return ReactDOM.createPortal(children, document.body);
};