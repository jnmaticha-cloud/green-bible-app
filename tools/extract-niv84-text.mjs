import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getArg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');

  const inputArg = getArg('--input');
  const outArg = getArg('--out');

  const inputPdfPath = inputArg
    ? path.resolve(projectRoot, inputArg)
    : path.join(projectRoot, 'NIV84.pdf');

  const outDir = path.join(projectRoot, 'tmp');
  const outTxtPath = outArg
    ? path.resolve(projectRoot, outArg)
    : path.join(outDir, 'niv84.txt');

  const pdfBuffer = await fs.readFile(inputPdfPath);
  const parser = new PDFParse({ data: pdfBuffer });
  const textResult = await parser.getText();
  const fullText = textResult?.text ?? '';
  await parser.destroy();

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outTxtPath, fullText, 'utf-8');

  const preview = fullText.slice(0, 2000);
  console.log(`Extracted text length: ${fullText.length}`);
  console.log(`Wrote: ${outTxtPath}`);
  console.log('--- Preview (first 2000 chars) ---');
  console.log(preview);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
