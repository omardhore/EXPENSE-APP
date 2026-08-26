import { router } from "expo-router";
import { IncomeForm } from "@/components/IncomeForm";
import { useIncome } from "@/hooks/useIncome";

export default function NewIncomeScreen() {
  const { createIncome } = useIncome();

  return (
    <IncomeForm
      submitLabel="Add Income"
      onSubmit={async (input) => {
        const income = await createIncome(input);
        router.back();
        return income;
      }}
    />
  );
}
