import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

function runCommand(
  command: string,
  args: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`,
          ),
        );
      }
    });
  });
}

async function writeConcatList(
  pngPaths: string[],
  listPath: string,
  slideDurationSec: number,
): Promise<void> {
  const lines = pngPaths.flatMap((pngPath) => [
    `file '${pngPath.replace(/'/g, "'\\''")}'`,
    `duration ${slideDurationSec}`,
  ]);
  lines.push(`file '${pngPaths[pngPaths.length - 1].replace(/'/g, "'\\''")}'`);
  await fs.writeFile(listPath, `${lines.join('\n')}\n`, 'utf8');
}

export interface GifEncodeOptions {
  gifWidth: number;
  maxColors: number;
  bayerScale: number;
}

export async function encodeGif(
  pngPaths: string[],
  outputPath: string,
  slideDurationSec: number,
  options: GifEncodeOptions,
): Promise<void> {
  const { gifWidth, maxColors, bayerScale } = options;
  if (pngPaths.length === 0) {
    throw new Error('encodeGif: no PNG frames provided');
  }

  const tempDir = path.dirname(pngPaths[0]);
  const concatListPath = path.join(tempDir, 'concat.txt');
  const palettePath = path.join(tempDir, 'palette.png');
  const quantizedPath = path.join(tempDir, 'quantized.gif');

  await writeConcatList(pngPaths, concatListPath, slideDurationSec);

  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatListPath,
    '-vf',
    `fps=10,scale=${gifWidth}:-1:flags=lanczos,palettegen=max_colors=${maxColors}:reserve_transparent=1:stats_mode=full`,
    '-frames:v',
    '1',
    palettePath,
  ]);

  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatListPath,
    '-i',
    palettePath,
    '-lavfi',
    `fps=10,scale=${gifWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=${bayerScale}:diff_mode=rectangle`,
    '-loop',
    '0',
    quantizedPath,
  ]);

  await fs.copyFile(quantizedPath, outputPath);
}
