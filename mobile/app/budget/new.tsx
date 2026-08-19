import { router } from "expo-router";
import { BudgetForm } from "@/components/BudgetForm";
import { useBudgets } from "@/hooks/useBudgets";

export default function NewBudgetScreen() {
  const { createBudget } = useBudgets();

  return (
    <BudgetForm
      submitLabel="Add Budget"
      onSubmit={async (input) => {
        const budget = await createBudget(input);
        router.back();
        return budget;
      }}
    />
  );
}
