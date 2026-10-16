// Small timezone helpers built on Intl, so we don't need a date library.

// "2026-10-16" for the given instant, as seen in `timeZone`.
function ymdInTz(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// "+05:30" style UTC offset of `timeZone` at the given instant.
function offsetInTz(date, timeZone) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName').value; // "GMT+05:30" or "GMT"
  return name === 'GMT' ? '+00:00' : name.slice(3);
}

// Midnight (local to `timeZone`) of the day `daysAgo` days before `now`, as a UTC Date.
function startOfLocalDay(now, timeZone, daysAgo = 0) {
  const shifted = new Date(now.getTime() - daysAgo * 86400000);
  const ymd = ymdInTz(shifted, timeZone);
  return new Date(`${ymd}T00:00:00${offsetInTz(shifted, timeZone)}`);
}

// Every local date from `days - 1` days ago through today, oldest first.
function lastNDays(now, timeZone, days) {
  return Array.from({ length: days }, (_, i) => ymdInTz(new Date(now.getTime() - (days - 1 - i) * 86400000), timeZone));
}

function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

module.exports = { ymdInTz, offsetInTz, startOfLocalDay, lastNDays, isValidTimeZone };
