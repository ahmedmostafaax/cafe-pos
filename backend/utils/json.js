function safeJSONParse(str, fallback = []) {
  if (str === undefined || str === null || str === '') return fallback;
  try { return JSON.parse(str); }
  catch { return fallback; }
}

module.exports = { safeJSONParse };

