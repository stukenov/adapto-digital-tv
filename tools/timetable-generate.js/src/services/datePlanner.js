'use strict';

class DatePlanner {
  constructor({ period, date, week, year, broadcastDayBoundaryHour, daysPerPeriod }) {
    this.period = period;
    this.date = date;
    this.week = week;
    this.year = year;
    this.broadcastDayBoundaryHour = Number.isFinite(broadcastDayBoundaryHour)
      ? Math.max(0, Math.min(23, Math.round(broadcastDayBoundaryHour)))
      : 6;
    this.daysPerPeriod = Number.isFinite(daysPerPeriod) && daysPerPeriod > 0 ? Math.round(daysPerPeriod) : 7;
  }

  resolveDates(now = new Date()) {
    switch (this.period) {
      case 'day':
        return [this.resolveDay(now)];
      case 'week':
        return this.resolveWeek(now);
      case 'today':
      default:
        return [this.resolveToday(now)];
    }
  }

  resolveToday(now) {
    const boundaryHour = this.broadcastDayBoundaryHour;
    const broadcastDay = now.getHours() < boundaryHour ? addDays(now, -1) : now;
    return formatDate(broadcastDay);
  }

  resolveDay(now) {
    if (!this.date) {
      return this.resolveToday(now);
    }
    return this.date;
  }

  resolveWeek(now) {
    const days = [];
    let yearValue = this.year || now.getFullYear();
    let weekValue = this.week;

    if (!weekValue || weekValue === 0) {
      const nextWeek = addDays(now, 7);
      const { isoYear, isoWeek } = isoWeekInfo(nextWeek);
      weekValue = isoWeek;
      if (!this.year) {
        yearValue = isoYear;
      }
    }

    const startOfWeek = isoWeekToDate(yearValue, weekValue);
    const totalDays = Math.max(1, this.daysPerPeriod);
    for (let i = 0; i < totalDays; i += 1) {
      const day = addDays(startOfWeek, i);
      days.push(formatDate(day));
    }

    return days;
  }
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isoWeekInfo(date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return { isoYear: tmp.getUTCFullYear(), isoWeek: weekNo };
}

function isoWeekToDate(year, week) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const ISOweekStart = simple;
  if (dow <= 4 && dow !== 0) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + (8 - simple.getUTCDay()));
  }
  return new Date(ISOweekStart.getFullYear(), ISOweekStart.getMonth(), ISOweekStart.getDate());
}

module.exports = {
  DatePlanner
};
