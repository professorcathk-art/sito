export type PayoutMethod = "stripe_connect" | "manual_transfer";

export interface BankDetails {
  recipientName: string;
  country: string;
  swiftBic: string;
  ibanOrAccount: string;
  bankCode?: string;
}

export function isBankDetailsComplete(bank?: BankDetails | null): boolean {
  if (!bank) return false;
  return Boolean(
    bank.recipientName?.trim() &&
      bank.country?.trim() &&
      bank.swiftBic?.trim() &&
      bank.ibanOrAccount?.trim()
  );
}

/** Online Stripe collection is allowed when payout route is configured */
export function canCollectOnlinePayments(opts: {
  payout_method?: string | null;
  stripe_connect_onboarding_complete?: boolean | null;
  stripe_connect_account_id?: string | null;
  bank_details?: BankDetails | null;
}): boolean {
  if (opts.payout_method === "stripe_connect") {
    return !!(opts.stripe_connect_account_id && opts.stripe_connect_onboarding_complete);
  }
  if (opts.payout_method === "manual_transfer") {
    return isBankDetailsComplete(opts.bank_details);
  }
  return false;
}

export function formatBankSummary(bank?: BankDetails | Record<string, unknown> | null): string {
  if (!bank) return "—";
  const b = bank as BankDetails;
  const acct = String(b.ibanOrAccount || "");
  const masked = acct.length > 4 ? `••••${acct.slice(-4)}` : acct;
  return [b.recipientName, b.country, b.swiftBic, masked].filter(Boolean).join(" · ");
}

export function buildWiseCsv(rows: Array<{
  recipientName: string;
  country?: string;
  swiftBic?: string;
  ibanOrAccount?: string;
  bankCode?: string;
  amount: number;
  currency: string;
  reference: string;
  email?: string;
}>): string {
  const header = [
    "name",
    "recipientEmail",
    "paymentReference",
    "receiverType",
    "amountCurrency",
    "amount",
    "sourceCurrency",
    "IBAN",
    "SWIFT/BIC",
    "accountNumber",
    "bankCode",
    "country",
  ].join(",");

  const escape = (v: string) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = rows.map((r) => {
    const looksIban = /^[A-Z]{2}\d{2}/i.test(r.ibanOrAccount || "");
    return [
      escape(r.recipientName),
      escape(r.email || ""),
      escape(r.reference),
      "PERSON",
      escape((r.currency || "usd").toUpperCase()),
      escape(Number(r.amount).toFixed(2)),
      "USD",
      escape(looksIban ? r.ibanOrAccount || "" : ""),
      escape(r.swiftBic || ""),
      escape(looksIban ? "" : r.ibanOrAccount || ""),
      escape(r.bankCode || ""),
      escape(r.country || ""),
    ].join(",");
  });

  return [header, ...lines].join("\n");
}
