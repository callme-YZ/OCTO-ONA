// ==================== i18n System ====================

let currentLang = 'en';
let translations = {};

// Load language file
async function loadLanguage(lang) {
  try {
    const response = await fetch(`/lang/${lang}.json`);
    translations = await response.json();
    currentLang = lang;
    applyTranslations();
    updateLangButtons();
    
    // Save preference
    localStorage.setItem('octo-ona-lang', lang);
  } catch (error) {
    console.error('Failed to load language:', error);
  }
}

// Apply translations to DOM
function applyTranslations() {
  // Update text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = getNestedValue(translations, key);
    if (text) {
      if (el.tagName === 'TITLE') {
        document.title = text;
      } else {
        el.textContent = text;
      }
    }
  });
  
  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const text = getNestedValue(translations, key);
    if (text) {
      el.placeholder = text;
    }
  });
}

// Get nested object value by dot notation
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Get translated message
function t(key) {
  return getNestedValue(translations, key) || key;
}

// Update language button states
function updateLangButtons() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

// Language switcher event listeners
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    loadLanguage(btn.dataset.lang);
  });
});

// Initialize language
const savedLang = localStorage.getItem('octo-ona-lang') || 'en';
loadLanguage(savedLang);

// ==================== Application Logic ====================

// State
let currentAdapter = 'discord';
let uploadedFilePath = null;

// Elements
const adapterTypeSelect = document.getElementById('adapterType');
const discordConfig = document.getElementById('discord-config');
const githubConfig = document.getElementById('github-config');

// Switch adapter type
// Switch adapter type
adapterTypeSelect.addEventListener('change', (e) => {
  currentAdapter = e.target.value;
  
  // Hide all configs
  discordConfig.style.display = 'none';
  githubConfig.style.display = 'none';
  const octoConfig = document.getElementById('octo-config');
  if (octoConfig) octoConfig.style.display = 'none';
  
  // Show selected config
  if (currentAdapter === 'discord') {
    discordConfig.style.display = 'block';
  } else if (currentAdapter === 'github') {
    githubConfig.style.display = 'block';
  } else if (currentAdapter === 'octo' && octoConfig) {
  } else if (currentAdapter === 'excel') {
    const excelConfig = document.getElementById('excel-config');
    if (excelConfig) excelConfig.style.display = 'block';
    octoConfig.style.display = 'block';
  }
});

// Test Connection
document.getElementById('test-connection').addEventListener('click', async () => {
  const statusDiv = document.getElementById('connection-status');
  statusDiv.innerHTML = `<div class="status info">${t('messages.connecting')}</div>`;
  
  const config = getConfig();
  
  try {
    const response = await fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      statusDiv.innerHTML = `<div class="status success">${t('messages.success')}</div>`;
    } else {
      statusDiv.innerHTML = `<div class="status error">${t('messages.error')}${result.error}</div>`;
    }
  } catch (error) {
    statusDiv.innerHTML = `<div class="status error">${t('messages.error')}${error.message}</div>`;
  }
});

// Preview Network
document.getElementById('preview-btn').addEventListener('click', async () => {
  const previewDiv = document.getElementById('preview-content');
  previewDiv.innerHTML = `<div class="status info">${t('messages.previewing')}</div>`;
  
  const config = getConfig();
  
  try {
    const response = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      previewDiv.innerHTML = `
        <div class="preview-stats">
          <div class="stat-card">
            <div class="stat-label">${t('step3.nodes')}</div>
            <div class="stat-value">${result.stats.totalNodes}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">${t('step3.edges')}</div>
            <div class="stat-value">${result.stats.totalEdges}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">${t('step3.messages')}</div>
            <div class="stat-value">${result.stats.totalMessages}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">${t('step3.time_range')}</div>
            <div class="stat-value">${formatDateRange(result.stats.startTime, result.stats.endTime)}</div>
          </div>
        </div>
      `;
    } else {
      previewDiv.innerHTML = `<div class="status error">${t('messages.error')}${result.error}</div>`;
    }
  } catch (error) {
    previewDiv.innerHTML = `<div class="status error">${t('messages.error')}${error.message}</div>`;
  }
});

