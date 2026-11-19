// Validates openapi.json against the OpenAPI 3.1 specification and resolves every $ref.
import { validate } from '@readme/openapi-parser';

const result = await validate(new URL('../openapi.json', import.meta.url).pathname);
if (!result.valid) {
	console.error(JSON.stringify(result.errors, null, 2));
	process.exit(1);
}
for (const warning of result.warnings ?? []) console.warn('warning:', warning.message ?? warning);
console.log('ok - openapi.json is a valid OpenAPI document');
