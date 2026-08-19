import { router } from "expo-router";
import { ExpenseForm } from "@/components/ExpenseForm";
import { useExpenses } from "@/hooks/useExpenses";

export default function NewExpenseScreen() {
  const { createExpense } = useExpenses();

  return (
    <ExpenseForm
      submitLabel="Add Expense"
      onSubmit={async (input) => {
        const expense = await createExpense(input);
        router.back();
        return expense;
      }}
    />
  );
}
