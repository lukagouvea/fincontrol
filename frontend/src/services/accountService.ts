import { api } from './api';

export const accountService = {
  setAlertPrefs: async (prefs: Record<string, boolean>): Promise<{ alertPrefs: Record<string, boolean> }> =>
    (await api.put('/me/alerts/preferences', prefs)).data,
  markAlertsRead: async (): Promise<{ alertsReadAt: string }> => (await api.post('/me/alerts/read')).data,
  /** CSV com todas as transações (o navegador baixa pelo próprio link). */
  exportUrl: () => `${api.defaults.baseURL ?? ''}/me/export.csv`,
  wipe: async () => (await api.post('/me/wipe', { confirm: 'APAGAR' })).data,
  deleteAccount: async (password: string) => (await api.delete('/me', { data: { password } })).data,
};
