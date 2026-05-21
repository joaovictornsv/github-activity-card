import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { GistConfig } from './config.js';

const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'github-activity-card/0.1';
const GIT_COMMIT_NAME = 'github-activity-card';
const GIT_COMMIT_EMAIL = 'github-activity-card@users.noreply.github.com';
const TOKEN_IN_REMOTE_URL = /x-access-token:[^@\s]+/g;

function runGit(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on('error', (error) => {
      reject(error);
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const safeStderr = stderr.replaceAll(TOKEN_IN_REMOTE_URL, '***');
      reject(
        new Error(
          `git ${args.join(' ')} failed (exit ${code ?? 'unknown'}): ${safeStderr.trim()}`,
        ),
      );
    });
  });
}

async function assertGitAvailable(): Promise<void> {
  try {
    await runGit(['--version'], process.cwd());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Gist update requires git on PATH (${message}). Install git to publish to a gist.`,
    );
  }
}

async function fetchGistHtmlUrl(gistId: string, token: string): Promise<string> {
  const response = await fetch(`${GITHUB_API}/gists/${encodeURIComponent(gistId)}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `GitHub Gist API error ${response.status}: ${text || response.statusText}`,
    );
  }
  const gist = (await response.json()) as { html_url?: string };
  if (!gist.html_url) {
    throw new Error(`Gist ${gistId} response missing html_url`);
  }
  return gist.html_url;
}

/**
 * Updates a gist binary file by pushing to the gist's git repository.
 * The Gist REST `files[].content` field is plain text only (base64 is stored literally).
 */
export async function updateGistActivityGif(
  filePath: string,
  config: GistConfig,
): Promise<void> {
  await assertGitAvailable();

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gist-upload-'));
  const remoteUrl = `https://x-access-token:${encodeURIComponent(config.token)}@gist.github.com/${config.gistId}.git`;

  try {
    await runGit(['clone', '--depth', '1', remoteUrl, '.'], tmpDir);

    await runGit(['config', 'user.name', GIT_COMMIT_NAME], tmpDir);
    await runGit(['config', 'user.email', GIT_COMMIT_EMAIL], tmpDir);

    const destPath = path.join(tmpDir, config.filename);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(filePath, destPath);

    await runGit(['add', '--', config.filename], tmpDir);

    const { stdout: statusOut } = await runGit(
      ['status', '--porcelain', '--', config.filename],
      tmpDir,
    );
    if (!statusOut.trim()) {
      console.log(`Gist ${config.gistId}: ${config.filename} unchanged`);
      return;
    }

    await runGit(
      ['commit', '-m', `Update ${config.filename}`],
      tmpDir,
    );
    await runGit(['push', 'origin', 'HEAD'], tmpDir);

    const htmlUrl = await fetchGistHtmlUrl(config.gistId, config.token);
    console.log(
      `Updated gist (${config.filename}): ${htmlUrl}/raw/${config.filename}`,
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
