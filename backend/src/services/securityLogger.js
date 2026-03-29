export function securityLog(eventType, details = {}, level = 'warn') {
  const entry = {
    type: 'security',
    eventType,
    timestamp: new Date().toISOString(),
    ...details
  };

  const serialized = JSON.stringify(entry);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'info') {
    console.info(serialized);
    return;
  }

  console.warn(serialized);
}
