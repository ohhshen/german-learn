// 練習題的答案比對:大小寫、標點、變音字母的差異都不該算錯。
const UMLAUTS = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' };

function foldUmlauts(text) {
  return text.replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c]);
}

// 沒有德文鍵盤的人會打 "Brueder",要和 "Brüder" 視為同一個答案。
export function normalizeAnswer(text, caseSensitive = false) {
  const trimmed = foldUmlauts(String(text ?? '').trim())
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:。,!?]+$/u, '');
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

// row 是 exercises 資料表的一列(options / answer 仍是 JSON 字串)。
export function checkAnswer(row, submitted) {
  const answer = JSON.parse(row.answer);

  if (row.type === 'choice') {
    const options = JSON.parse(row.options);
    const picked = Number(submitted);
    return {
      correct: picked === answer,
      expected: options[answer],
      explanation: row.explanation,
    };
  }

  const caseSensitive = row.case_sensitive === 1;
  const mine = normalizeAnswer(submitted, caseSensitive);
  return {
    correct: mine.length > 0 && answer.some((a) => normalizeAnswer(a, caseSensitive) === mine),
    expected: answer[0],
    explanation: row.explanation,
  };
}
