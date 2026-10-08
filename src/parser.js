/**
 * Universal Mermaid Parser
 * Parses Mermaid diagram syntax into structured Abstract Syntax Tree (AST) & metadata.
 * Works in both Node.js (CommonJS / ES) and browser environments.
 */

class MermaidParser {
  /**
   * Parse Mermaid syntax string into structured AST
   * @param {string} code - Mermaid diagram code
   * @returns {Object} AST representation
   */
  static parse(code) {
    if (!code || typeof code !== 'string') {
      return {
        valid: false,
        error: 'Empty or invalid input',
        type: 'unknown',
        stats: { nodeCount: 0, edgeCount: 0 },
        ast: null
      };
    }

    const cleanCode = code.trim();

    // Extract optional YAML frontmatter (e.g. --- config: look: handDrawn ---)
    let frontmatter = null;
    let codeWithoutFrontmatter = cleanCode;
    if (cleanCode.startsWith('---')) {
      const endMatch = cleanCode.slice(3).search(/\r?\n---\r?\n/);
      if (endMatch !== -1) {
        frontmatter = cleanCode.slice(3, 3 + endMatch).trim();
        codeWithoutFrontmatter = cleanCode.slice(3 + endMatch + 4).trim();
      }
    }

    const lines = codeWithoutFrontmatter
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('%%'));

    if (lines.length === 0) {
      return {
        valid: false,
        error: 'Empty diagram after removing comments',
        type: 'unknown',
        stats: { nodeCount: 0, edgeCount: 0 },
        ast: null
      };
    }

    const firstLine = lines[0];
    const diagramType = this.detectType(firstLine, codeWithoutFrontmatter);

    let parsedResult;
    switch (diagramType) {
      case 'flowchart':
      case 'graph':
        parsedResult = this.parseFlowchart(lines);
        break;
      case 'sequence':
        parsedResult = this.parseSequence(lines);
        break;
      case 'class':
        parsedResult = this.parseClass(lines);
        break;
      case 'state':
        parsedResult = this.parseState(lines);
        break;
      case 'er':
        parsedResult = this.parseER(lines);
        break;
      case 'pie':
        parsedResult = this.parsePie(lines);
        break;
      case 'gitGraph':
        parsedResult = this.parseGitGraph(lines);
        break;
      default:
        parsedResult = this.parseGeneric(lines, diagramType);
        break;
    }

