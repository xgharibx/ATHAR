/**
 * Sources the assistant may link to.
 *
 * Mirrors TRUSTED_SOURCE_DOMAINS in supabase/functions/companion/sources.ts,
 * which restricts the search itself. This copy is the second line of defence:
 * the chat never renders a clickable link to a host outside the list, whatever
 * the model writes.
 */
export const TRUSTED_SOURCE_DOMAINS: readonly string[] = [
  "dorar.net",
  "islamweb.net",
  "islamqa.info",
  "binbaz.org.sa",
  "binothaimeen.net",
  "alifta.gov.sa",
  "dar-alifta.org",
  "aliftaa.jo",
  "quran.com",
  "quranenc.com",
  "sunnah.com",
  "hadeethenc.com",
  "shamela.ws",
];

/** True only for an https link whose host is a trusted domain or its subdomain. */
export function isTrustedSourceUrl(href: string | undefined | null): boolean {
  if (!href) return false;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  return TRUSTED_SOURCE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
