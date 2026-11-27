import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { accountService } from "../services/accountService";
import { ALERT_OPTIONS, resolvePrefs, type AlertKey } from "../features/alerts";
import { Card } from "../ui/Card";
import { PageHeader } from "../ui/PageHeader";
import { Toggle } from "../ui/Toggle";
import { useToast } from "../ui/Toast";

/** Liga/desliga os tipos de alerta (ConfigAlertas.html). Salva a cada toque. */
export function AlertToggles() {
  const { currentUser, patchUser } = useAuth();
  const showToast = useToast();
  const prefs = resolvePrefs(currentUser?.alertPrefs);
  const [saving, setSaving] = useState<AlertKey | null>(null);

  const toggle = async (key: AlertKey, value: boolean) => {
    const previous = currentUser?.alertPrefs ?? null;
    patchUser({ alertPrefs: { ...prefs, [key]: value } });
    setSaving(key);
    try {
      const { alertPrefs } = await accountService.setAlertPrefs({ [key]: value });
      patchUser({ alertPrefs });
    } catch {
      patchUser({ alertPrefs: previous });
      showToast({ message: "Não foi possível salvar a preferência." });
    } finally {
      setSaving(null);
    }
  };

  return (
    <ul>
      {ALERT_OPTIONS.map((option) => (
        <li key={option.key} className="flex min-h-16 items-center justify-between gap-3 border-t border-border py-2 first:border-t-0">
          <span>
            <span className="block text-[15px] font-semibold">{option.title}</span>
            <span className="block text-[13px] text-muted">{option.hint}</span>
          </span>
          <Toggle checked={prefs[option.key]} disabled={saving === option.key} onChange={(value) => toggle(option.key, value)} label={option.title} />
        </li>
      ))}
    </ul>
  );
}

export function AlertSettings() {
  return (
    <>
      <PageHeader back="/ajustes" title="Alertas" />
      <Card className="max-w-[720px]">
        <AlertToggles />
      </Card>
      <p className="max-w-[720px] text-[13px] text-muted">
        Os alertas aparecem no sino do Início. Notificações no aparelho chegam numa próxima versão do app instalado.
      </p>
    </>
  );
}
