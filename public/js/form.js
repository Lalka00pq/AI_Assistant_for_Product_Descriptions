import { byId } from './dom.js';

const SPEC_TEMPLATE_ID = 'spec-template';

export function addSpecRow(name = '', value = '') {
  const fragment = byId(SPEC_TEMPLATE_ID).content.cloneNode(true);
  const row = fragment.querySelector('.spec-row');
  row.querySelector('.spec-name').value = name;
  row.querySelector('.spec-value').value = value;
  row.querySelector('.spec-remove').addEventListener('click', () => row.remove());
  byId('specs').appendChild(fragment);
}

export function fillForm(product) {
  byId('name').value = product.name ?? '';
  byId('manufacturer').value = product.manufacturer ?? '';
  byId('description').value = product.description ?? '';
  byId('specs').replaceChildren();
  Object.entries(product.specs ?? {}).forEach(([name, value]) => addSpecRow(name, value));
  if (!byId('specs').children.length) addSpecRow();
  setFieldInvalid('name', false);
  setFieldInvalid('manufacturer', false);
}

export function readFormProduct() {
  const product = {
    name: byId('name').value.trim(),
    manufacturer: byId('manufacturer').value.trim(),
    description: byId('description').value.trim(),
    specs: readSpecs(),
  };
  setFieldInvalid('name', !product.name);
  setFieldInvalid('manufacturer', !product.manufacturer);
  return product.name && product.manufacturer ? product : null;
}

export function readJsonProduct() {
  const text = byId('json-input').value.trim();
  if (!text) {
    showJsonError('Вставьте данные товара в формате JSON.');
    return null;
  }
  try {
    const product = JSON.parse(text);
    hideJsonError();
    return product;
  } catch {
    showJsonError('JSON составлен с ошибкой. Проверьте кавычки, запятые и скобки.');
    return null;
  }
}

export function setJsonText(text) {
  byId('json-input').value = text;
  hideJsonError();
}

function readSpecs() {
  const specs = {};
  byId('specs')
    .querySelectorAll('.spec-row')
    .forEach((row) => {
      const name = row.querySelector('.spec-name').value.trim();
      const value = row.querySelector('.spec-value').value.trim();
      if (name && value) specs[name] = value;
    });
  return specs;
}

function setFieldInvalid(inputId, invalid) {
  byId(inputId).setAttribute('aria-invalid', String(invalid));
  byId(`error-${inputId}`).hidden = !invalid;
}

function showJsonError(message) {
  const errorElement = byId('json-error');
  errorElement.textContent = message;
  errorElement.hidden = false;
}

function hideJsonError() {
  byId('json-error').hidden = true;
}
