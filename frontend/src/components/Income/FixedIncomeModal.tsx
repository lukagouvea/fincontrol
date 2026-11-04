import {
  TransactionForm,
  type TransactionFormProps,
  type TransactionFormValues,
} from "../Shared/TransactionForm";

export type FixedIncomeFormData = Pick<
  TransactionFormValues,
  "description" | "amount" | "categoryId" | "day" | "startDate" | "endDate"
>;
type Props = Omit<TransactionFormProps, "kind" | "recurring" | "onSubmit"> & {
  onSubmit: (data: FixedIncomeFormData) => void | Promise<void>;
};
export function FixedIncomeModal(props: Props) {
  return <TransactionForm {...props} kind="income" recurring={true} />;
}
