/**
 * Mermaid Parser & Visual Studio - Client Controller
 * Pure Vanilla JavaScript (No frameworks)
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const appThemeSelect = document.getElementById('app-theme-select');
  const mermaidInput = document.getElementById('mermaid-input');
  const lineNumbers = document.getElementById('line-numbers');
  const templateSelect = document.getElementById('template-select');
  const lookSelect = document.getElementById('look-select');
  const canvasBgSelect = document.getElementById('canvas-bg-select');
  const themeSelect = document.getElementById('theme-select');
  const syntaxBadge = document.getElementById('syntax-status-badge');
  const statusText = document.getElementById('status-text');
  const errorBanner = document.getElementById('error-banner');
  const errorDetails = document.getElementById('error-details');

  // Stats Elements
  const statLines = document.getElementById('stat-lines');
  const statChars = document.getElementById('stat-chars');
  const statType = document.getElementById('stat-type');
  const renderBenchmark = document.getElementById('render-benchmark');

  // Action Buttons
  const btnBeautify = document.getElementById('btn-beautify');
  const btnClear = document.getElementById('btn-clear');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnParseServer = document.getElementById('btn-parse-server');

  // Tabs
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // Canvas / Diagram Viewport Elements
  const diagramViewport = document.getElementById('diagram-viewport');
  const diagramContainer = document.getElementById('diagram-container');
  const renderLoading = document.getElementById('render-loading');
  const zoomPercentage = document.getElementById('zoom-percentage');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const btnFit = document.getElementById('btn-fit');
  const btnCopySvg = document.getElementById('btn-copy-svg');
  const btnDownloadSvg = document.getElementById('btn-download-svg');
  const btnDownloadPng = document.getElementById('btn-download-png');
  const btnFullscreen = document.getElementById('btn-fullscreen');

  // Entities & AST View Elements
  const metricType = document.getElementById('metric-type');
  const metricNodes = document.getElementById('metric-nodes');
  const metricEdges = document.getElementById('metric-edges');
  const metricSubgraphs = document.getElementById('metric-subgraphs');
  const badgeNodesCount = document.getElementById('badge-nodes-count');
  const nodesList = document.getElementById('nodes-list');
  const edgesList = document.getElementById('edges-list');
  const entitiesSearch = document.getElementById('entities-search');
  const astJsonViewer = document.getElementById('ast-json-viewer');
  const astParseTime = document.getElementById('ast-parse-time');
  const btnCopyAst = document.getElementById('btn-copy-ast');
  const toastContainer = document.getElementById('toast-container');

  // App State
  let currentAstData = null;
  let examplesMap = {};
  let currentScale = 1;
  let translateX = 0;
  let translateY = 0;
  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;
  let renderDebounceTimer = null;
  let renderCounter = 0;

  // Apply Canvas Backdrop Style
  function applyCanvasBackdrop() {
    const bgVal = canvasBgSelect ? canvasBgSelect.value : 'grid';
    diagramViewport.classList.remove('bg-grid', 'bg-miro-grid', 'bg-dark-grid', 'bg-plain-white');
    diagramViewport.classList.add(`bg-${bgVal}`);

    const lookVal = lookSelect ? lookSelect.value : 'handDrawn';
    diagramContainer.classList.remove('look-handDrawn', 'look-classic', 'look-neo');
    diagramContainer.classList.add(`look-${lookVal}`);
  }

  // Initialize Mermaid with Theme & Hand-Drawn Miro Look
  function initMermaid(theme = 'neutral', look = 'handDrawn') {
    if (window.mermaid) {
      const isHandDrawn = look === 'handDrawn';
      const isWhiteboard = theme === 'neutral' || theme === 'default';

      const themeVariables = {
        fontFamily: isHandDrawn ? "'Kalam', 'Caveat', cursive, sans-serif" : "'Plus Jakarta Sans', sans-serif"
      };

      if (isHandDrawn && isWhiteboard) {
        themeVariables.primaryColor = '#ffffff';
        themeVariables.primaryTextColor = '#111827';
        themeVariables.primaryBorderColor = '#111827';
        themeVariables.lineColor = '#111827';
        themeVariables.nodeBorder = '#111827';
        themeVariables.edgeLabelBackground = '#ffffff';
      }

      window.mermaid.initialize({
        startOnLoad: false,
        look: look, // 'handDrawn' enables Rough.js sketchy whiteboard aesthetics
        theme: theme,
        securityLevel: 'loose',
        flowchart: {
          curve: isHandDrawn ? 'natural' : 'basis',
          htmlLabels: true
        },
        themeVariables
      });
    }
  }

  initMermaid('neutral', 'handDrawn');
  applyCanvasBackdrop();

  // Toast Notification Helper
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Update Line Numbers & Stats
  function updateEditorStats() {
    const text = mermaidInput.value;
    const lines = text.split('\n');
    const lineCount = lines.length;
    
    // Update line number gutter
    lineNumbers.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
    
    // Update stats bar
    statLines.textContent = `${lineCount} line${lineCount !== 1 ? 's' : ''}`;
    statChars.textContent = `${text.length} chars`;
  }

  // Synchronize Scroll between Textarea and Line Numbers
  mermaidInput.addEventListener('scroll', () => {
    lineNumbers.scrollTop = mermaidInput.scrollTop;
  });

  // Transform / Pan & Zoom Viewport
  function updateViewportTransform() {
    diagramContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
    zoomPercentage.textContent = `${Math.round(currentScale * 100)}%`;
  }

  function resetZoom() {
    currentScale = 1;
    translateX = 0;
    translateY = 0;
    updateViewportTransform();
  }

  function zoomIn() {
    currentScale = Math.min(currentScale * 1.25, 4);
    updateViewportTransform();
  }

  function zoomOut() {
    currentScale = Math.max(currentScale / 1.25, 0.2);
    updateViewportTransform();
  }

  function fitToScreen() {
    const svgEl = diagramContainer.querySelector('svg');
    if (!svgEl) return;
    
    const vpRect = diagramViewport.getBoundingClientRect();
    const svgBBox = svgEl.getBBox ? svgEl.getBBox() : svgEl.getBoundingClientRect();
    
    const svgWidth = svgBBox.width || 800;
    const svgHeight = svgBBox.height || 600;

    const scaleX = (vpRect.width - 80) / svgWidth;
    const scaleY = (vpRect.height - 80) / svgHeight;
    currentScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.5);
    translateX = 0;
    translateY = 0;
    updateViewportTransform();
  }

  // Pan interaction
  diagramViewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // only left click
    isPanning = true;
    startPanX = e.clientX - translateX;
    startPanY = e.clientY - translateY;
    diagramViewport.classList.add('panning');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    translateX = e.clientX - startPanX;
    translateY = e.clientY - startPanY;
    updateViewportTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      diagramViewport.classList.remove('panning');
    }
  });

  // Wheel zoom
  diagramViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = currentScale * zoomFactor;
    if (nextScale >= 0.15 && nextScale <= 5) {
      currentScale = nextScale;
      updateViewportTransform();
    }
  }, { passive: false });

  // Syntax Highlighting for JSON
  function syntaxHighlightJson(json) {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
  }

  // Parse & Render Pipeline
  async function processDiagram() {
    const code = mermaidInput.value.trim();
    if (!code) {
      diagramContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 40px;">No diagram code provided. Type code or pick a preset above.</div>';
      syntaxBadge.className = 'status-badge status-valid';
      statusText.textContent = 'Ready';
      errorBanner.classList.add('hidden');
      return;
    }

    const startTime = performance.now();
    renderLoading.classList.remove('hidden');

    // 1. Run Parser Module (AST Extraction)
    try {
      const astResult = window.MermaidParser ? window.MermaidParser.parse(code) : null;
      if (astResult) {
        currentAstData = astResult;
        updateAstViewer(astResult);
        updateEntitiesView(astResult);
        statType.textContent = `Type: ${astResult.type.toUpperCase()}`;
      }
    } catch (parseErr) {
      console.warn('AST Parse warning:', parseErr);
    }

    // 2. Validate & Render Diagram SVG
    try {
      if (window.mermaid) {
        // Validate syntax
        await window.mermaid.parse(code);

        // Render diagram
        renderCounter++;
        const renderId = `mermaid-render-${renderCounter}`;
        const { svg } = await window.mermaid.render(renderId, code);

        diagramContainer.innerHTML = svg;
        syntaxBadge.className = 'status-badge status-valid';
        statusText.textContent = 'Valid Syntax';
        errorBanner.classList.add('hidden');

        const elapsed = (performance.now() - startTime).toFixed(1);
        renderBenchmark.textContent = `Rendered in ${elapsed}ms`;
        astParseTime.textContent = `Parsed in ${elapsed}ms`;
      }
    } catch (renderError) {
      console.error('Mermaid render error:', renderError);
      syntaxBadge.className = 'status-badge status-error';
      statusText.textContent = 'Syntax Error';
      errorBanner.classList.remove('hidden');
      errorDetails.textContent = renderError.message || renderError.str || 'Diagram syntax could not be parsed';
      renderBenchmark.textContent = 'Render Failed';
    } finally {
      renderLoading.classList.add('hidden');
    }
  }

  // Update AST JSON tab
  function updateAstViewer(astData) {
    if (!astData) return;
    astJsonViewer.innerHTML = syntaxHighlightJson(astData);
  }

  // Update Entities tab (Nodes, Edges, Metrics)
  function updateEntitiesView(astData) {
    if (!astData) return;

    metricType.textContent = (astData.type || 'Generic').toUpperCase();
    metricNodes.textContent = astData.stats ? astData.stats.nodeCount : 0;
    metricEdges.textContent = astData.stats ? astData.stats.edgeCount : 0;
    metricSubgraphs.textContent = astData.stats && astData.stats.subgraphCount ? astData.stats.subgraphCount : 0;
    badgeNodesCount.textContent = `${astData.stats ? astData.stats.nodeCount : 0} nodes`;

    renderNodesList(astData);
    renderEdgesList(astData);
  }

  function renderNodesList(astData) {
    nodesList.innerHTML = '';
    const filter = (entitiesSearch.value || '').toLowerCase();

    let nodes = [];
    if (astData.ast && astData.ast.nodes) {
      nodes = astData.ast.nodes;
    } else if (astData.ast && astData.ast.participants) {
      nodes = astData.ast.participants;
    } else if (astData.ast && astData.ast.classes) {
      nodes = astData.ast.classes.map(c => ({ id: c.name, label: `${c.methods.length} methods, ${c.attributes.length} attrs`, shape: 'class' }));
    } else if (astData.ast && astData.ast.entities) {
      nodes = astData.ast.entities.map(e => ({ id: e.name, label: `${e.fields.length} fields`, shape: 'entity' }));
    } else if (astData.ast && astData.ast.slices) {
      nodes = astData.ast.slices.map(s => ({ id: s.label, label: `${s.value} (${s.percentage})`, shape: 'slice' }));
    }

    const filtered = nodes.filter(n => 
      (n.id && n.id.toLowerCase().includes(filter)) || 
      (n.label && n.label.toLowerCase().includes(filter))
    );

    if (filtered.length === 0) {
      nodesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; padding: 12px;">No matching nodes found.</div>';
      return;
    }

    filtered.forEach(node => {
      const card = document.createElement('div');
      card.className = 'entity-card';
      const shapeType = node.shape || node.type || 'node';
      card.innerHTML = `
        <div class="entity-left">
          <span class="shape-badge">${escapeHtml(shapeType)}</span>
          <div style="min-width: 0;">
            <div class="entity-name" title="${escapeHtml(node.id)}">${escapeHtml(node.id)}</div>
            <div class="entity-sub">${escapeHtml(node.label || node.id)}</div>
          </div>
        </div>
        ${node.subgraph ? `<span class="badge-studio" style="font-size:0.6rem;">${escapeHtml(node.subgraph)}</span>` : ''}
      `;
      nodesList.appendChild(card);
    });
  }

  function renderEdgesList(astData) {
    edgesList.innerHTML = '';
    const filter = (entitiesSearch.value || '').toLowerCase();

    let edges = [];
    if (astData.ast && astData.ast.edges) {
      edges = astData.ast.edges;
    } else if (astData.ast && astData.ast.messages) {
      edges = astData.ast.messages.map(m => ({ source: m.from, target: m.to, label: m.text, arrow: m.arrow }));
    } else if (astData.ast && astData.ast.relationships) {
      edges = astData.ast.relationships.map(r => ({ source: r.source, target: r.target, label: r.label, arrow: r.type || r.cardinality }));
    } else if (astData.ast && astData.ast.transitions) {
      edges = astData.ast.transitions.map(t => ({ source: t.from, target: t.to, label: t.label, arrow: '-->' }));
    }

    const filtered = edges.filter(e => 
      (e.source && e.source.toLowerCase().includes(filter)) || 
      (e.target && e.target.toLowerCase().includes(filter)) ||
      (e.label && e.label.toLowerCase().includes(filter))
    );

    if (filtered.length === 0) {
      edgesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.78rem; padding: 12px;">No connections detected.</div>';
      return;
    }

    filtered.forEach(edge => {
      const card = document.createElement('div');
      card.className = 'edge-card';
      card.innerHTML = `
        <div class="edge-flow">
          <span class="edge-node-badge">${escapeHtml(edge.source)}</span>
          <span class="edge-arrow">${escapeHtml(edge.arrow || '→')}</span>
          <span class="edge-node-badge">${escapeHtml(edge.target)}</span>
        </div>
        ${edge.label ? `<div class="edge-label">Label: "${escapeHtml(edge.label)}"</div>` : ''}
      `;
      edgesList.appendChild(card);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Trigger diagram debounced processing on editor changes
  function scheduleProcess() {
    updateEditorStats();
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(processDiagram, 280);
  }

  mermaidInput.addEventListener('input', scheduleProcess);

  // Entities Search Listener
  entitiesSearch.addEventListener('input', () => {
    if (currentAstData) {
      renderNodesList(currentAstData);
      renderEdgesList(currentAstData);
    }
  });

  // Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Quick Insert Snippets
  document.querySelectorAll('.snippet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const snippet = btn.getAttribute('data-insert');
      const pos = mermaidInput.selectionStart || mermaidInput.value.length;
      const text = mermaidInput.value;
      const newText = text.slice(0, pos) + (pos > 0 && !text.endsWith('\n') ? '\n    ' : '    ') + snippet + '\n' + text.slice(pos);
      mermaidInput.value = newText;
      mermaidInput.focus();
      scheduleProcess();
    });
  });

  // Beautify / Indent Formatter
  btnBeautify.addEventListener('click', () => {
    const lines = mermaidInput.value.split('\n');
    let formatted = [];
    let indentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      let l = lines[i].trim();
      if (!l) {
        formatted.push('');
        continue;
      }
      if (l.toLowerCase() === 'end' || l === '}') {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      formatted.push('    '.repeat(indentLevel) + l);
      if (l.match(/^subgraph\b/i) || l.match(/^class\s+.*\{/i) || l.match(/^state\s+.*\{/i)) {
        indentLevel++;
      }
    }
    mermaidInput.value = formatted.join('\n');
    scheduleProcess();
    showToast('Code indentation formatted');
  });

  // Clear Editor
  btnClear.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the editor?')) {
      mermaidInput.value = '';
      scheduleProcess();
    }
  });

  // Copy Mermaid Code
  btnCopyCode.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(mermaidInput.value);
      showToast('Mermaid code copied to clipboard');
    } catch {
      showToast('Failed to copy code', 'error');
    }
  });

  // Copy AST JSON
  btnCopyAst.addEventListener('click', async () => {
    if (!currentAstData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(currentAstData, null, 2));
      showToast('AST JSON copied to clipboard');
    } catch {
      showToast('Failed to copy AST', 'error');
    }
  });

  // Server-Side Parse Action
  btnParseServer.addEventListener('click', async () => {
    const code = mermaidInput.value;
    try {
      showToast('Running Node.js server parse...', 'info');
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success) {
        currentAstData = data.data;
        updateAstViewer(data.data);
        updateEntitiesView(data.data);
        showToast(`Server parsed ${data.data.stats ? data.data.stats.nodeCount : 0} nodes successfully!`);
      } else {
        showToast('Server parser returned error: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Server request failed: ' + err.message, 'error');
    }
  });

  // Canvas Control Buttons
  btnZoomIn.addEventListener('click', zoomIn);
  btnZoomOut.addEventListener('click', zoomOut);
  btnZoomReset.addEventListener('click', resetZoom);
  btnFit.addEventListener('click', fitToScreen);

  // Fullscreen Canvas Toggle
  btnFullscreen.addEventListener('click', () => {
    const isFull = diagramViewport.classList.toggle('fullscreen-mode');
    btnFullscreen.title = isFull ? 'Exit Fullscreen' : 'Toggle Fullscreen';
    if (isFull) {
      showToast('Press Esc or click again to exit fullscreen', 'info');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && diagramViewport.classList.contains('fullscreen-mode')) {
      diagramViewport.classList.remove('fullscreen-mode');
    }
  });

  // Theme & Style Handlers
  if (appThemeSelect) {
    appThemeSelect.addEventListener('change', () => {
      const mode = appThemeSelect.value;
      if (mode === 'light' || mode === 'miro') {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
        if (canvasBgSelect) canvasBgSelect.value = 'grid';
        if (themeSelect) themeSelect.value = 'neutral';
        if (lookSelect) lookSelect.value = 'handDrawn';
      } else {
        document.body.classList.remove('theme-light', 'theme-miro');
        document.body.classList.add('theme-dark');
        if (canvasBgSelect) canvasBgSelect.value = 'dark-grid';
        if (themeSelect) themeSelect.value = 'dark';
      }

      applyCanvasBackdrop();
      initMermaid(themeSelect.value, lookSelect.value);
      processDiagram();
      showToast(`App theme: ${mode === 'dark' ? '🌙 Dark Cosmic' : '☀️ Whiteboard Studio'}`);
    });
  }

  themeSelect.addEventListener('change', () => {
    initMermaid(themeSelect.value, lookSelect.value);
    applyCanvasBackdrop();
    processDiagram();
    showToast(`Diagram theme: ${themeSelect.value}`);
  });

  lookSelect.addEventListener('change', () => {
    initMermaid(themeSelect.value, lookSelect.value);
    applyCanvasBackdrop();
    processDiagram();
    showToast(`Style set to ${lookSelect.options[lookSelect.selectedIndex].text}`);
  });

  canvasBgSelect.addEventListener('change', () => {
    applyCanvasBackdrop();
    showToast(`Canvas backdrop: ${canvasBgSelect.options[canvasBgSelect.selectedIndex].text}`);
  });

  // Copy SVG Button
  btnCopySvg.addEventListener('click', async () => {
    const svgEl = diagramContainer.querySelector('svg');
    if (!svgEl) {
      showToast('No rendered SVG to copy', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(svgEl.outerHTML);
      showToast('SVG vector copied to clipboard');
    } catch {
      showToast('Failed to copy SVG', 'error');
    }
  });

  // Download SVG File
  btnDownloadSvg.addEventListener('click', () => {
    const svgEl = diagramContainer.querySelector('svg');
    if (!svgEl) {
      showToast('No rendered diagram to export', 'error');
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mermaid-diagram-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('SVG file downloaded successfully');
  });

  // Download High-Resolution PNG
  btnDownloadPng.addEventListener('click', () => {
    const svgEl = diagramContainer.querySelector('svg');
    if (!svgEl) {
      showToast('No diagram available to export', 'error');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const scaleFactor = 2; // High-DPI export
      const canvas = document.createElement('canvas');
      canvas.width = (img.naturalWidth || 1200) * scaleFactor;
      canvas.height = (img.naturalHeight || 800) * scaleFactor;
      const ctx = canvas.getContext('2d');

      // Draw background
      const isGrid = canvasBgSelect && (canvasBgSelect.value === 'grid' || canvasBgSelect.value === 'miro-grid');
      if (isGrid) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid pattern on exported image
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.12)';
        ctx.lineWidth = 1;
        const gridSize = 24 * scaleFactor;
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      } else if (canvasBgSelect && canvasBgSelect.value === 'plain-white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#0d121d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((pngBlob) => {
        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `mermaid-export-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
        showToast('High-Res PNG image exported!');
      }, 'image/png');
    };

    img.src = url;
  });

  // Load Examples from API
  async function loadPresetExamples() {
    try {
      const res = await fetch('/api/examples');
      const data = await res.json();
      if (data.success && data.examples) {
        data.examples.forEach(ex => {
          examplesMap[ex.id] = ex.code;
        });

        // Set initial example to Hand-Drawn Sketch
        if (examplesMap['sketch_flow']) {
          mermaidInput.value = examplesMap['sketch_flow'];
        } else if (examplesMap['miro_sketch']) {
          mermaidInput.value = examplesMap['miro_sketch'];
        } else if (examplesMap['microservices']) {
          mermaidInput.value = examplesMap['microservices'];
        }
      }
    } catch (e) {
      console.warn('Could not load examples from server, using fallback', e);
    }

    // Trigger initial render
    updateEditorStats();
    processDiagram();
  }

  // Template Switcher Change
  templateSelect.addEventListener('change', () => {
    const selectedId = templateSelect.value;
    if (examplesMap[selectedId]) {
      mermaidInput.value = examplesMap[selectedId];
      resetZoom();
      scheduleProcess();
      showToast(`Loaded ${templateSelect.options[templateSelect.selectedIndex].text}`);
    }
  });

  // ==========================================================
  // TERRAFORM IMPORTER CONTROLLER
  // ==========================================================
  const btnOpenTfModal = document.getElementById('btn-open-tf-modal');
  const tfModal = document.getElementById('tf-modal');
  const btnCloseTfModal = document.getElementById('btn-close-tf-modal');
  const btnTfCancel = document.getElementById('btn-tf-cancel');
  const btnTfConvert = document.getElementById('btn-tf-convert');
  const tfInput = document.getElementById('tf-input');
  const tfTemplateBtns = document.querySelectorAll('.tf-template-btn');

  const TF_TEMPLATES = {
    aws_3tier: `resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public_1" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_subnet" "private_1" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.10.0/24"
}

resource "aws_security_group" "web_sg" {
  name   = "web-security-group"
  vpc_id = aws_vpc.main.id
}

resource "aws_lb" "alb" {
  name               = "app-load-balancer"
  load_balancer_type = "application"
  subnets            = [aws_subnet.public_1.id]
}

resource "aws_instance" "web_server" {
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.private_1.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]
}

resource "aws_db_instance" "postgres" {
  engine         = "postgres"
  instance_class = "db.t3.micro"
}

resource "aws_s3_bucket" "static_assets" {
  bucket = "company-app-static-assets"
}`,
    serverless: `resource "aws_apigatewayv2_api" "http_api" {
  name          = "serverless-gateway"
  protocol_type = "HTTP"
}

resource "aws_lambda_function" "auth_fn" {
  function_name = "auth-handler"
  runtime       = "nodejs20.x"
}

resource "aws_lambda_function" "order_fn" {
  function_name = "order-processor"
  runtime       = "python3.11"
}

resource "aws_dynamodb_table" "orders" {
  name         = "orders-table"
  billing_mode = "PAY_PER_REQUEST"
}`,
    azure_vm: `resource "azurerm_virtual_network" "vnet" {
  name          = "production-vnet"
  address_space = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "app_subnet" {
  name                 = "app-subnet"
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.2.0/24"]
}

resource "azurerm_network_security_group" "nsg" {
  name = "app-nsg"
}

resource "azurerm_linux_virtual_machine" "app_vm" {
  name = "app-vm-01"
  size = "Standard_B2s"
}

resource "azurerm_cosmosdb_account" "db" {
  name = "cosmos-db-account"
}`
  };

  if (btnOpenTfModal && tfModal) {
    btnOpenTfModal.addEventListener('click', () => {
      tfModal.classList.remove('hidden');
      if (!tfInput.value.trim()) {
        tfInput.value = TF_TEMPLATES.aws_3tier;
      }
      tfInput.focus();
    });

    const closeTfModal = () => tfModal.classList.add('hidden');
    if (btnCloseTfModal) btnCloseTfModal.addEventListener('click', closeTfModal);
    if (btnTfCancel) btnTfCancel.addEventListener('click', closeTfModal);

    tfTemplateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-template');
        if (TF_TEMPLATES[key]) {
          tfInput.value = TF_TEMPLATES[key];
          showToast(`Loaded ${btn.textContent} template`);
        }
      });
    });

    if (btnTfConvert) {
      btnTfConvert.addEventListener('click', () => {
        const code = tfInput.value.trim();
        if (!code) {
          showToast('Please paste Terraform HCL code first', 'error');
          return;
        }

        try {
          if (window.TerraformParser) {
            const parsedModel = window.TerraformParser.parseHCL(code);
            const mermaidCode = window.TerraformParser.toMermaid(code);

            mermaidInput.value = mermaidCode;
            closeTfModal();
            resetZoom();
            scheduleProcess();

            const count = parsedModel.resources ? parsedModel.resources.length : 0;
            showToast(`Generated architecture from ${count} Terraform resources!`, 'success');
          } else {
            showToast('Terraform parser module not ready', 'error');
          }
        } catch (err) {
          console.error('Terraform parsing failed:', err);
          showToast('Failed to convert Terraform: ' + err.message, 'error');
        }
      });
    }
  }

  // Initialize App
  loadPresetExamples();
});
