import {
  TransactionForm,
  type TransactionFormProps,
  type TransactionFormValues,
} from "../Shared/TransactionForm";

export type FixedExpenseFormData = Pick<
  TransactionFormValues,
  "description" | "amount" | "categoryId" | "day" | "startDate" | "endDate"
>;
type Props = Omit<TransactionFormProps, "kind" | "recurring" | "onSubmit"> & {
  onSubmit: (data: FixedExpenseFormData) => void | Promise<void>;
};
export function FixedExpenseModal(props: Props) {
  return <TransactionForm {...props} kind="expense" recurring={true} />;
}
