// State
let currentAdapter = 'discord';

// Elements
const adapterTypeSelect = document.getElementById('adapterType');
const discordConfig = document.getElementById('discord-config');
const githubConfig = document.getElementById('github-config');

// Switch adapter type
adapterTypeSelect.addEventListener('change', (e) => {
  currentAdapter = e.target.value;
  
  discordConfig.classList.add('hidden');
  githubConfig.classList.add('hidden');
  
  if (currentAdapter === 'discord') {
    discordConfig.classList.remove('hidden');
  } else if (currentAdapter === 'github') {
    githubConfig.classList.remove('hidden');
  }
});

// Test Connection
document.getElementById('test-connection').addEventListener('click', async () => {
  const statusDiv = document.getElementById('connection-status');
  statusDiv.innerHTML = '<div class="status info">Testing connection...</div>';
  
  const config = getConfig();
  
  try {
    const response = await fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapterType: currentAdapter, config }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      statusDiv.innerHTML = `<div class="status success">✅ ${result.message}</div>`;
    } else {
      statusDiv.innerHTML = `<div class="status error">❌ ${result.message}</div>`;
    }
  } catch (error) {
    statusDiv.innerHTML = `<div class="status error">❌ ${error.message}</div>`;
  }
});

// Preview Network
document.getElementById('preview-btn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('preview-status');
  statusDiv.innerHTML = '<div class="status info">Loading preview...</div>';
  
  const config = getConfig();
  const filters = getFilters();
  
  try {
    const response = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapterType: currentAdapter, config, filters }),
    });
    
    const result = await response.json();
    
    if (result.error) {
      statusDiv.innerHTML = `<div class="status error">❌ ${result.error}</div>`;
      return;
    }
    
    statusDiv.innerHTML = '<div class="status success">✅ Preview loaded successfully</div>';
  } catch (error) {
    statusDiv.innerHTML = `<div class="status error">❌ ${error.message}</div>`;
  }
});

// Run Analysis
document.getElementById('run-analysis').addEventListener('click', async () => {
  const statusDiv = document.getElementById('run-status');
  statusDiv.innerHTML = '<div class="status info">Running analysis... This may take a few minutes.</div>';
  
  const config = getConfig();
  const filters = getFilters();
  
  try {
    const response = await fetch('/api/run-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapterType: currentAdapter, config, filters, outputFormat: 'dashboard' }),
    });
    
    const result = await response.json();
    
    if (result.error) {
      statusDiv.innerHTML = `<div class="status error">❌ ${result.error}</div>`;
      return;
    }
    
    statusDiv.innerHTML = `
      <div class="status success">
        ✅ Analysis complete!<br>
        Output: <strong>${result.outputPath}</strong><br>
        Nodes: ${result.metrics.nodeCount}, Edges: ${result.metrics.edgeCount}
      </div>
    `;
  } catch (error) {
    statusDiv.innerHTML = `<div class="status error">❌ ${error.message}</div>`;
  }
});

// Helper functions
function getConfig() {
  if (currentAdapter === 'discord') {
    return {
      token: document.getElementById('discord-token').value,
      guildId: document.getElementById('discord-guild').value,
    };
  } else if (currentAdapter === 'github') {
    return {
      token: document.getElementById('github-token').value,
      owner: document.getElementById('github-owner').value,
      repo: document.getElementById('github-repo').value,
    };
  }
}

function getFilters() {
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  
  return {
    startTime: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endTime: endDate ? new Date(endDate) : new Date(),
  };
}
