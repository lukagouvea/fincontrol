import {
  TransactionForm,
  type TransactionFormProps,
  type TransactionFormValues,
} from "../Shared/TransactionForm";

export type ExpenseFormData = Pick<
  TransactionFormValues,
  | "description"
  | "amount"
  | "categoryId"
  | "date"
  | "isInstallment"
  | "installmentCount"
>;
type Props = Omit<TransactionFormProps, "kind" | "recurring" | "onSubmit"> & {
  onSubmit: (data: ExpenseFormData) => void | Promise<void>;
};
export function ExpenseModal(props: Props) {
  return <TransactionForm {...props} kind="expense" recurring={false} />;
}
