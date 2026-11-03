export const NO_DATA = 'данных нет';

export function cardToMarkdown(card) {
  const lines = [
    '## Заголовок',
    card.seoTitle || NO_DATA,
    '',
    '## Описание',
    card.seoDescription || NO_DATA,
    '',
    '## Ключевые характеристики',
    ...bulletList(card.keyCharacteristics.map((item) => `**${item.name}:** ${item.value || NO_DATA}`)),
    '',
    '## Поисковые запросы',
    ...bulletList(card.searchQueries),
    '',
    '## Блок для менеджера',
    `**Кому подходит:** ${card.managerBlock.suitableFor || NO_DATA}`,
    '',
    `**Какие задачи решает:** ${card.managerBlock.tasks || NO_DATA}`,
  ];

  if (card.missingData.length) {
    lines.push('', '## Что нужно уточнить', ...bulletList(card.missingData));
  }
  return lines.join('\n');
}

function bulletList(items) {
  return items.length ? items.map((item) => `- ${item}`) : [NO_DATA];
}
