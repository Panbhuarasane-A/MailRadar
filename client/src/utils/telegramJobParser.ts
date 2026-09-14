export interface ParsedTelegramJob {
  company: string;
  role: string;
  salary: string;
  qualification: string;
  location: string;
  postedDate: string;
  deadline: string;
  applyUrl: string | null;
  rawText: string;
  channel: string;
}

function cleanUnicode(str: string): string {
  if (!str) return '';
  let text = typeof (str as any).toWellFormed === 'function' ? (str as any).toWellFormed() : str;
  return text
    .replace(/\uFFFD/g, '')
    .replace(/[\uFFFE\uFFFF]/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .trim();
}

/**
 * Preprocesses raw Telegram text by ungluing merged field boundaries
 * (e.g. "Software EngineerJob Location: Bangalore" -> "Software Engineer\nJob Location: Bangalore")
 */
function preprocessTelegramText(input: string): string {
  // Normalize unicode (handles mathematical bold/italic characters e.g. 𝐓𝐞𝐫𝐚𝐝𝐚𝐭𝐚 -> Teradata)
  let text = cleanUnicode((input || '').normalize('NFKD'));

  // Known Telegram field delimiters
  const fieldHeaders = [
    'Job Role',
    'Role',
    'Post Name',
    'Position',
    'Profile',
    'Job Location',
    'Location',
    'Hiring Drive',
    'Drive Location',
    'Qualification',
    'Qualifications',
    'Eligibility',
    'Eligible Batches',
    'Eligible Degrees',
    'Batch',
    'Salary Package',
    'Salary',
    'Expected Salary',
    'CTC',
    'Stipend',
    'Package',
    'Pay',
    'Job Type',
    'Employment Type',
    'Experience',
    'Apply Link',
    'Application Link',
    'Registration Link',
    'Official Link',
    'Share with',
    'Share with your',
    'Last Date to Apply',
    'Last Date',
    'Deadline',
    'Apply Before',
  ];

  for (const header of fieldHeaders) {
    const reg = new RegExp(`([^\\n\\r])(${header}\\s*:)`, 'gi');
    text = text.replace(reg, '$1\n$2');
  }

  // Also unglue emojis that precede headers (e.g. 📌Job Role:)
  text = text.replace(/([🔔🚀🌟📢🔥💫📌📍🎓💰💼🔗|•])\s*([A-Za-z])/g, '$1 $2');

  return cleanUnicode(text);
}

/**
 * Cleans extracted values by removing trailing field prefixes if any remain
 */
function cleanFieldValue(val: string): string {
  if (!val) return '';
  return cleanUnicode(
    val
      .split(
        /\n|Job Location|Location|Qualification|Eligibility|Salary|Expected Salary|CTC|Stipend|Job Type|Apply Link|Registration Link|Share with|Last Date|Deadline/i
      )[0]
      .replace(/[🔔🚀🌟📢🔥💫📌📍🎓💰💼🔗|•-]+/g, ' ')
      .replace(/\s+/g, ' ')
  );
}

/**
 * Robustly extracts the company name from a Telegram hiring alert
 */
function extractCompanyName(text: string, firstLineClean: string): string {
  // 1. Pattern: <Company> is hiring / is offering / is recruiting / is looking for
  let m = firstLineClean.match(
    /^([A-Za-z0-9\s&.,'-]+?)\s+(?:is\s+)?(?:hiring|offering|recruiting|invites|inviting|announced|announces|looking for)/i
  );
  if (m && m[1] && m[1].trim().length > 1 && !/^(job|batch|role|new|urgent|alert|hiring)/i.test(m[1].trim())) {
    return m[1].trim();
  }

  // 2. Pattern: Company Name: <Company> or Employer: <Company>
  m = text.match(/(?:Company Name|Company|Employer|Organization|Hiring Company|Recruiter)\s*:\s*([^\n\r📍🎓💰💼🔗|]+)/i);
  if (m && m[1] && m[1].trim().length > 1) {
    return cleanFieldValue(m[1]);
  }

  // 3. Pattern: <Company> | 2026 Batch or <Company> - <Role>
  m = firstLineClean.match(/^([A-Za-z0-9\s&.,'-]{2,35})\s*(?:\||—|-)\s*(?:202\d|job|role|hiring|intern)/i);
  if (m && m[1] && !/^(job|batch|role|new|urgent|alert)/i.test(m[1].trim())) {
    return m[1].trim();
  }

  // 4. Pattern: Known top tech and recruitment companies
  const knownCompanies = [
    'Xpentra Technologies',
    'Teradata',
    'Amazon',
    'Infosys',
    'Cisco',
    'Honeywell',
    'ANZ',
    'ISS STOXX',
    'Yash Technologies',
    'Zoho',
    'Google',
    'Microsoft',
    'TCS',
    'Accenture',
    'Cognizant',
    'Wipro',
    'IBM',
    'Deloitte',
    'Paytm',
    'Revature',
    'Itron',
    'FIS',
    'IQVIA',
    'LTI',
    'Capgemini',
    'Tech Mahindra',
    'Oracle',
    'SAP',
  ];

  for (const k of knownCompanies) {
    if (new RegExp('\\b' + k + '\\b', 'i').test(text)) {
      return k;
    }
  }

  // 5. Pattern: First 1-3 capitalized words before "is" or "|"
  m = firstLineClean.match(/^([A-Z][A-Za-z0-9&.'-]+(?:\s+[A-Z][A-Za-z0-9&.'-]+){0,3})/);
  if (m && m[1] && m[1].length > 2 && !/^(Job|Batch|Role|New|Urgent|Alert|Software|Hiring)/i.test(m[1])) {
    return m[1].trim();
  }

  return 'Company Hiring';
}

/**
 * Accurately cleans extracted URLs and strips glued English words from shortlink hashes
 * (e.g. "https://pdlink.in/4qpVhZdShare" -> "https://pdlink.in/4qpVhZd")
 */
export function cleanShortlinkUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  let u = rawUrl.trim().replace(/[),.;]+$/, '');

  const shortlinkMatch = u.match(
    /^(https?:\/\/(?:pdlink\.in|bit\.ly|tinyurl\.com|t\.me|cutt\.ly|rb\.gy)\/)([A-Za-z0-9_-]+)/i
  );
  if (shortlinkMatch) {
    const base = shortlinkMatch[1];
    let hash = shortlinkMatch[2];

    const gluedWords = /(Share.*|Apply.*|Click.*|Join.*|WhatsApp.*|Telegram.*|Note.*|Batch.*|Drive.*|Role.*|Location.*|Salary.*|Job.*)$/i;
    if (hash.length > 5 && gluedWords.test(hash)) {
      hash = hash.replace(gluedWords, '');
    }
    return base + hash;
  }

  return u;
}

/**
 * Extracts structured job fields from raw Telegram messages
 */
export function parseTelegramJob(rawText: string, senderName: string = '', receivedAt?: string): ParsedTelegramJob {
  const text = preprocessTelegramText(rawText);

  // 1. Extract Apply Link & strip glued trailing words
  const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/);
  const applyUrl = urlMatch ? cleanShortlinkUrl(urlMatch[0]) : null;

  // Clean first line of symbols and emojis
  const firstLine = text.split('\n')[0] || '';
  const firstLineClean = firstLine.replace(/^[\s\p{Emoji}\p{Symbol}\p{Punctuation}]+/gu, '').trim();

  // 2. Extract Company Name
  const company = extractCompanyName(text, firstLineClean);

  // 3. Extract Job Role
  let role = '';
  const rolePatterns = [
    /(?:Job Role|Role|Post Name|Position|Profile)\s*:\s*([^\n\r]+)/i,
    /(?:Hiring|Offering)\s+([^\n\r!]+?)(?:!|\s*\|\s*202|\s*\n)/i,
  ];

  for (const pat of rolePatterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      role = cleanFieldValue(m[1]);
      if (role.length > 2) break;
    }
  }

  // 4. Extract Salary / Package / Stipend
  let salary = '';
  const salaryPatterns = [
    /(?:Salary Package|Salary|Expected Salary|CTC|Stipend|Package|Pay)\s*:\s*([^\n\r]+)/i,
    /(?:₹\s*[\d.]+\s*(?:LPA|k|month|pm|per month)[\s–-]*₹?\s*[\d.]*\s*(?:LPA|k|month|pm|per month)?)/i,
    /(?:[\d.]+\s*[-–]\s*[\d.]+\s*LPA)/i,
  ];

  for (const pat of salaryPatterns) {
    const m = text.match(pat);
    if (m) {
      salary = cleanFieldValue(m[1] || m[0]);
      if (salary.length > 1) break;
    }
  }

  // 5. Extract Qualification / Batch Eligibility
  let qualification = '';
  const qualPatterns = [
    /(?:Qualification|Qualifications|Eligibility|Eligible Batches|Eligible Degrees|Batch)\s*:\s*([^\n\r]+)/i,
    /(?:202[3-7]\s*(?:[-–]\s*202[3-7])?\s*(?:Batch|Graduates|Passouts)?)/i,
    /(?:B\.?E\.?\/B\.?Tech|B\.?E\.?|B\.?Tech|M\.?E\.?|M\.?Tech|MCA|BCA|B\.?Sc|Any Graduate|All Branches)/i,
  ];

  for (const pat of qualPatterns) {
    const m = text.match(pat);
    if (m) {
      qualification = cleanFieldValue(m[1] || m[0]);
      if (qualification.length > 2) break;
    }
  }

  // 6. Extract Location
  let location = '';
  const locPatterns = [
    /(?:Job Location|Location|Hiring Drive|Drive Location)\s*:\s*([^\n\r]+)/i,
    /(?:Work From Home|Remote|Hybrid|Across India|Bengaluru|Bangalore|Chennai|Pune|Hyderabad|Mumbai|Maharashtra|Noida|Gurgaon|Delhi)/i,
  ];

  for (const pat of locPatterns) {
    const m = text.match(pat);
    if (m) {
      location = cleanFieldValue(m[1] || m[0]);
      if (location.length > 2) break;
    }
  }

  // 7. Extract Deadline / Last Date
  let deadline = '';
  const deadlinePatterns = [
    /(?:Last Date to Apply|Last Date|Deadline|Apply Before|Registration Deadline)\s*:\s*([^\n\r]+)/i,
    /(?:closes\s+(?:today|tomorrow|at\s+[\d:]+\s*(?:am|pm)?|on\s+[A-Za-z]+\s*\d*))/i,
  ];

  for (const pat of deadlinePatterns) {
    const m = text.match(pat);
    if (m) {
      deadline = cleanFieldValue(m[1] || m[0]);
      if (deadline.length > 1) break;
    }
  }

  // 8. Format Posted Date
  let postedDate = 'Recently';
  if (receivedAt) {
    try {
      const d = new Date(receivedAt);
      postedDate = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      postedDate = 'Recently';
    }
  }

  return {
    company: company || 'Company Hiring',
    role: role || 'Software / Technical Role',
    salary: salary || 'Competitive Package',
    qualification: qualification || 'B.E / B.Tech / MCA (Any Degree)',
    location: location || 'Multiple Locations / Remote',
    postedDate,
    deadline: deadline || 'Apply ASAP (Active)',
    applyUrl,
    rawText: text,
    channel: senderName || 'Telegram Placement Channel',
  };
}
