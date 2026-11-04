import { api } from "../services/api";
import type { AxiosAdapter } from "axios";

export const categories = [
  {
    id: "food",
    name: "Alimentação",
    type: "expense",
    active: true,
    color: "#16836b",
  },
  {
    id: "salary",
    name: "Trabalho",
    type: "income",
    active: true,
    color: "#5d6b80",
  },
];
export const requests: { url: string; method: string; data: unknown }[] = [];
export function installApiFixture(overrides: Record<string, unknown> = {}) {
  requests.length = 0;
  const adapter: AxiosAdapter = async (config) => {
    const url = config.url || "";
    requests.push({
      url,
      method: config.method || "get",
      data: config.data ? JSON.parse(config.data) : undefined,
    });
    const responses: Record<string, unknown> = {
      "/auth/me": {
        user: { id: "test-user", name: "Ana", email: "ana@example.test" },
      },
      "/categories": categories,
      "/transactions": [],
      "/recurring?type=income": [],
      "/recurring?type=expense": [],
      "/recurring/variations": [],
      "/investment": { defaultMonthlyAmount: 200 },
      "/investment/effective": {
        defaultMonthlyAmount: 200,
        overrideMonthlyAmount: null,
        effectiveMonthlyAmount: 200,
      },
      "/users/tutorial-status": { tutorialCompleted: true },
      ...overrides,
    };
    const response =
      responses[(config.method || "get") + " " + url] ?? responses[url] ?? {};
    const data = typeof response === "function" ? response(config) : response;
    if (data instanceof Error) throw data;
    return { config, data, status: 200, statusText: "OK", headers: {} };
  };
  api.defaults.adapter = adapter;
}
