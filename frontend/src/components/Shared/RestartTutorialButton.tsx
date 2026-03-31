import { HelpCircle } from 'lucide-react';
import { useTutorial } from '../../hooks/useTutorial';

/**
 * Botão para reiniciar o tutorial guiado
 * Deve ser colocado na página de Configurações
 */
export const RestartTutorialButton = () => {
  const { startTutorial } = useTutorial();

  const handleClick = () => {
    startTutorial();
  };

  return (
    <button
      onClick={handleClick}
      className="
        flex items-center gap-2 px-4 py-2 
        bg-blue-600 hover:bg-blue-700 
        text-white font-medium rounded-lg 
        transition-colors duration-200
        shadow-md hover:shadow-lg
        active:scale-95
      "
      aria-label="Reiniciar tutorial guiado"
    >
      <HelpCircle className="w-5 h-5" />
      <span>Ver Tutorial Novamente</span>
    </button>
  );
};