// Run Analysis
document.getElementById('run-analysis').addEventListener('click', async () => {
  const resultDiv = document.getElementById('analysis-result');
  resultDiv.innerHTML = `<div class="status info">${t('messages.analyzing')}</div>`;
  
  const config = getConfig();
  
  try {
    const response = await fetch('/api/run-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      resultDiv.innerHTML = `
        <div class="status success">${t('messages.complete')}</div>
        <a href="${result.dashboardPath}" target="_blank" class="dashboard-link">
          📊 Open Dashboard
        </a>
      `;
    } else {
      resultDiv.innerHTML = `<div class="status error">${t('messages.error')}${result.error}</div>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<div class="status error">${t('messages.error')}${error.message}</div>`;
  }
});

// Helper Functions

function formatDateRange(start, end) {
  const startDate = new Date(start).toLocaleDateString();
  const endDate = new Date(end).toLocaleDateString();
  return `${startDate} - ${endDate}`;
}
// Helper Functions
function getConfig() {
  const config = {
    adapter: currentAdapter,
    startTime: document.getElementById('start-date').value,
    endTime: document.getElementById('end-date').value
  };
  
  if (currentAdapter === 'discord') {
    config.token = document.getElementById('discord-token').value;
    config.guildId = document.getElementById('discord-guild').value;
    const channels = document.getElementById('discord-channels').value;
    if (channels) {
      config.channelIds = channels.split(',').map(c => c.trim());
    }
  } else if (currentAdapter === 'github') {
    config.token = document.getElementById('github-token').value;
    config.owner = document.getElementById('github-owner').value;
    config.repo = document.getElementById('github-repo').value;
  } else if (currentAdapter === 'octo') {
  } else if (currentAdapter === 'excel') {
    if (!window.uploadedFilePath) {
      alert('Please upload an Excel file first');
      return config;
    }
    config.filePath = window.uploadedFilePath;
    config.host = document.getElementById('octo-host').value;
    config.port = parseInt(document.getElementById('octo-port').value) || 3306;
    config.user = document.getElementById('octo-user').value;
    config.password = document.getElementById('octo-password').value;
    config.database = document.getElementById('octo-database').value;
    const channels = document.getElementById('discord-channels').value; // Reuse channels input
    if (channels) {
      config.channelIds = channels.split(',').map(c => c.trim());
    }
  } else if (currentAdapter === 'excel') {
    if (!window.uploadedFilePath) {
      alert('Please upload an Excel file first');
      return config;
    }
    config.filePath = window.uploadedFilePath;
  }
  
  return config;
}

// ==================== Excel Support ====================

// Download template
const downloadTemplateBtn = document.getElementById('download-template');
if (downloadTemplateBtn) {
  downloadTemplateBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/template');
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'OCTO-ONA-Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download template: ' + error.message);
    }
  });
}

// File upload
const excelFileInput = document.getElementById('excel-file');
let uploadedFilePath = null;

if (excelFileInput) {
  excelFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const uploadStatus = document.getElementById('upload-status');
    uploadStatus.innerHTML = '<div class="status info">Uploading...</div>';
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        uploadedFilePath = result.filePath;
        uploadStatus.innerHTML = `<div class="status success">✅ File uploaded successfully! (${result.stats.users} users, ${result.stats.messages} messages)</div>`;
      } else {
        uploadStatus.innerHTML = `<div class="status error">❌ Upload failed: ${result.error}</div>`;
      }
    } catch (error) {
      uploadStatus.innerHTML = `<div class="status error">❌ Upload failed: ${error.message}</div>`;
    }
  });
}

// Update getConfig to support Excel
