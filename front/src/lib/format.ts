const uahFormatter = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number): string {
  return uahFormatter.format(amount);
}
