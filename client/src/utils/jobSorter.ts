import { Email } from '../types';
import { parseTelegramJob, ParsedTelegramJob } from './telegramJobParser';

export type JobSortOption = 'priority' | 'salary-desc' | 'salary-asc' | 'date-desc' | 'company-asc';
export type JobLocationFilter = 'all' | 'remote' | 'bengaluru' | 'pune' | 'chennai' | 'hyderabad' | 'mumbai';
export type JobSalaryFilter = 'all' | '10plus' | '6to10' | '3to6' | 'internship';

/**
 * Extracts an estimated annual CTC in Lakhs (LPA) from a salary string
 */
export function extractNumericSalaryLPA(salaryStr: string): number {
  if (!salaryStr) return 0;
  const s = salaryStr.toLowerCase();

  // Monthly stipend e.g. ₹15,000/Month -> 15k * 12 = 1.8 LPA
  const monthMatch = s.match(/(?:₹|\s*)(\d+)(?:,\d+)?\s*(?:\/|\s*per\s*)month/);
  if (monthMatch) {
    const monthlyVal = parseFloat(monthMatch[1].replace(/,/g, ''));
    return (monthlyVal * 12) / 100000;
  }

  // Range e.g. ₹14 - 22 LPA or 14 - 22 LPA
  const rangeMatch = s.match(/(?:₹|\s*)(\d+(?:\.\d+)?)\s*[-–]\s*(?:₹|\s*)(\d+(?:\.\d+)?)\s*(?:lpa|lakh)/);
  if (rangeMatch) {
    // Return the upper bound for sort
    return parseFloat(rangeMatch[2]);
  }

  // Single e.g. ₹8 LPA or 8 LPA
  const singleMatch = s.match(/(?:₹|\s*)(\d+(?:\.\d+)?)\s*(?:lpa|lakh)/);
  if (singleMatch) {
    return parseFloat(singleMatch[1]);
  }

  // Generic fallback
  return 0;
}

/**
 * Filters and sorts Telegram job messages based on salary, location, status, and sort option
 */
