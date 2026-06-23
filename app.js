const SUPABASE_URL = 'https://pqnpbsyhmlpfmwhhhrts.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_6JRxmLYOqYY6uFW_GBlaMQ_mqhWuW_v';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const categoryTabs = document.getElementById('categoryTabs');
const modelGrid = document.getElementById('modelGrid');
const modeGrid = document.getElementById('modeGrid');
const templateList = document.getElementById('templateList');
const taskInput = document.getElementById('taskInput');
const generateBtn = document.getElementById('generateBtn');
const resultSection = document.getElementById('resultSection');
const resultModel = document.getElementById('resultModel');
const resultBody = document.getElementById('resultBody');
const copyBtn = document.getElementById('copyBtn');

let templates = [];
let selectedCategory = 'photo';
let selectedModel = 'nana';
let selectedMode = 'create';
let selectedTemplate = null;

const MODELS = [
  { id: 'nana', label: 'Nana' },
  { id: 'gpt2', label: 'GPT-2' },
  { id: 'kling', label: 'Kling' },
  { id: 'sora2', label: 'Sora2' }
];

const MODES = [
  { id: 'create', label: 'Создать' },
  { id: 'edit', label: 'Редактировать' }
];

function setActiveButton(container, target) {
  Array.from(container.children).forEach((button) => {
    button.classList.toggle('active', button === target);
  });
}

function renderModels() {
  modelGrid.innerHTML = '';
  MODELS.forEach((model) => {
    const btn = document.createElement('button');
    btn.className = 'model-card' + (selectedModel === model.id ? ' active' : '');
    btn.type = 'button';
    btn.textContent = model.label;
    btn.addEventListener('click', () => {
      selectedModel = model.id;
      renderModels();
      renderTemplates();
    });
    modelGrid.appendChild(btn);
  });
}

function renderModes() {
  modeGrid.innerHTML = '';
  MODES.forEach((mode) => {
    const btn = document.createElement('button');
    btn.className = 'model-card' + (selectedMode === mode.id ? ' active' : '');
    btn.type = 'button';
    btn.textContent = mode.label;
    btn.addEventListener('click', () => {
      selectedMode = mode.id;
      renderModes();
      renderTemplates();
    });
    modeGrid.appendChild(btn);
  });
}

function renderTemplates() {
  const filtered = templates.filter((template) => {
    return template.category === selectedCategory && template.model === selectedModel && template.mode === selectedMode;
  });

  templateList.innerHTML = '';

  if (filtered.length === 0) {
    templateList.innerHTML = '<div class="template-loading">Шаблонов не найдено. Попробуй другую комбинацию.</div>';
    return;
  }

  filtered.forEach((template) => {
    const card = document.createElement('button');
    card.className = 'template-card' + (selectedTemplate?.id === template.id ? ' active' : '');
    card.type = 'button';
    card.innerHTML = `
      <strong>${template.name}</strong>
      <div class="template-meta">${template.author || 'system'}</div>
      <div class="template-text">${template.template}</div>
    `;
    card.addEventListener('click', () => {
      selectedTemplate = template;
      renderTemplates();
    });
    templateList.appendChild(card);
  });
}

async function loadTemplates() {
  templateList.innerHTML = '<div class="template-loading">Загрузка шаблонов...</div>';

  const { data, error } = await supabaseClient.from('templates').select('*').order('created_at', { ascending: false });

  if (error) {
    templateList.innerHTML = `<div class="template-loading">Ошибка загрузки шаблонов: ${error.message}</div>`;
    return;
  }

  templates = data || [];
  selectedTemplate = templates.find((item) => item.category === selectedCategory && item.model === selectedModel && item.mode === selectedMode) || null;
  renderTemplates();
}

async function generatePrompt() {
  const task = taskInput.value.trim();
  if (!task) {
    alert('Опиши, что нужно создать.');
    return;
  }

  const promptText = selectedTemplate ? `${selectedTemplate.template}\n\nЗадача: ${task}` : task;

  resultModel.textContent = `Model: ${selectedModel.toUpperCase()}`;
  resultBody.textContent = 'Генерируется...';
  resultSection.style.display = 'block';

  try {
    const response = await fetch('/api/deepseek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: 'Ты помогаешь создавать промпты по шаблону.',
        messages: [{ role: 'user', content: promptText }],
        max_tokens: 800
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.content?.[0]?.text || 'Ошибка ответа сервера');
    }

    resultBody.textContent = data.content?.[0]?.text || 'Пустой ответ.';
  } catch (error) {
    resultBody.textContent = `Ошибка: ${error.message}`;
  }
}

function setupCategoryTabs() {
  Array.from(categoryTabs.children).forEach((button) => {
    button.addEventListener('click', () => {
      selectedCategory = button.dataset.cat;
      setActiveButton(categoryTabs, button);
      renderTemplates();
    });
  });
}

copyBtn.addEventListener('click', () => {
  const text = resultBody.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text);
});

generateBtn.addEventListener('click', generatePrompt);

renderModels();
renderModes();
setupCategoryTabs();
loadTemplates();
