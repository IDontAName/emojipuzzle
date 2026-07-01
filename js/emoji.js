const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

const EMOJI_CLUSTER_RE = new RegExp(
  '^(?:' +
    '\\p{Extended_Pictographic}(?:\\uFE0F)?(?:[\\u{1F3FB}-\\u{1F3FF}])?' +
      '(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F)?(?:[\\u{1F3FB}-\\u{1F3FF}])?)*' +
    '|\\p{Regional_Indicator}\\p{Regional_Indicator}' +
    '|[0-9#*]\\uFE0F?\\u20E3' +
  ')$',
  'u'
);

function clusters(str) {
  return [...segmenter.segment(str)].map((s) => s.segment);
}

export function isEmojiOnly(str) {
  const trimmed = str.replace(/\s+/g, '');
  if (!trimmed) return false;
  return clusters(trimmed).every((c) => EMOJI_CLUSTER_RE.test(c));
}

export function filterEmojiOnly(str) {
  return clusters(str)
    .filter((c) => /\s/.test(c) || EMOJI_CLUSTER_RE.test(c))
    .join('');
}
