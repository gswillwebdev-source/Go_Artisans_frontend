import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const workPath = 'c:/Projects/job seaking app/frontend';

const nextBuilderPath = 'C:/Users/ADMIN/AppData/Roaming/npm/node_modules/vercel/node_modules/@vercel/next/dist/index.js';
const buildUtilsPath = 'C:/Users/ADMIN/AppData/Roaming/npm/node_modules/vercel/node_modules/@vercel/build-utils/dist/index.js';

const nextBuilder = require(nextBuilderPath);
const buildUtils = require(buildUtilsPath);

async function main() {
    console.log('Globbing files...');
    const files = await buildUtils.glob('**', {
        cwd: workPath,
        ignore: ['node_modules/**', '.next/**', '.vercel/**', '.git/**']
    });
    console.log('Files found:', Object.keys(files).length);

    console.log('Running @vercel/next build (skipping npm build, using existing .next)...');
    const result = await nextBuilder.build({
        files,
        entrypoint: 'package.json',
        workPath,
        config: {
            zeroConfig: true,
            framework: 'nextjs',
            outputDirectory: '.next',
        },
        meta: { isDev: false, skipDownload: true }
    });

    console.log('Build succeeded!');
    console.log('Output keys:', Object.keys(result.output || {}).length);
    console.log('Routes:', (result.routes || []).length);
}

main().then(() => console.log('DONE')).catch(e => {
    console.error('BUILD ERROR:', e.message);
    if (e.stack) console.error(e.stack.substring(0, 1000));
    process.exit(1);
});
