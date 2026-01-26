const { execSync } = require('child_process');

console.log('Running Type Check...');
try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✅ Type Check Passed');
} catch (error) {
    console.error('❌ Type Check Failed');
    process.exit(1);
}
