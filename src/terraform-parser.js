/**
 * Terraform (HCL) to Mermaid Architecture Diagram Parser
 * Pure JavaScript, deterministic (No AI, zero latency, no dependencies).
 * Works in both Node.js and Browser environments.
 */

class TerraformParser {
  /**
   * Parse HCL / Terraform source code into a structured resource model
   * @param {string} hclCode - Raw Terraform / HCL code
   * @returns {Object} Parsed resources, modules, relationships and stats
   */
  static parseHCL(hclCode) {
    if (!hclCode || typeof hclCode !== 'string') {
      return { resources: [], modules: [], relationships: [] };
    }

    const cleanCode = hclCode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/#.*$/gm, '').replace(/\/\/.*$/gm, '');
    const resources = [];
    const modules = [];

    // Robust block scanner that supports nested blocks (ingress, tags, lifecycle, etc.)
    const blockHeaderRegex = /\b(resource|module|data)\s+(?:"([^"]+)"\s+)?"([^"]+)"\s*\{/g;
    let match;

    while ((match = blockHeaderRegex.exec(cleanCode)) !== null) {
      const blockKind = match[1];
      const type = match[2] ? match[2].trim() : (blockKind === 'module' ? 'module' : 'data');
      const name = match[3].trim();

      const startIndex = match.index + match[0].length;
      let depth = 1;
      let currentIndex = startIndex;

      while (depth > 0 && currentIndex < cleanCode.length) {
        const char = cleanCode[currentIndex];
        if (char === '{') depth++;
        else if (char === '}') depth--;
        currentIndex++;
      }

      const body = cleanCode.slice(startIndex, currentIndex - 1);
      blockHeaderRegex.lastIndex = currentIndex;

      const attributes = this.parseAttributes(body);
      const references = this.extractReferences(body, type, name);

      if (blockKind === 'resource') {
        resources.push({
          id: `${type}.${name}`,
          type,
          name,
          provider: this.detectProvider(type),
          category: this.categorizeResource(type),
          attributes,
          references,
          rawBody: body.trim()
        });
      } else if (blockKind === 'module') {
        modules.push({
          id: `module.${name}`,
          type: 'module',
          name,
          attributes,
          references,
          rawBody: body.trim()
        });
      }
    }

    return {
      resources,
      modules,
      stats: {
        resourceCount: resources.length,
        moduleCount: modules.length
      }
    };
  }

  /**
   * Parse key-value attributes inside a block
   */
  static parseAttributes(body) {
    const attrs = {};
    const lines = body.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      const m = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
      if (m) {
        const key = m[1].trim();
        let val = m[2].trim().replace(/,$/, '');
        // Clean quotes
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        attrs[key] = val;
      }
    }
    return attrs;
  }

  /**
   * Extract references to other resources (e.g. aws_vpc.main.id)
   */
  static extractReferences(body, selfType, selfName) {
    const refs = [];
    // Matches resource references like aws_vpc.main.id (must start with letter, not numbers like 10.0.0.1)
    const refRegex = /\b([a-zA-Z][a-zA-Z0-9_]*)\.([a-zA-Z][a-zA-Z0-9_]*)(?:\.([a-zA-Z0-9_]+))?\b/g;
    let m;

    while ((m = refRegex.exec(body)) !== null) {
      const targetType = m[1];
      const targetName = m[2];
      const targetAttr = m[3] || 'id';

      // Avoid matching self or builtin keywords like var.*, local.*, count.*, each.*
      if (['var', 'local', 'count', 'each', 'path', 'data', 'module'].includes(targetType)) {
        continue;
      }
      if (targetType === selfType && targetName === selfName) {
        continue;
      }

      refs.push({
        targetId: `${targetType}.${targetName}`,
        targetType,
        targetName,
        attribute: targetAttr
      });
    }

    // Detect explicit depends_on
    const dependsOnMatch = body.match(/depends_on\s*=\s*\[(.*?)\]/s);
    if (dependsOnMatch) {
      const listStr = dependsOnMatch[1];
      const items = listStr.split(',').map(s => s.trim().replace(/"/g, ''));
      items.forEach(item => {
        if (item && !refs.some(r => r.targetId === item)) {
          refs.push({ targetId: item, attribute: 'depends_on' });
        }
      });
    }

    return refs;
  }

  /**
   * Detect cloud provider from resource type prefix
   */
  static detectProvider(type) {
    if (type.startsWith('aws_')) return 'aws';
    if (type.startsWith('azurerm_') || type.startsWith('azure_')) return 'azure';
    if (type.startsWith('google_')) return 'gcp';
    if (type.startsWith('kubernetes_') || type.startsWith('helm_')) return 'k8s';
    return 'generic';
  }

  /**
   * Categorize resource into architectural role
   */
  static categorizeResource(type) {
    const t = type.toLowerCase();
    if (t.includes('vpc') || t.includes('virtual_network') || t.includes('_network')) return 'network_vpc';
    if (t.includes('subnet')) return 'network_subnet';
    if (t.includes('security_group') || t.includes('firewall') || t.includes('nsg')) return 'security';
    if (t.includes('gateway') || t.includes('route_table') || t.includes('router')) return 'gateway';
    if (t.includes('db_') || t.includes('database') || t.includes('rds') || t.includes('dynamodb') || t.includes('sql')) return 'database';
    if (t.includes('s3_') || t.includes('storage') || t.includes('bucket')) return 'storage';
    if (t.includes('lb') || t.includes('load_balancer') || t.includes('target_group')) return 'load_balancer';
    if (t.includes('cluster') || t.includes('k8s') || t.includes('eks') || t.includes('gke') || t.includes('aks')) return 'cluster';
    if (t.includes('lambda') || t.includes('function') || t.includes('cloud_run')) return 'serverless';
    if (t.includes('instance') || t.includes('vm') || t.includes('compute')) return 'compute';
    if (t.includes('dns') || t.includes('route53')) return 'dns';
    return 'resource';
  }

  /**
   * Convert Terraform / HCL directly into a Mermaid Architecture flowchart
   * @param {string} hclCode - Terraform code
   * @returns {string} Mermaid diagram code
   */
  static toMermaid(hclCode) {
    const model = this.parseHCL(hclCode);
    const resources = model.resources;

    if (!resources || resources.length === 0) {
      return `flowchart TD
    Empty["No Terraform resources detected. Paste valid resource blocks."]`;
    }

    // Build hierarchy: Network VPCs and Subnets
    const vpcs = resources.filter(r => r.category === 'network_vpc');
    const subnets = resources.filter(r => r.category === 'network_subnet');
    const clusters = resources.filter(r => r.category === 'cluster');

    // Track resources that have been nested inside a subgraph
    const nestedResourceIds = new Set();
    const mermaidLines = ['flowchart TD'];

    // Map subnet -> vpc parent
    const subnetToVpcMap = new Map();
    subnets.forEach(sub => {
      const vpcRef = sub.references.find(ref => ref.targetType.includes('vpc') || ref.targetType.includes('network'));
      if (vpcRef) {
        subnetToVpcMap.set(sub.id, vpcRef.targetId);
      }
    });

    // Map resource -> subnet parent or vpc parent
    const resourceToParentMap = new Map();
    resources.forEach(r => {
      if (r.category === 'network_vpc' || r.category === 'network_subnet') return;

      const subRef = r.references.find(ref => ref.targetType.includes('subnet'));
      if (subRef) {
        resourceToParentMap.set(r.id, subRef.targetId);
        return;
      }

      const vpcRef = r.references.find(ref => ref.targetType.includes('vpc') || ref.targetType.includes('network'));
      if (vpcRef) {
        resourceToParentMap.set(r.id, vpcRef.targetId);
      }
    });

    // Helper: Generate Mermaid node declaration with shape
    const makeNode = (res, indent = '    ') => {
      const cleanId = res.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const label = this.formatResourceLabel(res);

      switch (res.category) {
        case 'database':
          return `${indent}${cleanId}[("${label}")]`;
        case 'storage':
          return `${indent}${cleanId}[("${label}")]`;
        case 'security':
          return `${indent}${cleanId}{{"${label}"}}`;
        case 'load_balancer':
          return `${indent}${cleanId}[["${label}"]]`;
        case 'serverless':
          return `${indent}${cleanId}>"${label}"]`;
        default:
          return `${indent}${cleanId}["${label}"]`;
      }
    };

    // 1. Render VPC subgraphs
    vpcs.forEach(vpc => {
      const vpcCleanId = vpc.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const vpcLabel = `VPC: ${vpc.name}${vpc.attributes.cidr_block ? ` (${vpc.attributes.cidr_block})` : ''}`;
      nestedResourceIds.add(vpc.id);

      mermaidLines.push(`    subgraph sub_${vpcCleanId} ["${vpcLabel}"]`);

      // Subnets inside this VPC
      const childSubnets = subnets.filter(s => subnetToVpcMap.get(s.id) === vpc.id);
      childSubnets.forEach(sub => {
        const subCleanId = sub.id.replace(/[^a-zA-Z0-9_]/g, '_');
        const subLabel = `Subnet: ${sub.name}${sub.attributes.cidr_block ? ` (${sub.attributes.cidr_block})` : ''}`;
        nestedResourceIds.add(sub.id);

        mermaidLines.push(`        subgraph sub_${subCleanId} ["${subLabel}"]`);

        // Resources inside this subnet
        const subResources = resources.filter(r => resourceToParentMap.get(r.id) === sub.id);
        subResources.forEach(sr => {
          nestedResourceIds.add(sr.id);
          mermaidLines.push(makeNode(sr, '            '));
        });

        mermaidLines.push('        end');
      });

      // Resources directly in VPC (not in a child subnet)
      const directVpcResources = resources.filter(r => resourceToParentMap.get(r.id) === vpc.id && !nestedResourceIds.has(r.id));
      directVpcResources.forEach(dr => {
        nestedResourceIds.add(dr.id);
        mermaidLines.push(makeNode(dr, '        '));
      });

      mermaidLines.push('    end');
    });

    // 2. Render orphaned subnets (if VPC not explicitly declared in this file)
    subnets.forEach(sub => {
      if (nestedResourceIds.has(sub.id)) return;
      nestedResourceIds.add(sub.id);
      const subCleanId = sub.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const subLabel = `Subnet: ${sub.name}`;

      mermaidLines.push(`    subgraph sub_${subCleanId} ["${subLabel}"]`);
      const subResources = resources.filter(r => resourceToParentMap.get(r.id) === sub.id);
      subResources.forEach(sr => {
        nestedResourceIds.add(sr.id);
        mermaidLines.push(makeNode(sr, '        '));
      });
      mermaidLines.push('    end');
    });

    // 3. Render Top-level Resources (Databases, S3, Global Load Balancers, etc.)
    resources.forEach(r => {
      if (!nestedResourceIds.has(r.id)) {
        mermaidLines.push(makeNode(r, '    '));
      }
    });

    // 4. Generate Connection Edges based on references
    mermaidLines.push('');
    mermaidLines.push('    %% Infrastructure Connections');

    const edgeSet = new Set();
    resources.forEach(source => {
      const sourceClean = source.id.replace(/[^a-zA-Z0-9_]/g, '_');

      source.references.forEach(ref => {
        const targetRes = resources.find(r => r.id === ref.targetId);
        if (!targetRes) return;

        // Skip structural container references already captured by subgraphs
        if (targetRes.category === 'network_vpc' || targetRes.category === 'network_subnet') {
          return;
        }

        const targetClean = targetRes.id.replace(/[^a-zA-Z0-9_]/g, '_');
        const edgeKey = `${sourceClean}->${targetClean}`;

        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          const edgeLabel = this.formatEdgeLabel(source, targetRes, ref.attribute);
          mermaidLines.push(`    ${sourceClean} -->|${edgeLabel}| ${targetClean}`);
        }
      });
    });

    return mermaidLines.join('\n');
  }

  /**
   * Format human-readable resource labels with key attributes
   */
  static formatResourceLabel(res) {
    const typeLabel = res.type.replace(/^(aws|azurerm|google|kubernetes)_/, '');
    const cleanType = typeLabel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    let details = '';
    if (res.attributes.instance_type) details = ` (${res.attributes.instance_type})`;
    else if (res.attributes.engine) details = ` (${res.attributes.engine})`;
    else if (res.attributes.cidr_block) details = ` (${res.attributes.cidr_block})`;
    else if (res.attributes.runtime) details = ` (${res.attributes.runtime})`;

    return `${cleanType}: ${res.name}${details}`;
  }

  /**
   * Determine meaningful label for the connecting arrow
   */
  static formatEdgeLabel(source, target, attr) {
    if (target.category === 'security') return 'Secured by';
    if (target.category === 'database') return 'Queries DB';
    if (target.category === 'storage') return 'Reads/Writes';
    if (target.category === 'load_balancer') return 'Routes to';
    if (attr && attr !== 'id') return attr.replace(/_/g, ' ');
    return 'Depends on';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TerraformParser;
}
if (typeof window !== 'undefined') {
  window.TerraformParser = TerraformParser;
}
