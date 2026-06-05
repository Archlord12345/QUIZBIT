const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const normalizeGenerationOptions = body => {
  const questionType = ['mcq', 'open', 'mixed'].includes(body?.questionType)
    ? body.questionType
    : 'mixed';
  return {
    questionType,
    choiceCount: Math.max(2, Math.min(5, Number(body?.choiceCount || 4))),
    openAnswerMode: body?.openAnswerMode === 'exact' ? 'exact' : 'flexible',
  };
};

export const buildFallbackQuestions = (prompt, count, options = {}) => {
  const theme = String(prompt || 'Quiz offline').trim();
  const questionType = options.questionType || 'mixed';
  const choiceCount = Math.max(2, Math.min(5, Number(options.choiceCount || 4)));
  const items = [];

  for (let index = 0; index < count; index += 1) {
    const useOpen =
      questionType === 'open' ||
      (questionType === 'mixed' && index % 2 === 1);
    if (useOpen) {
      items.push({
        id: uid('open'),
        text: `Question ouverte ${index + 1} sur ${theme}`,
        answer: `Reponse ${index + 1}`,
        type: 'open',
        exactAnswer: options.openAnswerMode === 'exact',
      });
      continue;
    }
    const answer = 'A';
    const optionsList = Array.from({ length: choiceCount }, (_, i) =>
      String.fromCharCode(65 + i),
    );
    items.push({
      id: uid('mcq'),
      text: `Question ${index + 1} sur ${theme}`,
      answer,
      options: optionsList,
      type: 'mcq',
    });
  }
  return items;
};
