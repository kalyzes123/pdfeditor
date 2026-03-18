import { createWorker } from 'tesseract.js';
import type { Worker, Word, Block } from 'tesseract.js';

let worker: Worker | null = null;
let workerLoading = false;
const workerCallbacks: Array<() => void> = [];

async function getWorker(): Promise<Worker> {
  if (worker) return worker;
  if (workerLoading) {
    await new Promise<void>((resolve) => workerCallbacks.push(resolve));
    return worker!;
  }
  workerLoading = true;
  worker = await createWorker('eng');
  workerLoading = false;
  workerCallbacks.forEach((fn) => fn());
  workerCallbacks.length = 0;
  return worker;
}

export interface OCRTextBlock {
  text: string;
  /** Pixel coordinates in the recognized image */
  x: number;
  y: number;
  width: number;
  height: number;
}

function collectWords(blocks: Block[] | null): Word[] {
  const words: Word[] = [];
  for (const block of blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        words.push(...line.words);
      }
    }
  }
  return words;
}

export async function extractTextViaOCR(dataURL: string): Promise<OCRTextBlock[]> {
  const w = await getWorker();
  const { data } = await w.recognize(dataURL);
  const words = collectWords(data.blocks);

  return words
    .filter((word) => word.text.trim().length > 0)
    .map((word) => ({
      text: word.text,
      x: word.bbox.x0,
      y: word.bbox.y0,
      width: word.bbox.x1 - word.bbox.x0,
      height: word.bbox.y1 - word.bbox.y0,
    }));
}
