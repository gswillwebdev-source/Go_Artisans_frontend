const urls = ['http://localhost:3000/', 'http://localhost:3000/login', 'http://localhost:3000/browse-workers'];

async function run() {
    for (const url of urls) {
        const start = Date.now();
        try {
            const res = await fetch(url);
            const body = await res.text();
            console.log(`URL: ${url}`);
            console.log(`Status: ${res.status}`);
            console.log(`TimeMs: ${Date.now() - start}`);
            console.log(`BodyLength: ${body.length}`);
            console.log('---');
        } catch (error) {
            console.error(`ERROR ${url}:`, error.message);
        }
    }
}

run().catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
});
