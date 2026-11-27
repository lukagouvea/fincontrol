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
      "/recurring/payments": [],
      "/cards": [],
      "/budgets": [],
      "/goals": [],
      "/transactions/installments/active": [],
      ...overrides,
    };
    const response =
      responses[(config.method || "get") + " " + url] ?? responses[url] ?? {};
    // Erros levam o config da requisição, como os do axios.
    const fail = (error: Error) => Object.assign(error, { config: (error as { config?: unknown }).config ?? config });
    let data: unknown;
    try {
      data = typeof response === "function" ? await response(config) : response;
    } catch (error) {
      throw error instanceof Error ? fail(error) : error;
    }
    if (data instanceof Error) throw fail(data);
    return { config, data, status: 200, statusText: "OK", headers: {} };
  };
  api.defaults.adapter = adapter;
}
