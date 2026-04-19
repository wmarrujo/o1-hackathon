#!/usr/bin/env node
// Generates docs/data-model.md from supabase/migrations/*.sql
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'supabase/migrations');
const outputPath = join(root, 'docs/data-model.md');

const sql = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()
  .map(f => readFileSync(join(migrationsDir, f), 'utf8'))
  .join('\n');

// --- Enums ---
const enums = {};
for (const [, name, body] of sql.matchAll(/create type (\w+) as enum \(([^)]+)\)/gi)) {
  enums[name] = body.split(',').map(v => v.trim().replace(/'/g, ''));
}

// --- Table comments ---
const tableComments = {};
for (const [, table, comment] of sql.matchAll(/comment on table public\.(\w+) is '([^']+)'/gi)) {
  tableComments[table] = comment;
}

// --- Tables: paren-depth-aware extraction ---
function extractTables(sql) {
  const tables = [];
  const re = /create table public\.(\w+)\s*\(/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const name = m[1];
    let depth = 1, i = m.index + m[0].length;
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') depth--;
      i++;
    }
    tables.push({ name, body: sql.slice(m.index + m[0].length, i - 1) });
  }
  return tables;
}

const SKIP = new Set(['primary', 'foreign', 'unique', 'check', 'constraint']);

function parseColumns(body) {
  return body
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('--'))
    .flatMap(line => {
      const hit = line.match(/^(\w+)\s+([\w\[\]]+)/i);
      if (!hit) return [];
      const [, colName, rawType] = hit;
      if (SKIP.has(colName.toLowerCase())) return [];
      const type = enums[rawType] ? `enum(${enums[rawType].join(' | ')})` : rawType;
      const notNull = /not null/i.test(line);
      const isFK = /references/i.test(line);
      const comment = (line.match(/--\s*(.+)$/) || [])[1]?.trim() ?? '';
      return [{ name: colName, type, notNull, isFK, comment }];
    });
}

const tables = extractTables(sql).map(({ name, body }) => ({
  name,
  comment: tableComments[name] ?? '',
  columns: parseColumns(body),
}));

// --- Render markdown ---
const out = [
  '# Data Model',
  '',
  '> Auto-generated from `supabase/migrations/`. Run `node scripts/gen-data-model-docs.js` to update.',
  '',
  '## Enums',
  '',
  ...Object.entries(enums).map(([n, vals]) =>
    `- **${n}**: ${vals.map(v => `\`${v}\``).join(', ')}`
  ),
  '',
  '## Tables',
  '',
  ...tables.flatMap(t => [
    `### \`${t.name}\``,
    '',
    ...(t.comment ? [t.comment, ''] : []),
    '| Column | Type | Req | Notes |',
    '|--------|------|:---:|-------|',
    ...t.columns.map(c => {
      const notes = [c.isFK && 'FK', c.comment].filter(Boolean).join(' · ');
      return `| \`${c.name}\` | \`${c.type}\` | ${c.notNull ? '✓' : ''} | ${notes} |`;
    }),
    '',
  ]),
].join('\n');

writeFileSync(outputPath, out);
console.log('Wrote', outputPath);
