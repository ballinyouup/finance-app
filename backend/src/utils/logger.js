function timestamp() {
  return new Date().toISOString();
}

export function maskEmail(email) {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return email;
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

export const logger = {
  info(message, meta = {}) {
    console.log(`[${timestamp()}] INFO ${message}`, meta);
  },
  warn(message, meta = {}) {
    console.warn(`[${timestamp()}] WARN ${message}`, meta);
  },
  error(message, meta = {}) {
    console.error(`[${timestamp()}] ERROR ${message}`, meta);
  }
};
