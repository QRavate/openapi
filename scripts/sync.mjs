// Copies the specification served by the QRavate API into openapi.json, and writes a summary
// of what changed (version, operations, schemas, webhooks) to .sync-summary.md for the pull request.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SOURCE = process.env.QRAVATE_OPENAPI_URL ?? 'https://www.qravate.com/docs/openapi.json';
const FILE = new URL('../openapi.json', import.meta.url);

const res = await fetch(SOURCE, { headers: { Accept: 'application/json', 'User-Agent': 'qravate-openapi-sync' } });
if (!res.ok) throw new Error(`${SOURCE}: HTTP ${res.status}`);
const next = await res.json();
if (!next.openapi || !next.paths) throw new Error(`${SOURCE} is not an OpenAPI document`);

const previous = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { paths: {} };
const text = `${JSON.stringify(next, null, 2)}\n`;
if (existsSync(FILE) && readFileSync(FILE, 'utf8') === text) {
	console.log('openapi.json is up to date.');
	process.exit(0);
}
writeFileSync(FILE, text);

const operations = (spec) =>
	new Set(
		Object.entries(spec.paths ?? {}).flatMap(([path, item]) =>
			Object.keys(item)
				.filter((m) => ['get', 'post', 'put', 'patch', 'delete'].includes(m))
				.map((m) => `${m.toUpperCase()} ${path}`),
		),
	);
const keys = (o) => new Set(Object.keys(o ?? {}));
const diff = (label, before, after) => {
	const added = [...after].filter((x) => !before.has(x));
	const removed = [...before].filter((x) => !after.has(x));
	return [...added.map((x) => `- ${label} added: \`${x}\``), ...removed.map((x) => `- ${label} removed: \`${x}\``)];
};

const lines = [
	...(previous.info?.version !== next.info?.version ? [`- API version: ${previous.info?.version ?? 'none'} → ${next.info?.version}`] : []),
	...diff('Operation', operations(previous), operations(next)),
	...diff('Schema', keys(previous.components?.schemas), keys(next.components?.schemas)),
	...diff('Webhook', keys(previous.webhooks), keys(next.webhooks)),
];
const summary = `Copied from ${SOURCE}.\n\n${lines.length ? lines.join('\n') : '- Descriptions, parameters or fields changed: see the diff.'}\n`;
writeFileSync(new URL('../.sync-summary.md', import.meta.url), summary);
console.log(summary);
