# code-to-chart

> **CodeToChart** — Unified Multi-Language Code & Infrastructure to Visual Charts Engine. Convert **Mermaid** diagrams and **Terraform (HCL)** infrastructure code into interactive, high-resolution architecture diagrams with deterministic AST parsing.

---

## ✨ Overview

**CodeToChart** enables developers, DevOps, and cloud architects to instantly visualize code and infrastructure without any external AI dependencies. Everything runs locally and deterministically with sub-millisecond execution times.

### 🌟 Supported Input Languages
1. **🧜 Mermaid (.mmd)**
   - Flowcharts, System Architecture, Decision Trees
   - Sequence Diagrams (Sync/Async calls, activations)
   - Entity Relationship Diagrams (ERD schemas & cardinality)
   - Class Diagrams (Interfaces, methods, inheritance)
   - State Diagrams, GitGraphs, and Pie Charts
2. **☁️ Terraform HCL (.tf)**
   - Deterministic HCL Block Parser (Brace-counting depth scanner)
   - Extracts Resources, Providers, Modules, and Cross-Resource References
   - Categorizes Cloud Services: VPC, Subnet, EC2, RDS Aurora/PostgreSQL, S3, Security Groups, ALB/NLB, Azure VNets/VMs, API Gateways, Lambda Functions
   - Auto-generates clean, hierarchical cloud architecture diagrams in real time

---

## 🎨 Dual-Mode Interactive Studio

- **Dynamic Editor Transformation**:
  - **Mermaid Mode**: Crisp violet/indigo styling, `.mmd` indicator, Mermaid quick-syntax snippets (`Node + Edge`, `Decision`, `Database`, `Subgraph`, `Sequence`, `Class`).
  - **Terraform Mode**: Cloud-themed interface with HashiCorp Purple & Cloud Cyan accents, `.tf` indicator, and Cloud Resource Snippets (`+ VPC`, `+ Subnet`, `+ EC2`, `+ RDS`, `+ S3`, `+ SecGroup`, `+ ALB`).
  - Preserves code buffers independently when switching between Mermaid and Terraform.
- **Real-Time Live Compilation**:
  - Live preview with debounced auto-compilation as you type.
  - Interactive Pan & Zoom Canvas (mouse drag, smooth wheel zoom, reset, fit-to-screen).
  - High-resolution exports: **Download Vector SVG**, **Download High-Res PNG (2x DPI)**, and **Copy SVG to clipboard**.
  - Canvas Styles: Whiteboard Grid, Chalkboard Dark Grid, and Plain White.
  - Looks: ✏️ Hand-Drawn Sketch (Rough.js), 📐 Classic Crisp, 💎 Neo Modern.
- **Graph Topology & AST Inspector**:
  - **Parsed Graph Tab**: Cards displaying extracted nodes, shapes, cloud categories, and relationships with search filter.
  - **AST JSON Tab**: Structured JSON model of either the Mermaid AST or Terraform Architecture Model.

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
The studio launches on:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📡 REST API Endpoints

### 1. Parse Mermaid Syntax to AST
```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "code": "flowchart TD\n    A[Web App] -->|HTTPS| B(API Gateway)\n    B --> C[(PostgreSQL DB)]"
  }'
```

### 2. Parse Terraform HCL to Architecture Chart
```bash
curl -X POST http://localhost:3000/api/terraform/parse \
  -H "Content-Type: application/json" \
  -d '{
    "hcl": "resource \"aws_vpc\" \"main\" {\n  cidr_block = \"10.0.0.0/16\"\n}\nresource \"aws_subnet\" \"public\" {\n  vpc_id = aws_vpc.main.id\n  cidr_block = \"10.0.1.0/24\"\n}"
  }'
```

---

## 📁 Repository Structure

```
code-to-chart/
├── package.json               # Package definition & scripts
├── server.js                  # Express backend & API endpoints
├── src/
│   ├── parser.js              # Universal Mermaid AST parser (Node & Browser)
│   ├── terraform-parser.js    # Deterministic Terraform HCL to Diagram compiler
│   └── examples.js            # Diagram & cloud architecture presets
└── public/
    ├── index.html             # CodeToChart studio layout & dual switcher
    ├── css/
    │   └── style.css          # Vanilla CSS design system & mode styling
    └── js/
        └── app.js             # Dual-engine controller & pan/zoom canvas
```

---

## 📄 License
ISC
