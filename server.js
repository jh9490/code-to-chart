const express = require('express');
const path = require('path');
const MermaidParser = require('./src/parser');
const EXAMPLES = require('./src/examples');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve Mermaid library locally from node_modules
app.use('/vendor/mermaid', express.static(path.join(__dirname, 'node_modules/mermaid/dist')));

// Serve shared parser module to client
app.use('/src/parser.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/parser.js'));
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get sample diagram templates
app.get('/api/examples', (req, res) => {
  res.json({
    success: true,
    count: EXAMPLES.length,
    examples: EXAMPLES
  });
});

// Parse Mermaid syntax into AST
app.post('/api/parse', (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Field "code" is required and must be a string'
      });
    }

    const parsed = MermaidParser.parse(code);
    return res.json({
      success: true,
      data: parsed
    });
  } catch (error) {
    console.error('Parsing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal parsing error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mermaid Parser & Studio running on http://localhost:${PORT}`);
});
