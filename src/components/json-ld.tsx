interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Рендерит JSON-LD без `dangerouslySetInnerHTML`.
 * Используется для schema.org-разметки, которую Google рекомендует передавать в JSON-LD.
 * @param props - объект структурированных данных.
 * @returns `<script type="application/ld+json">` с сериализованными данными.
 */
export const JsonLd = ({ data }: JsonLdProps) => {
  return <script type="application/ld+json">{JSON.stringify(data)}</script>;
};
