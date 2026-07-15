type Props = {
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  required?: boolean;
  ariaLabel: string;
};

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

function createMonthOptions(selectedValue: string): Array<{
  value: string;
  label: string;
}> {
  const now = new Date();
  const options = new Map<string, string>();

  // Um ano à frente e dez anos de histórico, sempre em ordem decrescente.
  for (let offset = 12; offset >= -120; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const value = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    options.set(value, `${MONTH_NAMES[monthIndex]} de ${year}`);
  }

  // Preserva valores importados que eventualmente estejam fora da faixa padrão.
  if (selectedValue && !options.has(selectedValue)) {
    const [year, month] = selectedValue.split("-").map(Number);
    if (year && month >= 1 && month <= 12) {
      options.set(selectedValue, `${MONTH_NAMES[month - 1]} de ${year}`);
    }
  }

  return [...options.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((first, second) => second.value.localeCompare(first.value));
}

export function MonthSelect({
  value,
  onChange,
  allowEmpty = false,
  emptyLabel = "Todos os meses",
  required = false,
  ariaLabel,
}: Props) {
  const options = createMonthOptions(value);

  return (
    <select
      className="month-select-control"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      aria-label={ariaLabel}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
