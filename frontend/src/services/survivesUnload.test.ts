import { afterEach, describe, expect, it, vi } from "vitest";
import { api, survivesUnload } from "./api";
import { categoryService } from "./categoryService";
import { transactionService } from "./transactionService";

/**
 * Exclusões adiadas pelo "Desfazer" saem quando o aviso some ou no pagehide.
 * Precisam de fetch com keepalive para não serem canceladas por um reload ou
 * pelo fechamento da aba (o XHR padrão do axios seria).
 */
describe("exclusões adiadas sobrevivem ao fechamento da página", () => {
  afterEach(() => vi.restoreAllMocks());

  it("usam fetch com keepalive", async () => {
    const del = vi.spyOn(api, "delete").mockResolvedValue({ data: undefined });
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
    await transactionService.delete("t1");
    await transactionService.batch({ action: "delete", ids: ["t1", "t2"] });
    await categoryService.delete("c1");
    await categoryService.merge("c1", "c2");
    expect(del).toHaveBeenCalledWith("/transactions/t1", survivesUnload);
    expect(del).toHaveBeenCalledWith("/categories/c1", survivesUnload);
    expect(post).toHaveBeenCalledWith("/transactions/batch", { action: "delete", ids: ["t1", "t2"] }, survivesUnload);
    expect(post).toHaveBeenCalledWith("/categories/c1/merge", { targetId: "c2" }, survivesUnload);
    expect(survivesUnload).toEqual({ adapter: "fetch", fetchOptions: { keepalive: true } });
  });
});
