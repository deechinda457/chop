const fs = require('fs');
const path = require('path');

// Deliberately not "progress.json" — that filename is the day-by-day BUILD_PLAN
// milestone log (see CLAUDE.md). This tracker's shape (an array of lowercased
// recipe titles) is incompatible with that log's shape, and markCompleted's
// saveProgress() overwrites the whole file, so sharing a filename would silently
// destroy the milestone log the first time a seed run completes one recipe.
const progressPath = path.join(__dirname, 'seedProgress.json');

function normalizeTitle(title) {
  return String(title || '').trim().toLowerCase();
}

function ensureProgressShape(value) {
  if (!value || typeof value !== 'object') {
    return { completed: [] };
  }

  if (!Array.isArray(value.completed)) {
    return { completed: [] };
  }

  return {
    completed: value.completed.map(normalizeTitle).filter(Boolean),
  };
}

function loadProgress() {
  if (!fs.existsSync(progressPath)) {
    return { completed: [] };
  }

  try {
    const raw = fs.readFileSync(progressPath, 'utf8');
    if (!raw.trim()) return { completed: [] };
    return ensureProgressShape(JSON.parse(raw));
  } catch (error) {
    console.warn('[progress] Failed to read progress file, starting fresh:', error.message);
    return { completed: [] };
  }
}

function saveProgress(progress) {
  const next = ensureProgressShape(progress);
  const tempPath = `${progressPath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, progressPath);
}

function isCompleted(progress, title) {
  return ensureProgressShape(progress).completed.includes(normalizeTitle(title));
}

function markCompleted(progress, title) {
  const next = ensureProgressShape(progress);
  const normalized = normalizeTitle(title);
  if (!normalized || next.completed.includes(normalized)) {
    return next;
  }

  next.completed.push(normalized);
  saveProgress(next);
  return next;
}

function clearProgress() {
  saveProgress({ completed: [] });
}

module.exports = {
  progressPath,
  loadProgress,
  saveProgress,
  isCompleted,
  markCompleted,
  clearProgress,
};
