import React, { useState, useEffect, useMemo } from 'react';
import { Email } from '../../types';
import { parseTelegramJob } from '../../utils/telegramJobParser';
import { extractEmailActionLinks } from '../../utils/linkExtractor';
import { isExcludedFromCalendar } from '../../utils/categoryClassifier';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Video,
  PhoneCall,
  ExternalLink,
  MapPin,
  User,
  Check,
  Building2,
  X,
  Sparkles,
  AlertCircle,
  Tag,
  Award,
  Zap,
  Layers,
  CalendarCheck,
  Search,
  Filter,
  Landmark,
  PartyPopper,
  Flame,
  RefreshCw,
  Mail,
  FileText,
  Send,
} from 'lucide-react';

export interface CallTaskItem {
  id: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // e.g. "03:00 PM"
  title: string;
  company?: string;
  category: 'interview' | 'hr-call' | 'followup' | 'campus-drive' | 'assessment' | 'deadline';
  meetingLink?: string;
  interviewer?: string;
  notes?: string;
  completed: boolean;
  priority?: 'urgent' | 'important' | 'normal';
}

export interface CalendarMailEvent {
  id: string;
  emailId: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // e.g. "03:00 PM" or "All Day"
  title: string;
  subtitle: string;
  source: 'mail' | 'telegram' | 'task';
  category: 'interview' | 'assessment' | 'deadline' | 'campus-drive' | 'meeting' | 'action';
  priority: 'urgent' | 'important' | 'normal';
  applyUrl?: string | null;
  meetingLink?: string | null;
  interviewer?: string | null;
  company?: string | null;
  completed: boolean;
  rawEmail?: Email;
  sourceTextSnippet?: string;
}

export interface HolidayItem {
  id: string;
  dateStr: string; // YYYY-MM-DD
  name: string;
  type: 'national' | 'gazetted' | 'festival' | 'observance';
  emoji: string;
  description: string;
}

