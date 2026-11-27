import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Download, LogOut, Trash2, Upload } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { accountService } from "../services/accountService";
import { cx } from "../lib/cx";
import { Button } from "../ui/Button";
import { Field, TextInput } from "../ui/Field";
import { PageHeader } from "../ui/PageHeader";
import { Sheet } from "../ui/Sheet";
import { IconTile } from "../ui/ListRow";
import { useToast } from "../ui/Toast";

function Row({ icon, title, hint, danger, onClick, href }: { icon: React.ReactNode; title: string; hint: string; danger?: boolean; onClick?: () => void; href?: string }) {
  const content = (
    <>
      <IconTile tone={danger ? "expense" : "primary"}>{icon}</IconTile>
      <span className="min-w-0 flex-1 text-left">
        <span className={cx("block text-[15px] font-semibold", danger && "text-expense")}>{title}</span>
        <span className="block text-[13px] text-muted">{hint}</span>
      </span>
      <ChevronRight size={18} aria-hidden="true" className="text-muted" />
    </>
  );
  const className = "-mx-2 flex min-h-16 w-[calc(100%+16px)] items-center gap-3 rounded-tile px-2 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus";
  return (
    <li>
      {href ? (
        <a href={href} download className={className}>
          {content}
        </a>
      ) : (
        <button type="button" onClick={onClick} className={className}>
          {content}
        </button>
      )}
    </li>
  );
}

/** Ações de dados, usadas em Segurança e dados (mobile) e em Ajustes (desktop). */
export function DataActions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearSession } = useAuth();
  const showToast = useToast();
  const [sheet, setSheet] = useState<"apagar" | "excluir" | null>(null);
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const open = (kind: "apagar" | "excluir") => {
    setSheet(kind);
    setConfirm("");
    setPassword("");
    setError("");
  };

  const wipe = async () => {
    setBusy(true);
    try {
      await accountService.wipe();
      await queryClient.invalidateQueries();
      setSheet(null);
      showToast({ message: "Seus dados foram apagados. Conta, categorias e cartões continuam." });
      navigate("/");
    } catch {
      setError("Não foi possível apagar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await accountService.deleteAccount(password);
      clearSession();
      navigate("/boas-vindas", { replace: true });
    } catch (cause) {
      const status = (cause as { response?: { status?: number } }).response?.status;
      setError(status === 403 ? "Senha incorreta." : "Não foi possível excluir a conta. Tente de novo.");
      setBusy(false);
    }
  };

  return (
    <>
      <ul>
        <Row icon={<Upload size={20} />} title="Importar extrato" hint="CSV ou OFX do banco ou do cartão" onClick={() => navigate("/importar")} />
        <Row icon={<Download size={20} />} title="Exportar meus dados" hint="Planilha CSV com todas as transações" href={accountService.exportUrl()} />
        <Row icon={<Trash2 size={20} />} title="Apagar todos os dados" hint="Mantém sua conta, categorias e cartões" danger onClick={() => open("apagar")} />
        <Row icon={<LogOut size={20} />} title="Excluir minha conta" hint="Remove tudo de forma permanente" danger onClick={() => open("excluir")} />
      </ul>
      <Sheet
        open={sheet === "apagar"}
        onClose={() => setSheet(null)}
        dismissible={!busy}
        title="Apagar todos os dados?"
        description="Transações, recorrentes, parcelas, orçamento, metas, pagamentos de fatura e importações serão apagados. Sua conta, categorias e cartões continuam. Não dá para desfazer."
        footer={
          <Button variant="danger" size="lg" block className="lg:w-auto" disabled={confirm !== "APAGAR"} loading={busy} onClick={wipe}>
            Apagar tudo
          </Button>
        }
      >
        <Field label="Para confirmar, digite APAGAR" error={error || undefined}>
          <TextInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="characters" />
        </Field>
      </Sheet>
      <Sheet
        open={sheet === "excluir"}
        onClose={() => setSheet(null)}
        dismissible={!busy}
        title="Excluir sua conta?"
        description="Tudo é removido de forma permanente, e você sai do app. Se quiser guardar uma cópia, exporte seus dados antes."
        footer={
          <Button variant="danger" size="lg" block className="lg:w-auto" disabled={!password} loading={busy} onClick={remove}>
            Excluir minha conta
          </Button>
        }
      >
        <Field label="Sua senha" error={error || undefined}>
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
      </Sheet>
    </>
  );
}

export function DataSettings() {
  return (
    <>
      <PageHeader back="/ajustes" title="Segurança e dados" />
      <DataActions />
      <p className="text-[13px] text-muted">Ações destrutivas sempre pedem confirmação.</p>
    </>
  );
}
