import { createCard, fetchSamples } from './api.js';
import { byId, createElement } from './dom.js';
import {
  addSpecRow,
  fillForm,
  readFormProduct,
  readJsonProduct,
  setJsonText,
} from './form.js';
import { attachCopyButton, renderResult, selectResultTab } from './render.js';

const SCREEN_IDS = ['input-screen', 'loading-screen', 'error-screen', 'result-screen'];

const state = {
  request: null,
  markdown: '',
  inputTab: 'form',
};

function showScreen(screenId) {
  SCREEN_IDS.forEach((id) => {
    byId(id).hidden = id !== screenId;
  });
}

function selectInputTab(tab) {
  state.inputTab = tab;
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.tab === tab));
  });
  byId('panel-form').hidden = tab !== 'form';
  byId('panel-json').hidden = tab !== 'json';
}

async function generate(product) {
  state.request = product;
  showScreen('loading-screen');
  try {
    const data = await createCard(product);
    state.markdown = data.markdown;
    renderResult(data);
    selectResultTab('card');
    showScreen('result-screen');
  } catch (error) {
    byId('error-message').textContent = error.message;
    showScreen('error-screen');
  }
}

function handleSubmit() {
  const product = state.inputTab === 'form' ? readFormProduct() : readJsonProduct();
  if (product) generate(product);
}

function renderSampleButtons(samples) {
  const container = byId('sample-buttons');
  samples.forEach((sample) => {
    const button = createElement('button', 'btn btn-subtle btn-sm', sample.label);
    button.type = 'button';
    button.addEventListener('click', () => {
      fillForm(sample.product);
      setJsonText(JSON.stringify(sample.product, null, 2));
    });
    container.appendChild(button);
  });
}

async function loadSamples() {
  try {
    const { samples } = await fetchSamples();
    renderSampleButtons(samples);
  } catch (error) {
    const errorElement = byId('samples-error');
    errorElement.textContent = `Примеры не загрузились: ${error.message}`;
    errorElement.hidden = false;
  }
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => selectInputTab(button.dataset.tab));
  });
  document.querySelectorAll('[data-result-tab]').forEach((button) => {
    button.addEventListener('click', () => selectResultTab(button.dataset.resultTab));
  });

  byId('add-spec').addEventListener('click', () => addSpecRow());
  byId('submit').addEventListener('click', handleSubmit);
  byId('error-edit').addEventListener('click', () => showScreen('input-screen'));
  byId('error-retry').addEventListener('click', () => generate(state.request));
  byId('edit-data').addEventListener('click', () => showScreen('input-screen'));
  byId('regenerate').addEventListener('click', () => generate(state.request));

  attachCopyButton(byId('copy-all'), () => state.markdown);
  attachCopyButton(byId('copy-json'), () => byId('json-output').textContent);
}

function init() {
  addSpecRow();
  selectInputTab('form');
  bindEvents();
  loadSamples();
}

init();
