// npm run autopilot: what the scheduled job runs. Build tonight's post, then publish it when due.
import { spawnSync } from 'node:child_process';

const run = (script: string) => spawnSync('npm', ['run', script], { stdio: 'inherit', shell: true }).status === 0;
const generated = run('generate');
const published = generated && run('publish');
// Statistics for the growth report: never fails the run.
run('insights');
if (!generated || !published) process.exitCode = 1;