export const HOLIDAYS_DATABASE: HolidayItem[] = [
  // --- 2025 ---
  { id: 'h25-01', dateStr: '2025-01-01', name: "New Year's Day", type: 'festival', emoji: '🎉', description: 'Global New Year celebration & public holiday.' },
  { id: 'h25-02', dateStr: '2025-01-14', name: 'Makar Sankranti / Pongal', type: 'festival', emoji: '🌾', description: 'Harvest festival celebrated across India (Pongal / Uttarayan / Maghi).' },
  { id: 'h25-03', dateStr: '2025-01-26', name: 'Republic Day', type: 'national', emoji: '🇮🇳', description: 'National Holiday commemorating the adoption of the Constitution of India (1950).' },
  { id: 'h25-04', dateStr: '2025-02-26', name: 'Maha Shivratri', type: 'gazetted', emoji: '🔱', description: 'Great Night of Shiva celebrated with fasting and meditation.' },
  { id: 'h25-05', dateStr: '2025-03-14', name: 'Holi', type: 'gazetted', emoji: '🎨', description: 'Festival of colors celebrating spring, love, and the triumph of good.' },
  { id: 'h25-06', dateStr: '2025-03-31', name: 'Eid-ul-Fitr (Ramzan Eid)', type: 'gazetted', emoji: '🌙', description: 'Islamic festival marking the end of the fasting month of Ramadan.' },
  { id: 'h25-07', dateStr: '2025-04-14', name: 'Dr. Ambedkar Jayanti / Tamil New Year', type: 'gazetted', emoji: '📚', description: 'Birth anniversary of Dr. B.R. Ambedkar & Puthandu celebration.' },
  { id: 'h25-08', dateStr: '2025-04-18', name: 'Good Friday', type: 'gazetted', emoji: '✝️', description: 'Christian holiday commemorating the passion and crucifixion of Jesus.' },
  { id: 'h25-09', dateStr: '2025-04-20', name: 'Easter Sunday', type: 'festival', emoji: '🥚', description: 'Celebration of the resurrection of Jesus Christ.' },
  { id: 'h25-10', dateStr: '2025-05-01', name: 'International Labour Day / May Day', type: 'gazetted', emoji: '🛠️', description: 'International Workers’ Day celebrating the labor movement.' },
  { id: 'h25-11', dateStr: '2025-05-12', name: 'Buddha Purnima', type: 'gazetted', emoji: '🪷', description: 'Commemorating the birth, enlightenment, and death of Gautama Buddha.' },
  { id: 'h25-12', dateStr: '2025-06-07', name: 'Bakrid / Eid-ul-Adha', type: 'gazetted', emoji: '🐑', description: 'Feast of the Sacrifice honoring the devotion of Prophet Ibrahim.' },
  { id: 'h25-13', dateStr: '2025-07-06', name: 'Muharram (Ashura)', type: 'gazetted', emoji: '🕌', description: 'First month of Islamic calendar; mourning day of Ashura.' },
  { id: 'h25-14', dateStr: '2025-08-15', name: 'Independence Day', type: 'national', emoji: '🇮🇳', description: 'National Holiday celebrating Indian Independence achieved in 1947.' },
  { id: 'h25-15', dateStr: '2025-08-16', name: 'Krishna Janmashtami', type: 'festival', emoji: '🦚', description: 'Celebration of the birth of Lord Krishna.' },
  { id: 'h25-16', dateStr: '2025-08-27', name: 'Ganesh Chaturthi', type: 'festival', emoji: '🐘', description: 'Grand Hindu festival honoring the elephant-headed deity Ganesha.' },
  { id: 'h25-17', dateStr: '2025-09-05', name: 'Onam & Milad-un-Nabi', type: 'gazetted', emoji: '🌸', description: 'Kerala harvest festival Onam & Prophet Muhammad’s birthday.' },
  { id: 'h25-18', dateStr: '2025-10-01', name: 'Maha Navami / Ayudha Puja', type: 'gazetted', emoji: '⚔️', description: 'Worship of tools, instruments, books, and machinery during Navratri.' },
  { id: 'h25-19', dateStr: '2025-10-02', name: 'Mahatma Gandhi Jayanti & Dussehra', type: 'national', emoji: '🇮🇳', description: 'National Holiday (Gandhi Jayanti) & Vijaya Dashami (Victory of Good over Evil).' },
  { id: 'h25-20', dateStr: '2025-10-20', name: 'Diwali / Deepavali', type: 'gazetted', emoji: '🪔', description: 'Festival of Lights celebrating prosperity, light over darkness, and new beginnings.' },
  { id: 'h25-21', dateStr: '2025-11-05', name: 'Guru Nanak Jayanti', type: 'gazetted', emoji: 'ੴ', description: 'Gurpurab celebrating the birth of the founder of Sikhism, Guru Nanak.' },
  { id: 'h25-22', dateStr: '2025-12-25', name: 'Christmas Day', type: 'gazetted', emoji: '🎄', description: 'Christian holiday celebrating the nativity and birth of Jesus Christ.' },

  // --- 2026 ---
  { id: 'h26-01', dateStr: '2026-01-01', name: "New Year's Day", type: 'festival', emoji: '🎉', description: 'Global New Year celebration & public holiday.' },
  { id: 'h26-02', dateStr: '2026-01-14', name: 'Makar Sankranti / Pongal', type: 'festival', emoji: '🌾', description: 'Harvest festival celebrated across India (Pongal / Uttarayan / Maghi).' },
  { id: 'h26-03', dateStr: '2026-01-26', name: 'Republic Day', type: 'national', emoji: '🇮🇳', description: 'National Holiday commemorating the adoption of the Constitution of India (1950).' },
  { id: 'h26-04', dateStr: '2026-02-15', name: 'Maha Shivratri', type: 'gazetted', emoji: '🔱', description: 'Great Night of Shiva celebrated with devotion and fasting.' },
  { id: 'h26-05', dateStr: '2026-03-04', name: 'Holi', type: 'gazetted', emoji: '🎨', description: 'Festival of vibrant colors celebrating triumph of good over evil.' },
  { id: 'h26-06', dateStr: '2026-03-20', name: 'Eid-ul-Fitr (Ramzan Eid)', type: 'gazetted', emoji: '🌙', description: 'Islamic festival marking the culmination of the Holy month of Ramadan.' },
  { id: 'h26-07', dateStr: '2026-04-03', name: 'Good Friday', type: 'gazetted', emoji: '✝️', description: 'Solemn Christian holiday commemorating the passion of Jesus.' },
  { id: 'h26-08', dateStr: '2026-04-05', name: 'Easter Sunday', type: 'festival', emoji: '🥚', description: 'Resurrection Sunday observed worldwide with feast and joy.' },
  { id: 'h26-09', dateStr: '2026-04-14', name: 'Dr. Ambedkar Jayanti / Tamil New Year', type: 'gazetted', emoji: '📚', description: 'Birth anniversary of Bharat Ratna Dr. B.R. Ambedkar & Puthandu.' },
  { id: 'h26-10', dateStr: '2026-05-01', name: 'International Labour Day / May Day', type: 'gazetted', emoji: '🛠️', description: 'International Workers’ Day celebrating workers’ rights and dignity.' },
  { id: 'h26-11', dateStr: '2026-05-27', name: 'Bakrid / Eid-ul-Adha', type: 'gazetted', emoji: '🐑', description: 'Feast of the Sacrifice observed with charity and prayer.' },
  { id: 'h26-12', dateStr: '2026-05-31', name: 'Buddha Purnima', type: 'gazetted', emoji: '🪷', description: 'Commemorating the birth and enlightenment of Lord Buddha.' },
  { id: 'h26-13', dateStr: '2026-06-26', name: 'Muharram (Ashura)', type: 'gazetted', emoji: '🕌', description: 'Solemn Day of Ashura in the first month of Islamic calendar.' },
  { id: 'h26-14', dateStr: '2026-08-15', name: 'Independence Day', type: 'national', emoji: '🇮🇳', description: 'National Holiday celebrating Indian sovereignty and independence.' },
  { id: 'h26-15', dateStr: '2026-08-25', name: 'Milad-un-Nabi (Id-e-Milad)', type: 'gazetted', emoji: '✨', description: 'Prophet Muhammad’s birthday celebrations and prayers.' },
  { id: 'h26-16', dateStr: '2026-08-26', name: 'Onam (Thiruvonam)', type: 'festival', emoji: '🌸', description: 'Grand traditional harvest celebration in Kerala.' },
  { id: 'h26-17', dateStr: '2026-08-28', name: 'Raksha Bandhan', type: 'festival', emoji: '🧵', description: 'Celebration of protective bond and love between siblings.' },
  { id: 'h26-18', dateStr: '2026-09-04', name: 'Krishna Janmashtami', type: 'festival', emoji: '🦚', description: 'Gokulashtami celebrating the divine birth of Lord Krishna.' },
  { id: 'h26-19', dateStr: '2026-09-14', name: 'Ganesh Chaturthi', type: 'festival', emoji: '🐘', description: 'Ten-day celebration of Lord Vinayaka / Ganesha.' },
  { id: 'h26-20', dateStr: '2026-10-02', name: 'Mahatma Gandhi Jayanti', type: 'national', emoji: '🇮🇳', description: 'National Holiday celebrating the Father of the Nation, Mahatma Gandhi.' },
  { id: 'h26-21', dateStr: '2026-10-20', name: 'Ayudha Puja / Maha Navami', type: 'gazetted', emoji: '⚔️', description: 'Auspicious day for sanctifying vocational instruments and work gear.' },
  { id: 'h26-22', dateStr: '2026-10-21', name: 'Vijaya Dashami / Dussehra', type: 'gazetted', emoji: '🏹', description: 'Culmination of Navratri celebrating the victory of Dharma.' },
  { id: 'h26-23', dateStr: '2026-11-08', name: 'Deepavali / Diwali', type: 'gazetted', emoji: '🪔', description: 'Grand Festival of Lights, fireworks, sweets, and prosperity.' },
  { id: 'h26-24', dateStr: '2026-11-24', name: 'Guru Nanak Jayanti', type: 'gazetted', emoji: 'ੴ', description: 'Gurpurab celebrating the auspicious birth of Guru Nanak Dev Ji.' },
  { id: 'h26-25', dateStr: '2026-12-25', name: 'Christmas Day', type: 'gazetted', emoji: '🎄', description: 'Worldwide Christian holiday celebrating the birth of Jesus Christ.' },

  // --- 2027 ---
  { id: 'h27-01', dateStr: '2027-01-01', name: "New Year's Day", type: 'festival', emoji: '🎉', description: 'Global New Year celebration & public holiday.' },
  { id: 'h27-02', dateStr: '2027-01-14', name: 'Makar Sankranti / Pongal', type: 'festival', emoji: '🌾', description: 'Harvest festival celebrated across India.' },
  { id: 'h27-03', dateStr: '2027-01-26', name: 'Republic Day', type: 'national', emoji: '🇮🇳', description: 'National Holiday commemorating the adoption of the Constitution of India.' },
  { id: 'h27-04', dateStr: '2027-03-06', name: 'Maha Shivratri', type: 'gazetted', emoji: '🔱', description: 'Great Night of Shiva celebrated with fasting and devotion.' },
  { id: 'h27-05', dateStr: '2027-03-10', name: 'Eid-ul-Fitr (Ramzan Eid)', type: 'gazetted', emoji: '🌙', description: 'Islamic festival marking the end of Ramadan.' },
  { id: 'h27-06', dateStr: '2027-03-23', name: 'Holi', type: 'gazetted', emoji: '🎨', description: 'Festival of colors and arrival of spring.' },
  { id: 'h27-07', dateStr: '2027-03-26', name: 'Good Friday', type: 'gazetted', emoji: '✝️', description: 'Commemoration of the crucifixion of Jesus Christ.' },
  { id: 'h27-08', dateStr: '2027-03-28', name: 'Easter Sunday', type: 'festival', emoji: '🥚', description: 'Christian celebration of the resurrection of Jesus.' },
  { id: 'h27-09', dateStr: '2027-04-14', name: 'Dr. Ambedkar Jayanti / Tamil New Year', type: 'gazetted', emoji: '📚', description: 'Commemoration of Dr. B.R. Ambedkar & regional new year.' },
  { id: 'h27-10', dateStr: '2027-05-01', name: 'International Labour Day / May Day', type: 'gazetted', emoji: '🛠️', description: 'International Workers’ Day.' },
  { id: 'h27-11', dateStr: '2027-05-17', name: 'Bakrid / Eid-ul-Adha', type: 'gazetted', emoji: '🐑', description: 'Feast of the Sacrifice observed with prayer and charity.' },
  { id: 'h27-12', dateStr: '2027-05-20', name: 'Buddha Purnima', type: 'gazetted', emoji: '🪷', description: 'Celebration of Lord Buddha’s birth and enlightenment.' },
  { id: 'h27-13', dateStr: '2027-06-16', name: 'Muharram (Ashura)', type: 'gazetted', emoji: '🕌', description: 'Day of remembrance in Islamic calendar.' },
  { id: 'h27-14', dateStr: '2027-08-15', name: 'Independence Day', type: 'national', emoji: '🇮🇳', description: 'National Holiday celebrating Indian independence.' },
  { id: 'h27-15', dateStr: '2027-08-17', name: 'Raksha Bandhan', type: 'festival', emoji: '🧵', description: 'Celebration of brotherly and sisterly bonds.' },
  { id: 'h27-16', dateStr: '2027-08-24', name: 'Krishna Janmashtami', type: 'festival', emoji: '🦚', description: 'Celebration of Lord Krishna’s birth.' },
  { id: 'h27-17', dateStr: '2027-09-04', name: 'Ganesh Chaturthi', type: 'festival', emoji: '🐘', description: 'Grand celebration of Lord Ganesha.' },
  { id: 'h27-18', dateStr: '2027-09-13', name: 'Onam', type: 'festival', emoji: '🌸', description: 'Kerala harvest festival.' },
  { id: 'h27-19', dateStr: '2027-09-14', name: 'Milad-un-Nabi', type: 'gazetted', emoji: '✨', description: 'Prophet Muhammad’s birthday.' },
  { id: 'h27-20', dateStr: '2027-10-02', name: 'Mahatma Gandhi Jayanti', type: 'national', emoji: '🇮🇳', description: 'National Holiday celebrating Mahatma Gandhi.' },
  { id: 'h27-21', dateStr: '2027-10-09', name: 'Vijaya Dashami / Dussehra', type: 'gazetted', emoji: '🏹', description: 'Victory of good over evil.' },
  { id: 'h27-22', dateStr: '2027-10-29', name: 'Diwali / Deepavali', type: 'gazetted', emoji: '🪔', description: 'Festival of Lights.' },
  { id: 'h27-23', dateStr: '2027-11-13', name: 'Guru Nanak Jayanti', type: 'gazetted', emoji: 'ੴ', description: 'Birth celebration of Guru Nanak Dev Ji.' },
  { id: 'h27-24', dateStr: '2027-12-25', name: 'Christmas Day', type: 'gazetted', emoji: '🎄', description: 'Celebration of the birth of Jesus Christ.' },
];

