/** Constantes et helpers de formatage partagés par le panel admin. */
export const PAGE_SIZE = 100;
export const REQUEST_TIMEOUT_MS = 9000;

export const safeDate = value => {
  if (!value) return 'N/A';
  const date =
    typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
};

export const dateMs = value => {
  if (!value) return 0;
  const date =
    typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export const withTimeout = (promise, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timeout`)),
        REQUEST_TIMEOUT_MS,
      ),
    ),
  ]);

export const testServerEndpoint = async endpoint => {
  const response = await withTimeout(fetch(endpoint), endpoint);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok)
    throw new Error(data.message || `HTTP ${response.status}`);
  return data.message || 'Test OK';
};

export const downloadFile = (filename, content, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const toCsv = rows => {
  if (!rows.length) return '';
  const headers = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach(key => keys.add(key));
      return keys;
    }, new Set()),
  );
  const escapeCell = value => {
    const raw =
      typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    return `"${raw.replace(/"/g, '""')}"`;
  };
  return [
    headers.join(','),
    ...rows.map(row => headers.map(key => escapeCell(row[key])).join(',')),
  ].join('\n');
};

export const questionStats = questions => {
  const list = Array.isArray(questions) ? questions : [];
  return list.reduce(
    (acc, question) => {
      if (question?.type === 'open') acc.open += 1;
      else if (question?.type === 'mcq') acc.mcq += 1;
      else acc.invalid += 1;
      if (Array.isArray(question?.options) && question.options.length > 5)
        acc.tooManyChoices += 1;
      return acc;
    },
    { mcq: 0, open: 0, invalid: 0, tooManyChoices: 0 },
  );
};
