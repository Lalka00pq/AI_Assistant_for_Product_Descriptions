import { byId, createElement } from './dom.js';

const NO_DATA = 'данных нет';

export function renderResult({ card, checks }) {
  renderMissing(card.missingData);
  byId('json-output').textContent = JSON.stringify(card, null, 2);
  byId('result-card').replaceChildren(
    buildSection({
      title: 'Заголовок',
      copyText: card.seoTitle,
      meta: titleCounter(checks.seoTitle),
      body: textBlock(card.seoTitle),
    }),
    buildSection({
      title: 'Описание',
      copyText: card.seoDescription,
      meta: descriptionCounter(checks.seoDescription),
      body: textBlock(card.seoDescription),
    }),
    buildSection({
      title: 'Ключевые характеристики',
      copyText: card.keyCharacteristics.map((item) => `${item.name}: ${item.value}`).join('\n'),
      body: characteristicsTable(card.keyCharacteristics),
    }),
    buildSection({
      title: 'Поисковые запросы',
      copyText: card.searchQueries.join('\n'),
      meta: queriesCounter(checks.searchQueries),
      body: queriesList(card.searchQueries),
    }),
    buildSection({
      title: 'Блок для менеджера',
      copyText: `Кому подходит: ${card.managerBlock.suitableFor}\nКакие задачи решает: ${card.managerBlock.tasks}`,
      body: managerBlock(card.managerBlock),
    }),
  );
}

export function selectResultTab(tab) {
  document.querySelectorAll('[data-result-tab]').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.resultTab === tab));
  });
  byId('result-card').hidden = tab !== 'card';
  byId('result-json').hidden = tab !== 'json';
}

export function attachCopyButton(button, getText) {
  const label = button.textContent;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getText());
      button.textContent = 'Скопировано';
    } catch {
      button.textContent = 'Не удалось скопировать';
    }
    setTimeout(() => {
      button.textContent = label;
    }, 1600);
  });
}

function renderMissing(items) {
  byId('missing-list').replaceChildren(...items.map((item) => createElement('li', '', item)));
  byId('missing-box').hidden = items.length === 0;
}

function buildSection({ title, copyText, meta, body }) {
  const article = createElement('article', 'section-card');
  const titleBlock = createElement('div', 'section-title');
  titleBlock.appendChild(createElement('h3', '', title));
  if (meta) titleBlock.appendChild(meta);

  const copyButton = createElement('button', 'btn btn-outline btn-sm', 'Копировать');
  copyButton.type = 'button';
  attachCopyButton(copyButton, () => copyText);

  const header = createElement('div', 'section-header');
  header.append(titleBlock, copyButton);
  article.append(header, body);
  return article;
}

function counter(text, ok) {
  return createElement('span', `counter ${ok ? 'counter-ok' : 'counter-warn'}`, text);
}

function titleCounter({ length, max, ok }) {
  return counter(`Символов: ${length} из ${max}`, ok);
}

function descriptionCounter({ length, min, max, ok }) {
  return counter(`Символов: ${length} (норма ${min}–${max})`, ok);
}

function queriesCounter({ count, min, max, ok }) {
  return counter(`Запросов: ${count} (норма ${min}–${max})`, ok);
}

function textBlock(text) {
  return createElement('p', 'body-text', text || NO_DATA);
}

function characteristicsTable(items) {
  if (!items.length) return createElement('p', 'muted', NO_DATA);

  const table = createElement('table', 'table');
  const body = createElement('tbody');
  items.forEach((item) => {
    const row = createElement('tr');
    row.append(createElement('td', '', item.name), createElement('td', '', item.value || NO_DATA));
    body.appendChild(row);
  });
  table.appendChild(body);
  return table;
}

function queriesList(queries) {
  if (!queries.length) return createElement('p', 'muted', NO_DATA);

  const list = createElement('ul', 'list');
  queries.forEach((query) => list.appendChild(createElement('li', '', query)));
  return list;
}

function managerBlock({ suitableFor, tasks }) {
  const container = createElement('div', 'manager');
  [
    ['Кому подходит: ', suitableFor],
    ['Какие задачи решает: ', tasks],
  ].forEach(([label, value]) => {
    const paragraph = createElement('p');
    paragraph.append(createElement('strong', '', label), document.createTextNode(value || NO_DATA));
    container.appendChild(paragraph);
  });
  return container;
}
