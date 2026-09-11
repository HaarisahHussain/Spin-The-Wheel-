export function attendanceSummary(accounts) {
  const groups = {};
  for (const account of Object.values(accounts)) {
    if (!account.attendedAt) continue;
    const key = `${account.course} / ${account.level}`;
    groups[key] = (groups[key] || 0) + 1;
  }
  const summary = {};
  for (const [label, count] of Object.entries(groups)) {
    const group = count < 5 ? 'Other' : label;
    summary[group] = (summary[group] || 0) + count;
  }
  return summary;
}
