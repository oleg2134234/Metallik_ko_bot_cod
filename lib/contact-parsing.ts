// Phone/email extraction ported as-is from the working technical bot
// (deploy/technical/server.mjs) — these regexes are already exercised there
// against real client messages.
export function extractPhone(value = ''): string {
  const matches = String(value).match(/(?:\+?\d[\d\s().-]{8,}\d)/g) || [];
  for (const match of matches) {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) continue;
    if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
    if (digits.length === 10) return `+7${digits}`;
    return match.trim().replace(/^00/, '+');
  }
  return '';
}

export function extractEmail(value = ''): string {
  return String(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

// Extends the bot's @mention regex with the t.me/username link form, since
// that's the exact example the contact-import dialog shows to users.
export function extractTelegram(value = ''): string {
  const text = String(value);
  const link = text.match(/t\.me\/([A-Za-z0-9_]{5,32})/i);
  if (link) return `@${link[1]}`;
  const mention = text.match(/(?:^|\s)@([A-Za-z0-9_]{5,32})(?=\s|$|[.,!?;:])/);
  return mention ? `@${mention[1]}` : '';
}

export type ParsedContact = {
  name: string;
  company: string;
  email: string;
  phone: string;
  telegram: string;
};

// One line, comma-separated: contact method(s) plus free-text name/company,
// matching the placeholder already shown in the import dialog, e.g.
// "+7 999 123-45-67, Иван, СтройСервис" or "https://t.me/username".
export function parseContactLine(line: string): ParsedContact {
  const phone = extractPhone(line);
  const email = extractEmail(line);
  const telegram = extractTelegram(line);

  const rest = line
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .filter((part) => !extractPhone(part) && !extractEmail(part) && !extractTelegram(part));

  const [name = '', company = ''] = rest;
  return { name, company, email, phone, telegram };
}
