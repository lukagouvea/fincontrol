import { Download, Plus, Share, Smartphone, Zap } from "lucide-react";
import { useTransactionEditor } from "../app/TransactionEditor";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { IconTile } from "../ui/ListRow";

/**
 * Atalhos (Atalhos.html). Widget de tela inicial, botão na tela de bloqueio e
 * Siri não existem para apps web; ficam os atalhos do ícone e o Gasto rápido.
 */
export function Shortcuts() {
  const editor = useTransactionEditor();
  const install = useInstallPrompt();

  return (
    <>
      <PageHeader back="/ajustes" title="Atalhos" />
      <p className="max-w-[720px] text-[15px] text-muted">Lance um gasto sem abrir o app inteiro: instale o FinControl e segure o ícone para ver os atalhos.</p>
      <div className="grid max-w-[720px] gap-4">
        <Card>
          <CardHeader title="App instalado" />
          {install.installed ? (
            <p className="text-[15px]">O FinControl já está instalado neste aparelho.</p>
          ) : install.canInstall ? (
            <>
              <p className="text-[15px] text-ink-2">Instale para abrir em tela cheia, como um app, e usar os atalhos do ícone.</p>
              <Button size="lg" icon={<Download size={18} aria-hidden="true" />} onClick={() => void install.install()}>
                Instalar o FinControl
              </Button>
            </>
          ) : install.isIos ? (
            <p className="flex items-start gap-2 text-[15px] text-ink-2">
              <Share size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
              No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.
            </p>
          ) : (
            <p className="text-[15px] text-ink-2">Use o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.</p>
          )}
        </Card>
        <Card>
          <CardHeader title="Atalhos do ícone" subtitle="Segure o ícone do app instalado (Android e computador)" />
          <ul>
            {[
              { icon: <Zap size={20} />, title: "Gasto rápido", hint: "Valor, categoria e pagamento em três toques" },
              { icon: <Plus size={20} />, title: "Nova receita", hint: "Abre o lançamento de entrada" },
            ].map((item) => (
              <li key={item.title} className="flex min-h-16 items-center gap-3 border-t border-border first:border-t-0">
                <IconTile>{item.icon}</IconTile>
                <span>
                  <span className="block text-[15px] font-semibold">{item.title}</span>
                  <span className="block text-[13px] text-muted">{item.hint}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 text-[13px] text-muted">
            <Smartphone size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            Widgets de tela inicial, botão na tela de bloqueio e Siri/Assistente não estão disponíveis para apps web.
          </p>
        </Card>
        <Button variant="secondary" size="lg" onClick={editor.quick}>
          Ver lançamento rápido
        </Button>
      </div>
    </>
  );
}
