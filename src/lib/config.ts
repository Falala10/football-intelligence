/**
 * IANA timezone used to group matches into days and to show kick-off times.
 * Override with the APP_TIMEZONE environment variable.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/New_York";
