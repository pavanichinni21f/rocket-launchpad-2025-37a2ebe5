export function detectCountryFromLocale(): string {
  try {
    const locale = navigator.language || (navigator as any).userLanguage || 'en-US';
    const parts = locale.split('-');
    return (parts[1] || 'US').toUpperCase();
  } catch (e) {
    return 'US';
  }
}

export function currencyForCountry(countryCode: string) {
  const map: Record<string, string> = {
    US: 'USD',
    IN: 'INR',
    GB: 'GBP',
    EU: 'EUR',
    DE: 'EUR',
    FR: 'EUR',
    CA: 'CAD',
  };
  return map[countryCode] || 'USD';
}

export function taxRateForCountry(countryCode: string) {
  // Simplified rules: India 18% GST, EU 20% VAT, US 0% (sales tax handled separately)
  const eu = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
  if (countryCode === 'IN') return 0.18;
  if (eu.includes(countryCode)) return 0.20;
  return 0.0;
}

export function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch (e) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
