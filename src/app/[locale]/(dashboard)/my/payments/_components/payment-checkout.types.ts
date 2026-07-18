export type LocalizedPaymentText = Record<string, string>;

export type PaymentServicePackage = {
  id: string;
  amount: string;
  currency: string;
  includedMinutes: number;
  title: LocalizedPaymentText;
  description: LocalizedPaymentText | null;
  coverImage: string | null;
};