export const getHolidayByDate = (dateStr: string): HolidayItem | undefined => {
  return HOLIDAYS_DATABASE.find((h) => h.dateStr === dateStr);
};

export const getHolidaysByMonth = (year: number, month: number): HolidayItem[] => {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return HOLIDAYS_DATABASE.filter((h) => h.dateStr.startsWith(prefix));
};

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export function formatDateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function extractMeetingLink(text: string): string | null {
  if (!text) return null;
  const meetRegex = /(https?:\/\/(?:meet\.google\.com\/[a-z0-9-]+|zoom\.us\/j\/[0-9]+(?:\?[^\s"']*)?|teams\.microsoft\.com\/l\/meetup-join\/[^\s"']+|[a-z0-9-]+\.webex\.com\/[^\s"']+))/i;
  const m = text.match(meetRegex);
  return m ? m[1].replace(/[),.;]+$/, '') : null;
}

export function detectEventCategory(text: string, subject: string = ''): CalendarMailEvent['category'] {
  const full = `${subject} ${text}`.toLowerCase();

  if (/(?:interview|technical round|hr round|screening call|managerial round|coding round|l1 discussion|l2 discussion|telephonic round)/i.test(full)) {
    return 'interview';
  }
  if (/(?:assessment|coding test|hackathon|coding challenge|oa test|online assessment|aptitude test|quiz|exam)/i.test(full)) {
    return 'assessment';
  }
  if (/(?:campus recruitment|placement drive|campus drive|pool campus|hiring drive|on-campus)/i.test(full)) {
    return 'campus-drive';
  }
  if (/(?:meet\.google\.com|zoom\.us|teams\.microsoft|sync call|discussion|webinar|orientation|all-hands|standup)/i.test(full)) {
    return 'meeting';
  }
  if (/(?:last date|deadline|apply before|registration closes|submission deadline|offer acceptance|due date|cutoff)/i.test(full)) {
    return 'deadline';
  }
  return 'action';
}

