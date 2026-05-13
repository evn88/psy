export type LocalizedPaymentText = Record<string, string>;

export type PaymentServicePackage = {
  id: string;
  amount: string;
  currency: string;
  title: LocalizedPaymentText;
  description: LocalizedPaymentText | null;
  coverImage: string | null;
};
