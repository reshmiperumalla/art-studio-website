// Dates are stored as plain text "YYYY-MM-DD".
// parseDateOnly: returns a Date if the text is a real calendar date, otherwise null.
function parseDateOnly(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null; // e.g. 2026-02-31
  }
  return date;
}

// daysFromToday: how many days from today (server's local date) until the given date.
// Returns null if the date text is invalid.
function daysFromToday(str) {
  const date = parseDateOnly(str);
  if (!date) return null;
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date.getTime() - todayUTC) / 86400000);
}

module.exports = { parseDateOnly, daysFromToday };
