const path = require('path');
const Jimp = require('jimp-compact');

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(projectRoot, 'assets', 'daybook-icon.png');
const outputPath = path.join(projectRoot, 'assets', 'daybook-adaptive-icon.png');

const CANVAS_SIZE = 1024;
// Half the canvas keeps the full diagonal feather inside Android's central
// safe circle while still filling roughly three quarters of a round icon.
const MARK_HEIGHT = 512;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

async function generateAdaptiveIcon() {
  const source = await Jimp.read(sourcePath);
  const mask = new Jimp(source.bitmap.width, source.bitmap.height, 0x00000000);

  let minX = source.bitmap.width;
  let minY = source.bitmap.height;
  let maxX = -1;
  let maxY = -1;

  source.scan(0, 0, source.bitmap.width, source.bitmap.height, (x, y, index) => {
    const red = source.bitmap.data[index];
    const green = source.bitmap.data[index + 1];
    const blue = source.bitmap.data[index + 2];

    // The source mark is white over a green gradient. Turning only the
    // near-neutral highlights into alpha preserves its original silhouette
    // and removes the background without redrawing the logo.
    const minimumChannel = Math.min(red, green, blue);
    const maximumChannel = Math.max(red, green, blue);
    const neutrality = 255 - (maximumChannel - minimumChannel);
    const alpha = clamp(
      Math.round(((minimumChannel - 145) / 95) * 255 * (neutrality / 255)),
      0,
      255
    );

    if (alpha > 3) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    mask.bitmap.data[index] = 255;
    mask.bitmap.data[index + 1] = 255;
    mask.bitmap.data[index + 2] = 255;
    mask.bitmap.data[index + 3] = alpha;
  });

  if (maxX < minX || maxY < minY) {
    throw new Error('Could not isolate the white Daybook mark.');
  }

  const mark = mask
    .crop(minX, minY, maxX - minX + 1, maxY - minY + 1)
    .resize(Jimp.AUTO, MARK_HEIGHT, Jimp.RESIZE_BICUBIC);

  let alphaWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  mark.scan(0, 0, mark.bitmap.width, mark.bitmap.height, (x, y, index) => {
    const alpha = mark.bitmap.data[index + 3];
    alphaWeight += alpha;
    weightedX += x * alpha;
    weightedY += y * alpha;
  });

  const centroidX = weightedX / alphaWeight;
  const centroidY = weightedY / alphaWeight;
  const offsetX = Math.round(CANVAS_SIZE / 2 - centroidX);
  const offsetY = Math.round(CANVAS_SIZE / 2 - centroidY);

  const canvas = new Jimp(CANVAS_SIZE, CANVAS_SIZE, 0x00000000);
  canvas.composite(mark, offsetX, offsetY);
  await canvas.writeAsync(outputPath);

  console.log(`Generated ${path.relative(projectRoot, outputPath)}`);
}

generateAdaptiveIcon().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
