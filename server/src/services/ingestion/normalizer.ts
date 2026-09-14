export interface NormalizedEmailInput {
  userId: string;
  externalId?: string;
  provider: 'gmail' | 'outlook' | 'simulated';
  sender: string;
  senderName?: string;
  recipient: string;
  subject: string;
  bodySnippet: string;
  bodyFull?: string;
  receivedAt?: Date;
}

export function normalizeEmail(raw: any, provider: 'gmail' | 'outlook' | 'simulated', userId: string): NormalizedEmailInput {
  if (provider === 'gmail') {
    const headers = raw.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    
    const fromHeader = getHeader('from');
    const fromMatch = fromHeader.match(/(.*?)\s*<(.+?)>/) || [null, fromHeader, fromHeader];
    const senderName = fromMatch[1]?.replace(/"/g, '').trim() || undefined;
    const sender = fromMatch[2]?.trim() || fromHeader;
    
    return {
      userId,
      externalId: raw.id,
      provider: 'gmail',
      sender,
      senderName,
      recipient: getHeader('to'),
      subject: getHeader('subject') || '(No Subject)',
      bodySnippet: raw.snippet || '',
      bodyFull: raw.snippet || '',
      receivedAt: raw.internalDate ? new Date(parseInt(raw.internalDate, 10)) : new Date(),
    };
  }

  if (provider === 'outlook') {
    return {
      userId,
      externalId: raw.id,
      provider: 'outlook',
      sender: raw.from?.emailAddress?.address || 'unknown@outlook.com',
      senderName: raw.from?.emailAddress?.name || undefined,
      recipient: raw.toRecipients?.[0]?.emailAddress?.address || '',
      subject: raw.subject || '(No Subject)',
      bodySnippet: raw.bodyPreview || '',
      bodyFull: raw.body?.content || raw.bodyPreview || '',
      receivedAt: raw.receivedDateTime ? new Date(raw.receivedDateTime) : new Date(),
    };
  }

  // Simulated / internal provider
  return {
    userId,
    externalId: raw.externalId || `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    provider: 'simulated',
    sender: raw.sender,
    senderName: raw.senderName,
    recipient: raw.recipient || 'user@mailradar.internal',
    subject: raw.subject || '(No Subject)',
    bodySnippet: raw.bodySnippet || raw.bodyFull?.slice(0, 160) || '',
    bodyFull: raw.bodyFull || raw.bodySnippet || '',
    receivedAt: raw.receivedAt ? new Date(raw.receivedAt) : new Date(),
  };
}

/** Redacts sensitive content for log safety */
export function sanitizeForLogging(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[REDACTED_CC]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    .replace(/(password|token|secret|apiKey)[:=]\s*["']?[^"'\s]+/gi, '$1=[REDACTED]');
}
