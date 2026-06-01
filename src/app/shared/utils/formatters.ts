export function formatTnd(amount: number): string {
  let formattedAmount = new Intl.NumberFormat('fr-TN', {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(amount);

  if (Math.abs(amount) >= 1000 && !/[\s.,]/.test(formattedAmount)) {
    formattedAmount = Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  return `${formattedAmount} TND`;
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('fr-TN', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDecimal(value: number): string {
  return new Intl.NumberFormat('fr-TN', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-TN', {
    dateStyle: 'full',
  }).format(date);
}

export function isCurrentMonth(isoDate: string, now = new Date()): boolean {
  const date = new Date(isoDate);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(0, (end - start) / 86_400_000);
}

export function daysSince(isoDate: string, now = new Date()): number {
  return Math.max(0, (now.getTime() - new Date(isoDate).getTime()) / 86_400_000);
}