export function filterAndSortTelegramJobs(
  messages: Email[],
  options: {
    statusTab: 'active' | 'completed';
    priorityFilter: string;
    selectedChannel: string | null;
    searchQuery: string;
    locationFilter: JobLocationFilter;
    salaryFilter: JobSalaryFilter;
    sortBy: JobSortOption;
  }
): { filtered: Email[]; parsedJobs: Map<string, ParsedTelegramJob> } {
  const parsedMap = new Map<string, ParsedTelegramJob>();

  // 1. Pre-parse all messages
  messages.forEach((m) => {
    const parsed = parseTelegramJob(
      m.bodyFull || m.bodySnippet || m.subject,
      m.senderName || m.sender,
      m.receivedAt
    );
    parsedMap.set(m.id, parsed);
  });

  // 2. Filter
  const filtered = messages.filter((m) => {
    const parsed = parsedMap.get(m.id)!;

    // Status Tab (Active vs Completed)
    const isExplicitlyArchived = m.status === 'archived';
    const isClosedOrExpired =
      Boolean(m.snoozeReason && (m.snoozeReason.includes('Closed') || m.snoozeReason.includes('Expired') || m.snoozeReason.includes('Deadline Passed'))) ||
      Boolean(parsed.deadline && (parsed.deadline.includes('Closed') || parsed.deadline.includes('Expired') || parsed.deadline.includes('Deadline Passed')));

    const isCompleted = isExplicitlyArchived || isClosedOrExpired;

    if (options.statusTab === 'active' && isCompleted) return false;
    if (options.statusTab === 'completed' && !isCompleted) return false;

    // Channel filter
    if (options.selectedChannel) {
      const handle = options.selectedChannel.replace(/^@/, '').toLowerCase();
      const match =
        (m.sender && m.sender.toLowerCase().includes(handle)) ||
        (m.senderName && m.senderName.toLowerCase().includes(handle)) ||
        (m.externalId && m.externalId.toLowerCase().includes(handle));
      if (!match) return false;
    }

    // Priority filter
    if (options.priorityFilter !== 'all') {
      if (options.priorityFilter === 'urgent' && m.priorityTier !== 'hotspot' && m.priorityTier !== 'urgent') return false;
      if (options.priorityFilter === 'important' && m.priorityTier !== 'important') return false;
      if (options.priorityFilter === 'normal' && m.priorityTier !== 'normal') return false;
      if (options.priorityFilter === 'low' && m.priorityTier !== 'low') return false;
    }

    // Location Filter
    if (options.locationFilter !== 'all') {
      const loc = parsed.location.toLowerCase();
      if (options.locationFilter === 'remote' && !loc.includes('remote') && !loc.includes('work from home') && !loc.includes('hybrid')) {
        return false;
      }
      if (options.locationFilter === 'bengaluru' && !loc.includes('bengaluru') && !loc.includes('bangalore')) {
        return false;
      }
      if (options.locationFilter === 'pune' && !loc.includes('pune')) {
        return false;
      }
      if (options.locationFilter === 'chennai' && !loc.includes('chennai')) {
        return false;
      }
      if (options.locationFilter === 'hyderabad' && !loc.includes('hyderabad')) {
        return false;
      }
      if (options.locationFilter === 'mumbai' && !loc.includes('mumbai') && !loc.includes('maharashtra')) {
        return false;
      }
    }

    // Salary Filter
    if (options.salaryFilter !== 'all') {
      const salLPA = extractNumericSalaryLPA(parsed.salary);
      if (options.salaryFilter === '10plus' && salLPA < 10) return false;
      if (options.salaryFilter === '6to10' && (salLPA < 6 || salLPA > 10)) return false;
      if (options.salaryFilter === '3to6' && (salLPA < 3 || salLPA > 6)) return false;
      if (options.salaryFilter === 'internship' && !parsed.salary.toLowerCase().includes('month') && !parsed.salary.toLowerCase().includes('stipend') && salLPA >= 3) {
        return false;
      }
    }

    // Search query
    if (options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase();
      const match =
        parsed.company.toLowerCase().includes(q) ||
        parsed.role.toLowerCase().includes(q) ||
        parsed.location.toLowerCase().includes(q) ||
        parsed.qualification.toLowerCase().includes(q) ||
        parsed.salary.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.reasoning.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // 3. Sort
  filtered.sort((a, b) => {
    const pA = parsedMap.get(a.id)!;
    const pB = parsedMap.get(b.id)!;
    const timeA = new Date(a.receivedAt || (a as any).createdAt || 0).getTime();
    const timeB = new Date(b.receivedAt || (b as any).createdAt || 0).getTime();

    if (options.sortBy === 'salary-desc') {
      const diff = extractNumericSalaryLPA(pB.salary) - extractNumericSalaryLPA(pA.salary);
      if (diff !== 0) return diff;
      return timeB - timeA;
    }
    if (options.sortBy === 'salary-asc') {
      const diff = extractNumericSalaryLPA(pA.salary) - extractNumericSalaryLPA(pB.salary);
      if (diff !== 0) return diff;
      return timeB - timeA;
    }
    if (options.sortBy === 'company-asc') {
      const diff = pA.company.localeCompare(pB.company);
      if (diff !== 0) return diff;
      return timeB - timeA;
    }
    if (options.sortBy === 'date-desc') {
      return timeB - timeA;
    }
    // Default: priority score descending, with newest time as secondary sort
    const scoreDiff = (b.priorityScore || 50) - (a.priorityScore || 50);
    if (Math.abs(scoreDiff) >= 5) {
      return scoreDiff;
    }
    return timeB - timeA;
  });

  return { filtered, parsedJobs: parsedMap };
}
