const IST_OPTIONS = { timeZone: "Asia/Kolkata" } as const;

export function formatDateTimeIST(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    ...IST_OPTIONS,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateIST(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    ...IST_OPTIONS,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTimeIST(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-IN", {
    ...IST_OPTIONS,
    hour: "2-digit",
    minute: "2-digit",
  });
}
