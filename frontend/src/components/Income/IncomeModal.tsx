import {
  TransactionForm,
  type TransactionFormProps,
  type TransactionFormValues,
} from "../Shared/TransactionForm";

export type IncomeFormData = Pick<
  TransactionFormValues,
  "description" | "amount" | "categoryId" | "date"
>;
type Props = Omit<TransactionFormProps, "kind" | "recurring" | "onSubmit"> & {
  onSubmit: (data: IncomeFormData) => void | Promise<void>;
};
export function IncomeModal(props: Props) {
  return <TransactionForm {...props} kind="income" recurring={false} />;
}
