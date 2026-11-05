// Shared formatters, so every page shows dates and numbers the same way.
// Fixed time zone so server and browser render the same text (no hydration mismatch).

export const dateFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const timeFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
});

export const dateTimeFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  dateStyle: "short",
  timeStyle: "short",
});

export const numberFmt = new Intl.NumberFormat("en-GB");

export const decimalFmt = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});