    return {
      valid: true,
      type: diagramType,
      raw: cleanCode,
      ...parsedResult
    };
  }

  /**
   * Detect diagram type from declaration line
   */
  static detectType(firstLine, fullCode) {
    const line = firstLine.toLowerCase();
    if (line.startsWith('flowchart') || line.startsWith('graph')) return 'flowchart';
    if (line.startsWith('sequencediagram')) return 'sequence';
    if (line.startsWith('classdiagram')) return 'class';
    if (line.startsWith('statediagram')) return 'state';
    if (line.startsWith('erdiagram')) return 'er';
    if (line.startsWith('pie')) return 'pie';
    if (line.startsWith('gitgraph')) return 'gitGraph';
    if (line.startsWith('gantt')) return 'gantt';
    if (line.startsWith('mindmap')) return 'mindmap';
    if (line.startsWith('timeline')) return 'timeline';
    if (line.startsWith('journey')) return 'journey';
    return 'generic';
  }

  /**
   * Flowchart and Graph parser
   */
  static parseFlowchart(lines) {
    const headerMatch = lines[0].match(/^(?:flowchart|graph)\s+([A-Za-z]+)?/i);
    const direction = headerMatch && headerMatch[1] ? headerMatch[1].toUpperCase() : 'TD';

    const nodesMap = new Map();
    const edges = [];
    const subgraphs = [];
    const classes = [];
    const styles = [];

    let currentSubgraph = null;
    let subgraphStack = [];

    // Helper to get or create node
    const ensureNode = (id, label = null, shape = 'rectangle') => {
      const cleanId = id.trim();
      if (!nodesMap.has(cleanId)) {
        nodesMap.set(cleanId, {
          id: cleanId,
          label: label !== null ? label.trim() : cleanId,
          shape: shape,
          subgraph: currentSubgraph ? currentSubgraph.id : null,
          classes: []
        });
      } else {
        const existing = nodesMap.get(cleanId);
        if (label !== null && existing.label === existing.id) {
          existing.label = label.trim();
          existing.shape = shape;
        }
        if (currentSubgraph && !existing.subgraph) {
          existing.subgraph = currentSubgraph.id;
        }
      }
      return nodesMap.get(cleanId);
    };

    // Node shape regex patterns
    const shapePatterns = [
      { type: 'subroutine', regex: /^([a-zA-Z0-9_.-]+)\[\[(.*?)\]\]/ },
      { type: 'cylinder', regex: /^([a-zA-Z0-9_.-]+)\[\((.*?)\)\]/ },
      { type: 'stadium', regex: /^([a-zA-Z0-9_.-]+)\[\((.*?)\)\]/ },
      { type: 'round', regex: /^([a-zA-Z0-9_.-]+)\((.*?)\)/ },
      { type: 'circle', regex: /^([a-zA-Z0-9_.-]+)\(\((.*?)\)\)/ },
      { type: 'double_circle', regex: /^([a-zA-Z0-9_.-]+)\(\(\((.*?)\)\)\)/ },
      { type: 'rhombus', regex: /^([a-zA-Z0-9_.-]+)\{(.*?)\}/ },
      { type: 'hexagon', regex: /^([a-zA-Z0-9_.-]+)\{\{(.*?)\}\}/ },
      { type: 'asymmetric', regex: /^([a-zA-Z0-9_.-]+)>(.*?)\]/ },
      { type: 'trapezoid', regex: /^([a-zA-Z0-9_.-]+)\[\/(.*?)\\\]/ },
      { type: 'inv_trapezoid', regex: /^([a-zA-Z0-9_.-]+)\[\\(.*?)\/\]/ },
      { type: 'rectangle', regex: /^([a-zA-Z0-9_.-]+)\[(.*?)\]/ },
      { type: 'plain', regex: /^([a-zA-Z0-9_.-]+)$/ }
    ];

    const parseNodeRef = (token) => {
      token = token.trim();
      // Handle class annotation like NodeA:::className
      let className = null;
      if (token.includes(':::')) {
        const parts = token.split(':::');
        token = parts[0];
        className = parts[1];
      }

      for (const { type, regex } of shapePatterns) {
        const m = token.match(regex);
        if (m) {
          const id = m[1];
          const label = m[2] !== undefined ? m[2] : id;
          const node = ensureNode(id, label, type);
          if (className && !node.classes.includes(className)) {
            node.classes.push(className);
          }
          return node;
        }
      }
      const plainId = token.split(/[\s\[\(\{>]/)[0];
      return ensureNode(plainId || token, null, 'rectangle');
    };

    // Regex for edge connectors: matching longest/most specific patterns first
    const linkRegex = /(?:<==>|<-->|==>\|[^|]+\||-->\|[^|]+\||---\|[^|]+\||-\.->\|[^|]+\||==\s*[^=>]+?\s*==>|--\s*[^->]+?\s*-->|-\.\s*[^.-]+?\s*\.->|==>|-->|-\.->|===|---|==|-.-)/g;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Subgraphs
      if (line.match(/^subgraph\b/i)) {
        const subMatch = line.match(/^subgraph\s+(?:([A-Za-z0-9_.-]+)\s*\[(.*?)\]|([A-Za-z0-9_.-]+)|"([^"]+)")/i);
        const subId = subMatch ? (subMatch[1] || subMatch[3] || `sub_${subgraphs.length + 1}`) : `sub_${subgraphs.length + 1}`;
        const subTitle = subMatch ? (subMatch[2] || subMatch[4] || subId) : subId;
        const newSub = {
          id: subId,
          title: subTitle.replace(/"/g, ''),
          nodes: [],
          parent: currentSubgraph ? currentSubgraph.id : null
        };
        subgraphs.push(newSub);
        if (currentSubgraph) {
          subgraphStack.push(currentSubgraph);
        }
        currentSubgraph = newSub;
        continue;
      }

      if (line.toLowerCase() === 'end') {
        currentSubgraph = subgraphStack.pop() || null;
        continue;
      }

      // Class definitions: classDef className style
      if (line.startsWith('classDef')) {
        const m = line.match(/^classDef\s+([A-Za-z0-9_.-]+)\s+(.+)$/);
        if (m) classes.push({ name: m[1], styles: m[2] });
        continue;
      }

      // Class attachments: class NodeA,NodeB className
      if (line.startsWith('class ')) {
        const m = line.match(/^class\s+([^ ]+)\s+([A-Za-z0-9_.-]+)$/);
        if (m) {
          const targetIds = m[1].split(',').map(s => s.trim());
          targetIds.forEach(id => {
            const node = ensureNode(id);
            if (!node.classes.includes(m[2])) node.classes.push(m[2]);
          });
        }
        continue;
      }

      // Style directives
      if (line.startsWith('style ')) {
        const m = line.match(/^style\s+([A-Za-z0-9_.-]+)\s+(.+)$/);
        if (m) styles.push({ target: m[1], styles: m[2] });
        continue;
      }

      // Edges parsing
      const matches = Array.from(line.matchAll(linkRegex));

      if (matches.length > 0) {
        let cursor = 0;
        let prevNode = null;

        for (let mIdx = 0; mIdx < matches.length; mIdx++) {
          const match = matches[mIdx];
          const matchIndex = match.index;
          const matchStr = match[0];

          const leftSegment = line.slice(cursor, matchIndex).trim();
          if (leftSegment) {
            prevNode = parseNodeRef(leftSegment);
          }

          // Parse label and style from connector
          let linkType = 'solid';
          let arrow = 'directed';
          let label = null;

          if (matchStr.includes('-.->') || matchStr.includes('-.-')) {
            linkType = 'dotted';
          } else if (matchStr.includes('==>') || matchStr.includes('==')) {
            linkType = 'thick';
          }

          if (matchStr.includes('---') || matchStr.includes('-.-') || matchStr.includes('===')) {
            arrow = 'open';
          } else if (matchStr.includes('<-->') || matchStr.includes('<==>')) {
            arrow = 'bidirectional';
          }

          // Check for label in |label|
          const pipeMatch = matchStr.match(/\|([^|]+)\|/);
          if (pipeMatch) {
            label = pipeMatch[1].trim();
          } else {
            // Check for -- label -->
            const midTextMatch = matchStr.match(/--\s*([^->]+?)\s*-->/) || 
                                 matchStr.match(/==\s*([^=>]+?)\s*==>/) || 
                                 matchStr.match(/-\.\s*([^.-]+?)\s*\.->/);
            if (midTextMatch) {
              label = midTextMatch[1].trim();
            }
          }

          cursor = matchIndex + matchStr.length;

          // Next target is between this connector and next connector (or end of line)
          const nextIndex = matches[mIdx + 1] ? matches[mIdx + 1].index : line.length;
          const rightSegment = line.slice(cursor, nextIndex).trim();

          if (rightSegment) {
            const nextNode = parseNodeRef(rightSegment);
            if (prevNode && nextNode) {
              edges.push({
                source: prevNode.id,
                target: nextNode.id,
                label: label,
                type: linkType,
                arrow: arrow,
                raw: `${prevNode.id} -> ${nextNode.id}`
              });
            }
            prevNode = nextNode;
          }
        }
      } else {
        // Single standalone node declaration e.g. NodeA["Custom Label"]
        if (!line.includes(';') && line.length > 0) {
          parseNodeRef(line);
        }
      }
    }

    const nodes = Array.from(nodesMap.values());

    // Map nodes into subgraphs
    subgraphs.forEach(sub => {
      sub.nodes = nodes.filter(n => n.subgraph === sub.id).map(n => n.id);
    });

    return {
      direction,
      ast: {
        type: 'flowchart',
        direction,
        nodes,
        edges,
        subgraphs,
        classes,
        styles
      },
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        subgraphCount: subgraphs.length,
        classCount: classes.length
      }
    };
  }

  /**
   * Sequence diagram parser
   */
  static parseSequence(lines) {
    const participants = new Map();
    const messages = [];
    const notes = [];
    const blocks = [];

    const ensureParticipant = (id, label = null, isActor = false) => {
      const cleanId = id.trim();
      if (!participants.has(cleanId)) {
        participants.set(cleanId, {
          id: cleanId,
          label: label ? label.trim().replace(/"/g, '') : cleanId,
          type: isActor ? 'actor' : 'participant'
        });
      }
      return participants.get(cleanId);
    };

    // Regex for sequence arrow: ->>, -->>, ->, -->, -x, --x, -), --)
    const arrowRegex = /^([a-zA-Z0-9_]+)\s*(-->>|->>|-->|->|-x|--x|-\)|--\))\s*([a-zA-Z0-9_]+)\s*:\s*(.*)$/;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Explicit participant / actor definition
      const partMatch = line.match(/^(participant|actor)\s+(?:([A-Za-z0-9_.-]+)\s+as\s+(.+)|([A-Za-z0-9_.-]+))/i);
      if (partMatch) {
        const isActor = partMatch[1].toLowerCase() === 'actor';
        if (partMatch[2]) {
          ensureParticipant(partMatch[2], partMatch[3], isActor);
        } else if (partMatch[4]) {
          ensureParticipant(partMatch[4], null, isActor);
        }
        continue;
      }

      // Note left of / right of / over
      const noteMatch = line.match(/^Note\s+(left of|right of|over)\s+([^:]+):\s*(.*)$/i);
      if (noteMatch) {
        notes.push({
          position: noteMatch[1].toLowerCase(),
          targets: noteMatch[2].split(',').map(s => s.trim()),
          text: noteMatch[3].trim()
        });
        continue;
      }

      // Blocks like loop, alt, else, opt, par, end
      const blockMatch = line.match(/^(loop|alt|else|opt|par|critical)\s*(.*)$/i);
      if (blockMatch) {
        blocks.push({
          type: blockMatch[1].toLowerCase(),
          label: blockMatch[2] ? blockMatch[2].trim() : ''
        });
        continue;
      }

      // Messages between participants
      const msgMatch = line.match(arrowRegex);
      if (msgMatch) {
        const from = msgMatch[1];
        const arrow = msgMatch[2];
        const to = msgMatch[3];
        const messageText = msgMatch[4].trim();

        ensureParticipant(from);
        ensureParticipant(to);

        const isDotted = arrow.startsWith('--');
        const isAsync = arrow.endsWith(')');
        const isCross = arrow.endsWith('x');

        messages.push({
          from,
          to,
          arrow,
          text: messageText,
          style: isDotted ? 'dotted' : 'solid',
          kind: isCross ? 'lost' : (isAsync ? 'async' : 'sync')
        });
      }
    }

    const participantList = Array.from(participants.values());

    return {
      ast: {
        type: 'sequenceDiagram',
        participants: participantList,
        messages,
        notes,
        blocks
      },
      stats: {
        nodeCount: participantList.length,
        edgeCount: messages.length,
        noteCount: notes.length,
        blockCount: blocks.length
      }
    };
  }

  /**
   * Class diagram parser
   */
  static parseClass(lines) {
    const classes = new Map();
    const relations = [];

    const ensureClass = (name) => {
      const clean = name.trim();
      if (!classes.has(clean)) {
        classes.set(clean, {
          name: clean,
          methods: [],
          attributes: [],
          annotations: []
        });
      }
      return classes.get(clean);
    };

    let activeClass = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Class block: class ClassName { ... }
      if (line.match(/^class\s+([A-Za-z0-9_.-]+)\s*\{/i)) {
        const m = line.match(/^class\s+([A-Za-z0-9_.-]+)\s*\{/i);
        activeClass = ensureClass(m[1]);
        continue;
      }

      if (line === '}' && activeClass) {
        activeClass = null;
        continue;
      }

      if (activeClass) {
        if (line.includes('(')) {
          activeClass.methods.push(line.trim());
        } else {
          activeClass.attributes.push(line.trim());
        }
        continue;
      }

      // Relationship regex: ClassA <|-- ClassB : label
      const relMatch = line.match(/^([A-Za-z0-9_.-]+)\s*([<*o]?[|.-]+[|>*o]?)\s*([A-Za-z0-9_.-]+)(?:\s*:\s*(.*))?$/);
      if (relMatch) {
        const from = relMatch[1];
        const relationType = relMatch[2];
        const to = relMatch[3];
        const label = relMatch[4] ? relMatch[4].trim() : '';

        ensureClass(from);
        ensureClass(to);

        relations.push({
          source: from,
          target: to,
          type: relationType,
          label
        });
      }
    }

    const classList = Array.from(classes.values());

    return {
      ast: {
        type: 'classDiagram',
        classes: classList,
        relationships: relations
      },
      stats: {
        nodeCount: classList.length,
        edgeCount: relations.length
      }
    };
  }

  /**
   * State diagram parser
   */
  static parseState(lines) {
    const states = new Set();
    const transitions = [];

    lines.slice(1).forEach(line => {
      const m = line.match(/^([*a-zA-Z0-9_.-]+)\s*-->\s*([*a-zA-Z0-9_.-]+)(?:\s*:\s*(.*))?$/);
      if (m) {
        const from = m[1];
        const to = m[2];
        const label = m[3] ? m[3].trim() : '';
        states.add(from);
        states.add(to);
        transitions.push({ from, to, label });
      }
    });

    const stateList = Array.from(states).map(s => ({ id: s, label: s }));

    return {
      ast: {
        type: 'stateDiagram',
        states: stateList,
        transitions
      },
      stats: {
        nodeCount: stateList.length,
        edgeCount: transitions.length
      }
    };
  }

  /**
   * Entity Relationship (ER) diagram parser
   */
  static parseER(lines) {
    const entities = new Map();
    const relationships = [];

    const ensureEntity = (name) => {
      const clean = name.trim();
      if (!entities.has(clean)) {
        entities.set(clean, { name: clean, fields: [] });
      }
      return entities.get(clean);
    };

    let activeEntity = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.match(/^([A-Za-z0-9_.-]+)\s*\{/)) {
        const m = line.match(/^([A-Za-z0-9_.-]+)\s*\{/);
        activeEntity = ensureEntity(m[1]);
        continue;
      }

      if (line === '}' && activeEntity) {
        activeEntity = null;
        continue;
      }

      if (activeEntity) {
        const parts = line.trim().split(/\s+/);
        activeEntity.fields.push({
          type: parts[0] || 'string',
          name: parts[1] || 'field',
          key: parts[2] || null
        });
        continue;
      }

      // Relationship: CUSTOMER ||--o{ ORDER : places
      const relMatch = line.match(/^([A-Za-z0-9_.-]+)\s*([|o{}]+--[|o{}]+)\s*([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
      if (relMatch) {
        const from = relMatch[1];
        const cardinal = relMatch[2];
        const to = relMatch[3];
        const label = relMatch[4] ? relMatch[4].trim().replace(/"/g, '') : '';
        ensureEntity(from);
        ensureEntity(to);
        relationships.push({ source: from, target: to, cardinality: cardinal, label });
      }
    }

    const entityList = Array.from(entities.values());

    return {
      ast: {
        type: 'erDiagram',
        entities: entityList,
        relationships
      },
      stats: {
        nodeCount: entityList.length,
        edgeCount: relationships.length
      }
    };
  }

  /**
   * Pie chart parser
   */
  static parsePie(lines) {
    let title = 'Pie Chart';
    const slices = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^pie(?:\s+title\s+(.*))?/i)) {
        const m = line.match(/^pie(?:\s+title\s+(.*))?/i);
        if (m && m[1]) title = m[1].replace(/"/g, '').trim();
        continue;
      }

      const sliceMatch = line.match(/^"([^"]+)"\s*:\s*([0-9.]+)/);
      if (sliceMatch) {
        slices.push({
          label: sliceMatch[1],
          value: parseFloat(sliceMatch[2])
        });
      }
    }

    const total = slices.reduce((acc, s) => acc + s.value, 0);
    const slicesWithPercent = slices.map(s => ({
      ...s,
      percentage: total > 0 ? ((s.value / total) * 100).toFixed(1) + '%' : '0%'
    }));

    return {
      ast: {
        type: 'pie',
        title,
        total,
        slices: slicesWithPercent
      },
      stats: {
        nodeCount: slices.length,
        edgeCount: 0
      }
    };
  }

  /**
   * GitGraph parser
   */
  static parseGitGraph(lines) {
    const commits = [];
    const branches = ['main'];
    let currentBranch = 'main';

    lines.slice(1).forEach((line, idx) => {
      if (line.startsWith('branch ')) {
        const b = line.replace('branch ', '').trim();
        branches.push(b);
        currentBranch = b;
      } else if (line.startsWith('checkout ')) {
        currentBranch = line.replace('checkout ', '').trim();
      } else if (line.startsWith('commit')) {
        const idMatch = line.match(/id:\s*"([^"]+)"/);
        commits.push({
          id: idMatch ? idMatch[1] : `c${idx}`,
          branch: currentBranch,
          raw: line
        });
      } else if (line.startsWith('merge ')) {
        const target = line.replace('merge ', '').trim();
        commits.push({
          id: `merge_${currentBranch}_${target}`,
          branch: currentBranch,
          mergedWith: target,
          type: 'merge'
        });
      }
    });

    return {
      ast: {
        type: 'gitGraph',
        branches,
        commits
      },
      stats: {
        nodeCount: commits.length,
        edgeCount: branches.length
      }
    };
  }

  /**
   * Generic fallback parser
   */
  static parseGeneric(lines, type) {
    return {
      ast: {
        type,
        lines: lines
      },
      stats: {
        nodeCount: lines.length,
        edgeCount: 0
      }
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MermaidParser;
}
if (typeof window !== 'undefined') {
  window.MermaidParser = MermaidParser;
}
