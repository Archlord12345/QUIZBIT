const toErrorMessage = error =>
  error?.message || (typeof error === 'string' ? error : 'Erreur inconnue.');

const isQuotaOrRateLimit = (status, message) => {
  const msg = String(message || '');
  return (
    status === 429 ||
    /quota|rate.?limit|resource.?exhausted|too many requests|billing/i.test(msg)
  );
};

const withProviderFallback = async (
  primary,
  fallback,
  primaryName,
  fallbackName,
) => {
  try {
    return await primary();
  } catch (primaryError) {
    try {
      const result = await fallback();
      return {
        ...result,
        fallbackFrom: primaryName,
        fallbackReason: toErrorMessage(primaryError),
      };
    } catch (fallbackError) {
      throw new Error(
        `${primaryName}: ${toErrorMessage(primaryError)} | ${fallbackName}: ${toErrorMessage(fallbackError)}`,
      );
    }
  }
};

module.exports = {
  isQuotaOrRateLimit,
  toErrorMessage,
  withProviderFallback,
};
