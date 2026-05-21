import fs from 'node:fs';
import path from 'node:path';

const storyPath = path.resolve('src/data/story.signal.json');
const raw = fs.readFileSync(storyPath, 'utf8');
const story = JSON.parse(raw);

const requiredOptionFields = ['label', 'description', 'next'];
const requiredSpatialFields = ['zone', 'location', 'mapPosition', 'spatialSummary'];
const nodeIds = Object.keys(story.nodes || {});
const endingIds = Object.keys(story.endings || {});
const issues = [];
const warnings = [];

function isNarrativeBlockedText(text) {
  if (typeof text !== 'string' || text.trim().length === 0) return false;
  const banned = [
    /\bno tienes\b/i,
    /\bnecesitas\b/i,
    /\bno buscaste\b/i,
    /\brequired\b/i,
    /\bflag\b/i,
    /\bmissing\b/i
  ];
  return !banned.some((pattern) => pattern.test(text));
}

if (story.id !== 'signal' && story.id !== 'chapter_1_signal') {
  issues.push(`Chapter id should be "signal" or "chapter_1_signal", got "${story.id}".`);
}

const reachableNodes = new Set();
const reachableEndings = new Set();

function walk(target) {
  if (!target) return;
  if (target === 'ending') {
    endingIds.forEach((id) => reachableEndings.add(id));
    return;
  }
  if (endingIds.includes(target)) {
    reachableEndings.add(target);
    return;
  }
  if (!story.nodes[target] || reachableNodes.has(target)) return;
  reachableNodes.add(target);
  for (const option of story.nodes[target].options || []) {
    walk(option.next);
  }
}

walk(story.startNode);

for (const [nodeId, node] of Object.entries(story.nodes || {})) {
  if (!node.title) issues.push(`Node "${nodeId}" is missing title.`);
  if (!node.text && !(node.textVariants && node.textVariants.length > 0)) {
    issues.push(`Node "${nodeId}" has no base text and no text variants.`);
  }
  if (!Array.isArray(node.options) || node.options.length === 0) {
    issues.push(`Node "${nodeId}" has no options.`);
    continue;
  }

  requiredSpatialFields.forEach((field) => {
    if (!node[field]) {
      warnings.push(`Node "${nodeId}" is missing spatial field "${field}".`);
    }
  });

  node.options.forEach((option, index) => {
    for (const field of requiredOptionFields) {
      if (option[field] === undefined || option[field] === null || option[field] === '') {
        issues.push(`Node "${nodeId}" option #${index + 1} is missing required field "${field}".`);
      }
    }

    const next = option.next;
    const validNext = next === 'ending' || nodeIds.includes(next) || endingIds.includes(next);
    if (!validNext) {
      issues.push(`Node "${nodeId}" option #${index + 1} has broken next "${next}".`);
    }

    if (option.blockedText && !isNarrativeBlockedText(option.blockedText)) {
      issues.push(`Node "${nodeId}" option #${index + 1} has non-narrative blockedText: "${option.blockedText}"`);
    }
  });

  const alwaysAvailableCount = node.options.filter((option) => (
    !option.requiredFlags &&
    !option.requiredState &&
    !option.requiredOrigin
  )).length;
  if (alwaysAvailableCount === 0) {
    issues.push(`Node "${nodeId}" can hard-lock the player because every option is conditional.`);
  }
  if (alwaysAvailableCount < 3) {
    warnings.push(`Node "${nodeId}" has only ${alwaysAvailableCount} options without requirements.`);
  }
}

const orphanNodes = nodeIds.filter((id) => !reachableNodes.has(id));
if (orphanNodes.length > 0) {
  issues.push(`Orphan nodes: ${orphanNodes.join(', ')}`);
}

if (reachableEndings.size === 0) {
  issues.push('No endings are reachable from the start node.');
}

const summary = {
  chapterId: story.id,
  nodes: nodeIds.length,
  options: nodeIds.reduce((sum, id) => sum + ((story.nodes[id].options || []).length), 0),
  endings: endingIds.length,
  reachableNodes: reachableNodes.size,
  reachableEndings: [...reachableEndings].sort(),
  orphanNodes,
  warnings: warnings.length,
  valid: issues.length === 0
};

console.log(JSON.stringify(summary, null, 2));

if (warnings.length > 0) {
  console.warn('\nValidation warnings:');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (issues.length > 0) {
  console.error('\nValidation issues:');
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}
