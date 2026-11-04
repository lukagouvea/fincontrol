import { createContext, useContext, useState, type ReactNode } from "react";
import {
  useAddTransaction,
  useAddCompraParcelada,
} from "../../hooks/useTransactions";
import { ExpenseModal, type ExpenseFormData } from "../Expenses/ExpenseModal";
import { IncomeModal, type IncomeFormData } from "../Income/IncomeModal";
import { Dialog } from "../Shared/Dialog";
import { Button } from "../Shared/UI";
import {
  convertDateToUTCISOString,
  parseDateInputToLocal,
} from "../../utils/dateUtils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

const QuickAddContext = createContext<() => void>(() => {});
export const useQuickAdd = () => useContext(QuickAddContext);
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<"choose" | "expense" | "income" | null>(
    null,
  );
  const add = useAddTransaction();
  const installments = useAddCompraParcelada();
  const submit = async (data: ExpenseFormData | IncomeFormData) => {
    const date = convertDateToUTCISOString(parseDateInputToLocal(data.date));
    if ("isInstallment" in data && data.isInstallment) {
      await installments.mutateAsync({
        ...data,
        date,
        numParcelas: data.installmentCount,
      });
    } else
      await add.mutateAsync({
        description: data.description,
        amount: data.amount,
        categoryId: data.categoryId,
        date,
        type: kind === "income" ? "income" : "expense",
      });
    setKind(null);
  };
  return (
    <QuickAddContext.Provider value={() => setKind("choose")}>
      {children}
      <Dialog
        open={kind === "choose"}
        onClose={() => setKind(null)}
        title="Novo lançamento"
        variant="confirmation"
        description="O que você quer registrar?"
      >
        <div className="quick-choices">
          <Button variant="secondary" onClick={() => setKind("expense")}>
            <ArrowUpRight />
            Despesa
          </Button>
          <Button variant="secondary" onClick={() => setKind("income")}>
            <ArrowDownLeft />
            Receita
          </Button>
        </div>
      </Dialog>
      <ExpenseModal
        isOpen={kind === "expense"}
        onClose={() => setKind(null)}
        onSubmit={submit}
        isLoading={add.isPending || installments.isPending}
      />
      <IncomeModal
        isOpen={kind === "income"}
        onClose={() => setKind(null)}
        onSubmit={submit}
        isLoading={add.isPending}
      />
    </QuickAddContext.Provider>
  );
}
