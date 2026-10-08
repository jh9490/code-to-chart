# 🧜‍♀️ Mermaid Parser & Visual Studio

A modern Node.js and JavaScript visual tool and graph parser to tokenize Mermaid chart syntax into structured Abstract Syntax Trees (AST), inspect graph topology, and render interactive high-resolution diagrams.

---

## ✨ Features

- **AST Graph Tokenizer & Parser** (`src/parser.js`):
  - Extracts nodes, node shapes (rectangles, rounded pills, cylinders, subroutines, diamonds, hexagons, circles), labels, and classes.
  - Extracts graph edges, arrow styles (`solid`, `dotted`, `thick`), directions, and pipe/inline labels.
  - Extracts subgraphs, nested groups, sequence messages, class members, ER entities/fields, and pie slices.
  - Outputs a complete JSON AST with metrics (node counts, edge counts, diagram classification).
  - Universal design: runs in both **Node.js** and the **browser**.
- **Interactive Visual Studio**:
  - Live preview with debounced auto-render and instant error diagnostics.
  - Dynamic Pan & Zoom canvas (mouse drag, smooth wheel zoom, reset 1:1, fit-to-screen).
  - High-resolution exports: **Download Vector SVG**, **Download High-Res PNG (2x DPI)**, and **Copy SVG to clipboard**.
  - Diagram themes: *Dark Slate*, *Classic Light*, *Forest*, *Monochrome Neutral*, *Base*.
  - Fullscreen canvas mode (`Esc` to exit).
- **Graph Topology & AST Inspector**:
  - **Parsed Graph Tab**: Interactive cards showing extracted nodes with shape badges, and connections showing source/target/labels with live search filter.
  - **AST JSON Tab**: Colorized syntax-highlighted JSON viewer with instant "Copy JSON AST" action.
- **Curated Diagram Presets**:
  - Microservices Architecture (*Flowchart*)
  - OAuth 2.0 Auth Flow (*Sequence Diagram*)
  - E-Commerce Relational Schema (*ER Diagram*)
  - Order Processing State Machine (*State Diagram*)
  - Domain Model (*Class Diagram*)
  - Feature Branching (*GitGraph*)
  - Cloud Market Share (*Pie Chart*)
- **REST API**:
  - `POST /api/parse`: Parse any Mermaid string into JSON AST.
  - `GET /api/examples`: Fetch diagram preset catalog.
  - `GET /api/health`: Health status endpoint.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The application will launch on:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📡 REST API Usage

### Parse Mermaid Syntax to AST
```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "code": "flowchart TD\n    A[Web App] -->|HTTPS| B(API Gateway)\n    B --> C[(PostgreSQL DB)]"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "type": "flowchart",
    "direction": "TD",
    "ast": {
      "type": "flowchart",
      "direction": "TD",
      "nodes": [
        { "id": "A", "label": "Web App", "shape": "rectangle", "subgraph": null, "classes": [] },
        { "id": "B", "label": "API Gateway", "shape": "round", "subgraph": null, "classes": [] },
        { "id": "C", "label": "PostgreSQL DB", "shape": "cylinder", "subgraph": null, "classes": [] }
      ],
      "edges": [
        { "source": "A", "target": "B", "label": "HTTPS", "type": "solid", "arrow": "directed" },
        { "source": "B", "target": "C", "label": null, "type": "solid", "arrow": "directed" }
      ],
      "subgraphs": []
    },
    "stats": {
      "nodeCount": 3,
      "edgeCount": 2,
      "subgraphCount": 0
    }
  }
}
```

---

## 📁 Project Structure

```
mairmaid-parser/
├── package.json          # Dependencies & scripts
├── server.js             # Express server & API endpoints
├── src/
│   ├── parser.js         # Universal Mermaid AST parser (Node.js & browser)
│   └── examples.js       # Curated sample diagram presets
└── public/
    ├── index.html        # Modern HTML5 studio interface
    ├── css/
    │   └── style.css     # Vanilla CSS design system (dark glassmorphism, animations)
    └── js/
        └── app.js        # Client controller (pan/zoom, AST inspector, exports)
```
# mermaid-chart-parser