export function extractTimeFromText(text: string): string {
  if (!text) return 'All Day';

  const timeRegex = /\b(0?[1-9]|1[0-2]):([0-5][0-9])\s*([APap][Mm])(?:\s*(?:IST|UTC|EST|PST))?\b/;
  const m1 = text.match(timeRegex);
  if (m1) {
    const hours = m1[1].padStart(2, '0');
    const mins = m1[2];
    const ampm = m1[3].toUpperCase();
    return `${hours}:${mins} ${ampm}`;
  }

  const shortTimeRegex = /\b(0?[1-9]|1[0-2])\s*([APap][Mm])\b/;
  const m2 = text.match(shortTimeRegex);
  if (m2) {
    const hours = m2[1].padStart(2, '0');
    const ampm = m2[2].toUpperCase();
    return `${hours}:00 ${ampm}`;
  }

  const h24Regex = /\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/;
  const m3 = text.match(h24Regex);
  if (m3) {
    let h = parseInt(m3[1], 10);
    const mins = m3[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${mins} ${ampm}`;
  }

  return 'All Day';
}

export function extractDatesFromText(text: string, referenceDate: Date = new Date()): Array<{ dateStr: string; snippet: string }> {
  if (!text) return [];
  const results: Array<{ dateStr: string; snippet: string }> = [];
  const refYear = referenceDate.getFullYear();

  // 1. ISO Date (YYYY-MM-DD)
  const isoRegex = /\b(202[4-9])-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])\b/g;
  let match;
  while ((match = isoRegex.exec(text)) !== null) {
    results.push({
      dateStr: match[0],
      snippet: match[0],
    });
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const slashDateRegex = /\b(0?[1-9]|[12][0-9]|3[01])[\/\-.](0?[1-9]|1[0-2])[\/\-.](202[4-9])\b/g;
  while ((match = slashDateRegex.exec(text)) !== null) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    results.push({
      dateStr: `${year}-${month}-${day}`,
      snippet: match[0],
    });
  }

  // 3. Day Month [Year] e.g. "20th August 2026", "24 Aug"
  const monthNames = Object.keys(MONTH_MAP).join('|');
  const dayMonthRegex = new RegExp(`\\b(0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames})(?:[.,\\s]+(202[4-9]))?\\b`, 'gi');
  while ((match = dayMonthRegex.exec(text)) !== null) {
    const day = parseInt(match[1], 10);
    const monthKey = match[2].toLowerCase();
    const monthIdx = MONTH_MAP[monthKey];
    const year = match[3] ? parseInt(match[3], 10) : refYear;

    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      const d = new Date(year, monthIdx, day);
      results.push({
        dateStr: formatDateToStr(d),
        snippet: match[0],
      });
    }
  }

  // 3b. Month Day [Year] e.g. "August 20th, 2026", "Sep 15"
  const monthDayRegex = new RegExp(`\\b(${monthNames})\\s+(0?[1-9]|[12][0-9]|3[01])(?:st|nd|rd|th)?(?:[.,\\s]+(202[4-9]))?\\b`, 'gi');
  while ((match = monthDayRegex.exec(text)) !== null) {
    const monthKey = match[1].toLowerCase();
    const day = parseInt(match[2], 10);
    const monthIdx = MONTH_MAP[monthKey];
    const year = match[3] ? parseInt(match[3], 10) : refYear;

    if (monthIdx !== undefined && day >= 1 && day <= 31) {
      const d = new Date(year, monthIdx, day);
      results.push({
        dateStr: formatDateToStr(d),
        snippet: match[0],
      });
    }
  }

  // 4. Relative words (tomorrow, today)
  if (/\b(?:tomorrow|by tomorrow)\b/i.test(text)) {
    const tom = new Date(referenceDate);
    tom.setDate(tom.getDate() + 1);
    results.push({
      dateStr: formatDateToStr(tom),
      snippet: 'Tomorrow',
    });
  }

  if (/\b(?:today|by end of day|eod today)\b/i.test(text)) {
    results.push({
      dateStr: formatDateToStr(referenceDate),
      snippet: 'Today',
    });
  }

  const uniqueMap = new Map<string, { dateStr: string; snippet: string }>();
  results.forEach((r) => {
    if (!uniqueMap.has(r.dateStr)) {
      uniqueMap.set(r.dateStr, r);
    }
  });

  return Array.from(uniqueMap.values());
}

export function extractInterviewer(text: string): string | null {
  if (!text) return null;
  const interviewerRegex = /(?:Interviewer|Host|Conducted by|Panelist|Meeting with|HR Representative|Talent Partner)\s*:\s*([A-Za-z\s.]+?)(?:\n|\r|\.|,|with|$)/i;
  const m = text.match(interviewerRegex);
  if (m && m[1] && m[1].trim().length > 2) {
    return m[1].trim();
  }
  return null;
}

export function extractCompany(email: Email): string {
  if (email.provider === 'telegram') {
    const job = parseTelegramJob(email.bodyFull || email.bodySnippet || email.subject, email.senderName);
    if (job.company && job.company !== 'Company Hiring') return job.company;
  }

  if (email.senderName && !email.senderName.includes('@')) {
    const clean = email.senderName.replace(/\s*(?:Recruitment|Careers|Hiring|Talent Acquisition|Team|Jobs|HR|Updates|Notifications).*/i, '').trim();
    if (clean.length > 1) return clean;
  }

  const domainMatch = email.sender.match(/@([a-zA-Z0-9-]+)\./);
  if (domainMatch && domainMatch[1] && !/^(gmail|outlook|yahoo|hotmail|icloud|proton|telegram)$/i.test(domainMatch[1])) {
    const raw = domainMatch[1];
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return email.senderName || email.sender.split('@')[0];
}

export function extractImportantDatesFromEmails(emails: Email[]): CalendarMailEvent[] {
  const events: CalendarMailEvent[] = [];
  const seenKey = new Set<string>();

  emails.forEach((e) => {
    // STRICT GUARD: Exclude OTP, security key, password reset, verification codes, spam, and advertisement emails
    if (isExcludedFromCalendar(e)) {
      return;
    }

    const refDate = e.receivedAt ? new Date(e.receivedAt) : new Date();
    const company = extractCompany(e);
    const bodyCombined = `${e.subject}\n${e.actionSummary || ''}\n${e.reasoning || ''}\n${e.bodyFull || e.bodySnippet || ''}`;
    const meetLink = extractMeetingLink(bodyCombined);
    const interviewer = extractInterviewer(bodyCombined);
    const actionLinks = extractEmailActionLinks(e.bodyFull || e.bodySnippet);
    const applyUrl = actionLinks?.[0]?.url || null;

    // A. Telegram Opportunities
    if (e.provider === 'telegram') {
      const job = parseTelegramJob(e.bodyFull || e.bodySnippet || e.subject, e.senderName, e.receivedAt);
      let eventDate = formatDateToStr(refDate);

      const extractedDates = extractDatesFromText(job.deadline + ' ' + (e.bodyFull || e.bodySnippet), refDate);
      if (extractedDates.length > 0) {
        eventDate = extractedDates[0].dateStr;
      }

      const key = `tg-${e.id}-${eventDate}`;
      if (!seenKey.has(key)) {
        seenKey.add(key);
        events.push({
          id: key,
          emailId: e.id,
          dateStr: eventDate,
          timeStr: extractTimeFromText(bodyCombined),
          title: job.company || e.senderName || 'Telegram Placement Alert',
          subtitle: job.role || e.subject,
          source: 'telegram',
          category: detectEventCategory(job.role, e.subject),
          priority: e.priorityTier === 'urgent' || e.priorityTier === 'hotspot' ? 'urgent' : e.priorityTier === 'important' ? 'important' : 'normal',
          applyUrl: job.applyUrl || applyUrl,
          company: job.company || company,
          completed: e.status === 'archived',
          rawEmail: e,
          sourceTextSnippet: job.deadline || 'Telegram Opportunity Deadline',
        });
      }
      return;
    }

    // B. Explicit Email Deadline Field (only for genuine deadlines)
    if (e.deadline) {
      try {
        const d = new Date(e.deadline);
        if (!isNaN(d.getTime())) {
          const dateStr = formatDateToStr(d);
          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const key = `mail-${e.id}-${dateStr}`;

          if (!seenKey.has(key)) {
            seenKey.add(key);
            events.push({
              id: key,
              emailId: e.id,
              dateStr,
              timeStr: timeStr !== '12:00 AM' ? timeStr : extractTimeFromText(bodyCombined),
              title: company,
              subtitle: e.actionSummary || e.subject,
              source: 'mail',
              category: detectEventCategory(bodyCombined, e.subject),
              priority: e.priorityTier === 'hotspot' || e.priorityTier === 'urgent' ? 'urgent' : 'important',
              applyUrl,
              meetingLink: meetLink,
              interviewer,
              company,
              completed: e.status === 'archived',
              rawEmail: e,
              sourceTextSnippet: e.actionSummary || 'Email Action Deadline',
            });
          }
        }
      } catch {}
    }

    // C. Attached Tasks with Deadlines
    if (Array.isArray(e.tasks)) {
      e.tasks.forEach((t: any) => {
        if (t.deadline) {
          try {
            const td = new Date(t.deadline);
            if (!isNaN(td.getTime())) {
              const dStr = formatDateToStr(td);
              const key = `task-${t.id}-${dStr}`;

              if (!seenKey.has(key)) {
                seenKey.add(key);
                events.push({
                  id: key,
                  emailId: e.id,
                  dateStr: dStr,
                  timeStr: td.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  title: t.title,
                  subtitle: t.description || e.subject,
                  source: 'task',
                  category: 'action',
                  priority: t.priority === 'critical' ? 'urgent' : t.priority === 'high' ? 'important' : 'normal',
                  applyUrl,
                  meetingLink: meetLink,
                  interviewer,
                  company,
                  completed: t.status === 'done' || e.status === 'archived',
                  rawEmail: e,
                  sourceTextSnippet: t.title,
                });
              }
            }
          } catch {}
        }
      });
    }

    // D. Scan Email Body and Subject for Natural Dates & Interviews/Meetings (only for legitimate events)
    const isLikelyEventMail =
      /(?:interview|assessment|hackathon|test|exam|deadline|drive|webinar|contest|submission|meeting|call|schedule|round|discussion|appointment)/i.test(bodyCombined);

    if (isLikelyEventMail) {
      const datesInBody = extractDatesFromText(bodyCombined, refDate);
      datesInBody.forEach((match) => {
        const key = `mail-${e.id}-${match.dateStr}`;
        if (!seenKey.has(key)) {
          seenKey.add(key);
          const category = detectEventCategory(bodyCombined, e.subject);
          const timeStr = extractTimeFromText(bodyCombined);

          events.push({
            id: key,
            emailId: e.id,
            dateStr: match.dateStr,
            timeStr,
            title: company,
            subtitle: e.subject,
            source: 'mail',
            category,
            priority: e.priorityTier === 'hotspot' || e.priorityTier === 'urgent' ? 'urgent' : 'important',
            applyUrl,
            meetingLink: meetLink,
            interviewer,
            company,
            completed: e.status === 'archived',
            rawEmail: e,
            sourceTextSnippet: match.snippet,
          });
        }
      });
    }
  });

  return events.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

interface CallSheetViewProps {
  emails?: Email[];
  onSelectEmail?: (email: Email) => void;
}

const DEFAULT_CALL_TASKS: CallTaskItem[] = [
  {
    id: 'ct1',
    dateStr: new Date().toISOString().split('T')[0],
    timeStr: '03:00 PM',
    title: 'Teradata Technical Round 1',
    company: 'Teradata',
    category: 'interview',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    interviewer: 'Rajesh Kumar (Staff DevOps Lead)',
    notes: 'Revise Docker, Kubernetes, CI/CD, and Linux internals.',
    completed: false,
    priority: 'urgent',
  },
  {
    id: 'ct2',
    dateStr: new Date().toISOString().split('T')[0],
    timeStr: '05:00 PM',
    title: 'HR Screening & Eligibility Check',
    company: 'Xpentra Technologies',
    category: 'hr-call',
    meetingLink: 'https://zoom.us/j/9876543210',
    interviewer: 'Sneha Sharma (Talent Acquisition)',
    notes: 'Discuss internship joining timeline and stipend.',
    completed: false,
    priority: 'important',
  },
  {
    id: 'ct3',
    dateStr: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    timeStr: '10:00 AM',
    title: 'Infosys On-Campus Drive Registration & Test',
    company: 'Infosys',
    category: 'campus-drive',
    notes: 'Carry resume copies, student ID, and college hall ticket.',
    completed: false,
    priority: 'urgent',
  },
  {
    id: 'ct4',
    dateStr: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    timeStr: '02:00 PM',
    title: 'Unstop National Coding Challenge Round 1',
    company: 'Unstop / St. Joseph',
    category: 'assessment',
    notes: 'DSA assessment: Graph algorithms and dynamic programming.',
    completed: false,
    priority: 'important',
  },
];

export const CallSheetView: React.FC<CallSheetViewProps> = ({
  emails = [],
  onSelectEmail,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [activeTab, setActiveTab] = useState<'all' | 'mail-dates' | 'calls' | 'holidays'>('all');
  const [isSyncingDates, setIsSyncingDates] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Call tasks in local storage
  const [callTasks, setCallTasks] = useState<CallTaskItem[]>(() => {
    const saved = localStorage.getItem('mailradar_callsheet_calendar');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_CALL_TASKS;
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [timeStr, setTimeStr] = useState('02:30 PM');
  const [category, setCategory] = useState<CallTaskItem['category']>('interview');
  const [priority, setPriority] = useState<'urgent' | 'important' | 'normal'>('important');
  const [meetingLink, setMeetingLink] = useState('');
  const [interviewer, setInterviewer] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    localStorage.setItem('mailradar_callsheet_calendar', JSON.stringify(callTasks));
  }, [callTasks]);

  // Extract all deadlines and dates from live emails & Telegram messages
  const emailEvents: CalendarMailEvent[] = useMemo(() => {
    return extractImportantDatesFromEmails(emails);
  }, [emails]);

  // Calendar Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const currentMonthHolidays = useMemo(() => getHolidaysByMonth(year, month), [year, month]);
  const selectedDayHoliday = useMemo(() => getHolidayByDate(selectedDateStr), [selectedDateStr]);

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      day: d,
      dateStr: formatted,
    });
  }

  const handleSyncMailDates = () => {
    setIsSyncingDates(true);
    setSyncToast(null);

    setTimeout(() => {
      setIsSyncingDates(false);
      const count = emailEvents.length;
      setSyncToast({
        message: `Fetched & placed ${count} important dates, deadlines & interview schedules from ${emails.length} emails into the calendar!`,
        type: 'success',
      });

      setTimeout(() => {
        setSyncToast(null);
      }, 3500);
    }, 600);
  };

  const handleOpenAddModal = (dateStr?: string) => {
    if (dateStr) setSelectedDateStr(dateStr);
    setTitle('');
    setCompany('');
    setTimeStr('02:30 PM');
    setCategory('interview');
    setPriority('important');
    setMeetingLink('');
    setInterviewer('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleConvertMailEventToTask = (event: CalendarMailEvent) => {
    const newTask: CallTaskItem = {
      id: `task-converted-${Date.now()}`,
      dateStr: event.dateStr,
      timeStr: event.timeStr || 'All Day',
      title: event.title,
      company: event.company || undefined,
      category: event.category === 'interview' ? 'interview' : event.category === 'campus-drive' ? 'campus-drive' : event.category === 'assessment' ? 'assessment' : 'deadline',
      priority: event.priority,
      meetingLink: event.meetingLink || undefined,
      interviewer: event.interviewer || undefined,
      notes: event.subtitle || undefined,
      completed: false,
    };

    setCallTasks((prev) => [newTask, ...prev]);
    setSyncToast({
      message: `Added "${event.title}" to your Call Sheet Checklist for ${event.dateStr}!`,
      type: 'info',
    });
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: CallTaskItem = {
      id: Date.now().toString(),
      dateStr: selectedDateStr,
      timeStr: timeStr.trim() || 'All Day',
      title: title.trim(),
      company: company.trim() || undefined,
      category,
      priority,
      meetingLink: meetingLink.trim() || undefined,
      interviewer: interviewer.trim() || undefined,
      notes: notes.trim() || undefined,
      completed: false,
    };

    setCallTasks((prev) => [...prev, newTask]);
    setIsModalOpen(false);
  };

  const handleToggleComplete = (id: string) => {
    setCallTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setCallTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Events for Selected Day
  const selectedDayCalls = callTasks.filter((t) => t.dateStr === selectedDateStr);
  const selectedDayMailEvents = emailEvents.filter((d) => d.dateStr === selectedDateStr);

  // Overall Statistics
  const totalCalls = callTasks.length;
  const activeCalls = callTasks.filter((c) => !c.completed).length;
  const activeMailEvents = emailEvents.filter((d) => !d.completed).length;
  const urgentMailEvents = emailEvents.filter((d) => d.priority === 'urgent' && !d.completed).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayItemsCount =
    callTasks.filter((t) => t.dateStr === todayStr && !t.completed).length +
    emailEvents.filter((d) => d.dateStr === todayStr && !d.completed).length;

  // Upcoming items for sidebar radar (next 14 days)
  const upcomingRadarItems = useMemo(() => {
    const combined: Array<{
      id: string;
      title: string;
      subtitle?: string;
      dateStr: string;
      type: 'interview' | 'deadline' | 'assessment' | 'campus-drive' | 'meeting';
      priority: 'urgent' | 'important' | 'normal';
      link?: string | null;
      rawEmail?: Email;
    }> = [];

    callTasks
      .filter((t) => !t.completed)
      .forEach((t) => {
        combined.push({
          id: `c-${t.id}`,
          title: t.title,
          subtitle: `${t.company ? t.company + ' • ' : ''}${t.timeStr}`,
          dateStr: t.dateStr,
          type: 'interview',
          priority: t.priority || 'important',
          link: t.meetingLink,
        });
      });

    emailEvents
      .filter((d) => !d.completed)
      .forEach((d) => {
        combined.push({
          id: d.id,
          title: d.title,
          subtitle: d.subtitle,
          dateStr: d.dateStr,
          type: d.category === 'interview' ? 'interview' : d.category === 'assessment' ? 'assessment' : d.category === 'campus-drive' ? 'campus-drive' : 'deadline',
          priority: d.priority,
          link: d.meetingLink || d.applyUrl,
          rawEmail: d.rawEmail,
        });
      });

    return combined.sort((a, b) => a.dateStr.localeCompare(b.dateStr)).slice(0, 8);
  }, [callTasks, emailEvents]);

  const getCategoryBadge = (cat: CallTaskItem['category'] | CalendarMailEvent['category']) => {
    switch (cat) {
      case 'interview':
        return { bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800', dot: 'bg-purple-500', label: 'Interview' };
      case 'hr-call':
        return { bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800', dot: 'bg-blue-500', label: 'HR Call' };
      case 'campus-drive':
        return { bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Campus Drive' };
      case 'assessment':
        return { bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500', label: 'Assessment' };
      case 'meeting':
        return { bg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800', dot: 'bg-sky-500', label: 'Meeting' };
      case 'deadline':
        return { bg: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800', dot: 'bg-red-500', label: 'Deadline' };
      default:
        return { bg: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700', dot: 'bg-slate-500', label: 'Action' };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Top Executive Summary Banner */}
      <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-6 shadow-xs space-y-4 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Calendar & Recruitment Radar
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-orange-500/10 text-purple-700 dark:text-orange-400 border border-purple-200 dark:border-orange-500/30 flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5" />
                Live Mail & Schedule Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Synchronized intelligence hub: Automatically extracts interview rounds, coding assessments, placement drive cutoffs, and meeting links from all Emails & Telegram messages, plotted alongside Government Holidays.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Stat Pill 1: Today */}
            <div className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-center">
              <div className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">Today</div>
              <div className="text-sm font-extrabold text-purple-900 dark:text-purple-100">{todayItemsCount}</div>
            </div>

            {/* Stat Pill 2: Mail Events */}
            <div className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-center">
              <div className="text-[10px] uppercase font-bold text-red-700 dark:text-red-300">Mail Deadlines</div>
              <div className="text-sm font-extrabold text-red-900 dark:text-red-100">{activeMailEvents}</div>
            </div>

            {/* Stat Pill 3: Interviews & Calls */}
            <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-center">
              <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">Call Sheet</div>
              <div className="text-sm font-extrabold text-blue-900 dark:text-blue-100">{activeCalls}</div>
            </div>

            {/* Stat Pill 4: Holidays */}
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-center">
              <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Holidays</div>
              <div className="text-sm font-extrabold text-amber-900 dark:text-amber-100">{currentMonthHolidays.length}</div>
            </div>

            {/* Sync Mail Dates Button */}
            <button
              onClick={handleSyncMailDates}
              disabled={isSyncingDates}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1e2230] hover:bg-slate-50 dark:hover:bg-[#151722] text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Rescan and parse all email dates"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDates ? 'animate-spin text-blue-600 dark:text-orange-400' : 'text-slate-500'}`} />
              <span>{isSyncingDates ? 'Scanning...' : 'Sync Mail Dates'}</span>
            </button>

            <button
              onClick={() => handleOpenAddModal(selectedDateStr)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Call / Task</span>
            </button>
          </div>
        </div>

        {/* Sync Toast Feedback */}
        {syncToast && (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{syncToast.message}</span>
          </div>
        )}
      </div>

      {/* 2. Main Layout: 2-Column Grid (Calendar + Agenda Detail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Calendar Matrix (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h2>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#151722] p-1 rounded-xl">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#1e2230] text-slate-600 dark:text-slate-300 transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#1e2230] text-slate-600 dark:text-slate-300 transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  setSelectedDateStr(new Date().toISOString().split('T')[0]);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#1e2230] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#151722] transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1 border-b border-slate-100 dark:border-[#1e2230]">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-24 rounded-xl bg-slate-50/40 dark:bg-[#151722]/30" />;
              }

              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === todayStr;

              // Find day items & holiday
              const dayCalls = callTasks.filter((t) => t.dateStr === cell.dateStr);
              const dayMailEvents = emailEvents.filter((d) => d.dateStr === cell.dateStr);
              const dayHoliday = getHolidayByDate(cell.dateStr);

              const hasInterviews = dayCalls.some((c) => !c.completed) || dayMailEvents.some((m) => m.category === 'interview' && !m.completed);
              const hasUrgentDeadline = dayMailEvents.some((d) => d.priority === 'urgent' && !d.completed);
              const hasAssessments = dayMailEvents.some((m) => m.category === 'assessment' && !m.completed);
              const hasDrives = dayMailEvents.some((m) => m.category === 'campus-drive' && !m.completed) || dayCalls.some((c) => c.category === 'campus-drive');

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-[96px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none relative group ${
                    isSelected
                      ? 'border-blue-600 dark:border-orange-500 bg-blue-50/70 dark:bg-orange-500/10 ring-2 ring-blue-100 dark:ring-orange-500/20 shadow-xs'
                      : isToday
                      ? 'border-blue-300 dark:border-orange-500/40 bg-blue-50/30 dark:bg-orange-500/5 hover:border-blue-400 dark:hover:border-orange-500/60'
                      : dayHoliday
                      ? 'border-amber-200/90 dark:border-amber-900/60 bg-amber-50/25 dark:bg-amber-950/15 hover:border-amber-300 dark:hover:border-amber-700/60'
                      : 'border-slate-200/80 dark:border-[#1e2230] bg-white dark:bg-[#12141c] hover:border-slate-300 dark:hover:border-[#2a3044]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-blue-700 dark:text-orange-400'
                          : isToday
                          ? 'text-blue-600 dark:text-orange-400'
                          : dayHoliday
                          ? 'text-amber-800 dark:text-amber-300'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {cell.day}
                    </span>

                    <div className="flex items-center gap-1">
                      {dayHoliday && (
                        <span className="text-[11px]" title={dayHoliday.name}>
                          {dayHoliday.emoji}
                        </span>
                      )}
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-orange-500" title="Today" />
                      )}
                    </div>
                  </div>

                  {/* Holiday chip if exists */}
                  {dayHoliday && (
                    <div
                      className="text-[9px] font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/80 border border-amber-200/80 dark:border-amber-800/80 rounded px-1 py-0.5 truncate my-0.5"
                      title={`${dayHoliday.name} (${dayHoliday.type.toUpperCase()})`}
                    >
                      {dayHoliday.name}
                    </div>
                  )}

                  {/* Indicator Badges/Dots */}
                  <div className="space-y-0.5">
                    {dayCalls.length > 0 && (
                      <div className="flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                        <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 truncate">
                          {dayCalls.length} Call{dayCalls.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {dayMailEvents.length > 0 && (
                      <div className="flex items-center gap-1 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            hasUrgentDeadline ? 'bg-red-500' : hasAssessments ? 'bg-amber-500' : hasDrives ? 'bg-emerald-500' : 'bg-blue-500 dark:bg-orange-500'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-semibold truncate ${
                            hasUrgentDeadline
                              ? 'text-red-700 dark:text-red-300'
                              : hasAssessments
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-blue-700 dark:text-orange-400'
                          }`}
                        >
                          {dayMailEvents.length} Mail {dayMailEvents.length > 1 ? 'Events' : 'Event'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#1e2230] flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Interview / HR Call</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Urgent Deadline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Assessment / Exam</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Campus Drive</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">🇮🇳</span>
                <span>Government Holiday / Festival</span>
              </div>
            </div>

            <button
              onClick={() => handleOpenAddModal(selectedDateStr)}
              className="text-blue-600 dark:text-orange-400 font-bold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to {selectedDateStr}</span>
            </button>
          </div>
        </div>

        {/* Right Col: Selected Day Agenda + Upcoming Radar (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Selected Date Timeline Header */}
          <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e2230] pb-3">
              <div>
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Agenda for
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {new Date(`${selectedDateStr}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
              </div>

              <div className="flex items-center p-1 bg-slate-100 dark:bg-[#151722] rounded-xl text-xs font-bold overflow-x-auto">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-[#0c0d12] text-blue-700 dark:text-orange-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All ({selectedDayCalls.length + selectedDayMailEvents.length + (selectedDayHoliday ? 1 : 0)})
                </button>
                <button
                  onClick={() => setActiveTab('mail-dates')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    activeTab === 'mail-dates'
                      ? 'bg-white dark:bg-[#0c0d12] text-red-700 dark:text-red-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Mail Events ({selectedDayMailEvents.length})
                </button>
                <button
                  onClick={() => setActiveTab('calls')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    activeTab === 'calls'
                      ? 'bg-white dark:bg-[#0c0d12] text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Calls ({selectedDayCalls.length})
                </button>
                <button
                  onClick={() => setActiveTab('holidays')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    activeTab === 'holidays'
                      ? 'bg-white dark:bg-[#0c0d12] text-amber-700 dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Holiday ({selectedDayHoliday ? 1 : 0})
                </button>
              </div>
            </div>

            {/* Agenda Item Cards */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {/* 0. Holiday Highlight Card */}
              {selectedDayHoliday && (activeTab === 'all' || activeTab === 'holidays') && (
                <div className="p-4 rounded-xl border border-amber-300/80 dark:border-amber-700/80 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-amber-950/50 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0 p-1.5 bg-amber-100 dark:bg-amber-900/60 rounded-xl border border-amber-200 dark:border-amber-800">
                        {selectedDayHoliday.emoji}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                              selectedDayHoliday.type === 'national'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                : selectedDayHoliday.type === 'gazetted'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                            }`}
                          >
                            {selectedDayHoliday.type === 'national'
                              ? '🇮🇳 National Holiday'
                              : selectedDayHoliday.type === 'gazetted'
                              ? '🏛️ Gazetted Public Holiday'
                              : '✨ Festival / Observance'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300">
                            Public Holiday
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                          {selectedDayHoliday.name}
                        </h4>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {selectedDayHoliday.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* If no items for day */}
              {selectedDayCalls.length === 0 && selectedDayMailEvents.length === 0 && !selectedDayHoliday && (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <div className="text-xs font-semibold">No interviews, email deadlines, or holidays on this date</div>
                  <button
                    onClick={() => handleOpenAddModal(selectedDateStr)}
                    className="text-xs text-blue-600 dark:text-orange-400 font-bold hover:underline inline-block mt-1"
                  >
                    + Schedule an Interview or Task
                  </button>
                </div>
              )}

              {/* 1. Extracted Mail & Telegram Deadlines / Dates */}
              {(activeTab === 'all' || activeTab === 'mail-dates') &&
                selectedDayMailEvents.map((event) => {
                  const catBadge = getCategoryBadge(event.category);
                  return (
                    <div
                      key={event.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#151722] shadow-2xs space-y-2.5 hover:border-blue-400 dark:hover:border-orange-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                event.source === 'telegram'
                                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                  : event.source === 'task'
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                  : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                              }`}
                            >
                              {event.source === 'telegram' ? '✈️ Telegram Job' : event.source === 'task' ? '⚡ Action Task' : '✉️ Email Radar'}
                            </span>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catBadge.bg}`}>
                              {catBadge.label}
                            </span>

                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono ${
                                event.priority === 'urgent'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                  : event.priority === 'important'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-[#1e2230] dark:text-slate-300'
                              }`}
                            >
                              {event.priority.toUpperCase()}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                            {event.title}
                          </h4>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {event.subtitle}
                          </p>

                          {event.interviewer && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0c0d12] p-1.5 rounded-lg flex items-center gap-1.5 border border-slate-100 dark:border-[#1e2230]">
                              <User className="w-3 h-3 text-purple-500" />
                              <span className="font-semibold">Interviewer / Host:</span>
                              <span>{event.interviewer}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Links for Mail Event */}
                      <div className="pt-2 border-t border-slate-100 dark:border-[#1e2230] flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-blue-500 dark:text-orange-400" />
                          <span>{event.timeStr}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {event.meetingLink && (
                            <a
                              href={event.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/70 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-[11px] font-bold flex items-center gap-1 border border-purple-200 dark:border-purple-800 transition-colors"
                            >
                              <Video className="w-3 h-3 text-purple-600" />
                              <span>Join Call</span>
                            </a>
                          )}

                          {event.applyUrl && (
                            <a
                              href={event.applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <span>Apply Now</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          {event.rawEmail && onSelectEmail && (
                            <button
                              onClick={() => onSelectEmail(event.rawEmail!)}
                              className="text-[11px] text-blue-600 dark:text-orange-400 font-bold hover:underline"
                            >
                              View Mail
                            </button>
                          )}

                          <button
                            onClick={() => handleConvertMailEventToTask(event)}
                            className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-[#1e2230] text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-[#1e2230] transition-colors"
                            title="Add to Call Sheet Schedule Checklist"
                          >
                            + Add to Call Sheet
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* 2. User Scheduled Interview / Call Sheet Tasks */}
              {(activeTab === 'all' || activeTab === 'calls') &&
                selectedDayCalls.map((call) => {
                  const badge = getCategoryBadge(call.category);
                  return (
                    <div
                      key={call.id}
                      className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                        call.completed
                          ? 'bg-slate-50/60 dark:bg-[#151722]/40 border-slate-200/60 dark:border-[#1e2230] opacity-70'
                          : 'bg-white dark:bg-[#151722] border-slate-200 dark:border-[#1e2230] shadow-2xs hover:border-purple-300 dark:hover:border-purple-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(call.id)}
                            className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                              call.completed
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-[#1e2230] hover:border-emerald-500 bg-white dark:bg-[#0c0d12]'
                            }`}
                          >
                            {call.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${badge.bg}`}>
                                {badge.label}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                                {call.timeStr}
                              </span>
                            </div>

                            <h4
                              className={`text-xs font-bold text-slate-900 dark:text-white mt-1 ${
                                call.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                              }`}
                            >
                              {call.title}
                            </h4>

                            {call.company && (
                              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span>{call.company}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTask(call.id)}
                          className="text-slate-300 hover:text-red-600 dark:text-slate-600 dark:hover:text-red-400 transition-colors p-1"
                          title="Delete Call Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {call.interviewer && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0c0d12] p-2 rounded-lg flex items-center gap-1.5 border border-slate-100 dark:border-[#1e2230]">
                          <User className="w-3.5 h-3.5 text-purple-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-200">Interviewer:</span>
                          <span>{call.interviewer}</span>
                        </div>
                      )}

                      {call.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-amber-50/40 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/40">
                          Prep: {call.notes}
                        </p>
                      )}

                      {call.meetingLink && (
                        <a
                          href={call.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/70 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors border border-purple-200 dark:border-purple-800"
                        >
                          <Video className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Join Meeting (Google Meet / Zoom)</span>
                          <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
                        </a>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Radar: Upcoming Deadlines & Interviews Next 14 Days */}
          <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-[#1e2230] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                  Impending Radar (Next 14 Days)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{upcomingRadarItems.length} active</span>
            </div>

            <div className="space-y-2">
              {upcomingRadarItems.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">No upcoming events scheduled</div>
              ) : (
                upcomingRadarItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedDateStr(item.dateStr);
                      if (item.rawEmail && onSelectEmail) {
                        onSelectEmail(item.rawEmail);
                      }
                    }}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-[#1e2230] hover:bg-slate-50 dark:hover:bg-[#151722] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          item.type === 'interview'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : item.type === 'assessment'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : item.type === 'campus-drive'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {item.type === 'interview' ? (
                          <PhoneCall className="w-3.5 h-3.5" />
                        ) : item.type === 'assessment' ? (
                          <Award className="w-3.5 h-3.5" />
                        ) : item.type === 'campus-drive' ? (
                          <Building2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-orange-400 transition-colors">
                          {item.title}
                        </h5>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-[11px] font-bold font-mono text-slate-700 dark:text-slate-300">
                        {new Date(`${item.dateStr}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                          item.priority === 'urgent'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : item.type === 'interview'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : item.type === 'assessment'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-[#1e2230] dark:text-slate-300'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule / Add Call Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#12141c] rounded-3xl border border-slate-200 dark:border-[#1e2230] max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e2230] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-orange-500/10 text-purple-600 dark:text-orange-400 border border-transparent dark:border-orange-500/30 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Schedule Agenda Item</h3>
                  <p className="text-[11px] text-slate-400">Date: {selectedDateStr}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Title / Event Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Technical Round 2 or Application Cutoff"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amazon / Unstop"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Time / Slot
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 03:00 PM or 11:59 PM"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500"
                  >
                    <option value="interview">Technical Interview</option>
                    <option value="hr-call">HR Screening Call</option>
                    <option value="campus-drive">On-Campus Placement Drive</option>
                    <option value="assessment">Coding Assessment / Quiz</option>
                    <option value="deadline">Application Deadline</option>
                    <option value="followup">Follow-Up / Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500"
                  >
                    <option value="urgent">🔴 Urgent / Critical</option>
                    <option value="important">🟡 Important</option>
                    <option value="normal">🔵 Normal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Google Meet / Zoom / Apply URL
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/... or https://zoom.us/..."
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Interviewer Name / Host / Panelist
                </label>
                <input
                  type="text"
                  placeholder="e.g. Talent Acquisition Lead"
                  value={interviewer}
                  onChange={(e) => setInterviewer(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Prep Checklist & Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Key topics to review, questions to ask, eligibility documents..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1e2230] bg-white dark:bg-[#0c0d12] text-slate-900 dark:text-white dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#151722] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Save to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
