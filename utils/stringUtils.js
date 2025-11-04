const capitalizeWords = (str) => {
  if (!str || typeof str !== 'string') return '';

  return str
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

const normalizeSpaces = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ');
};

const sanitizeTextInput = (str) => {
  return capitalizeWords(str);
};

const sanitizeName = (str) => {
  if (!str || typeof str !== 'string') return '';
  const cleaned = str.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
  return capitalizeWords(cleaned);
};

const sanitizeGeneralText = (str) => {
  if (!str || typeof str !== 'string') return '';

  return str
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      if (/\d/.test(word)) return word;
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().replace(/\s+/g, '');
};

module.exports = {
  capitalizeWords,
  normalizeSpaces,
  sanitizeTextInput,
  sanitizeName,
  sanitizeGeneralText,
  sanitizeEmail
};
