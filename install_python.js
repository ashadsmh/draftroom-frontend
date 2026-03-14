import { execSync } from 'child_process';
try {
  console.log(execSync('python3 -m pip install fastapi uvicorn nba_api', { encoding: 'utf8' }));
} catch (e) {
  console.error(e.stdout);
  console.error(e.stderr);
}