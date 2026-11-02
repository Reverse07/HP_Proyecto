import { BUSINESS_TZ } from '../constants.js';

export function getTodayInBusinessTz(): Date {
  const now = new Date();
  const local = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const map: Record<string, string> = {};
  for (const part of local) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return new Date(`${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`);
}

export function isDateAtLeastOneDayInAdvance(inputDate: string): boolean {
  return isValidDate(inputDate) && inputDate > getLimaDateString(new Date());
}

export function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function getLimaDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}
