export async function extractDominantColor(image, fallbackColor = "#d1d5db") {
  if (typeof document === "undefined") {
    return fallbackColor;
  }

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return fallbackColor;
    }

    const sampleSize = 24;
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    context.drawImage(image, 0, 0, sampleSize, sampleSize);

    const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha < 64) {
        continue;
      }

      red += data[index];
      green += data[index + 1];
      blue += data[index + 2];
      count += 1;
    }

    if (count === 0) {
      return fallbackColor;
    }

    return `rgb(${Math.round(red / count)}, ${Math.round(green / count)}, ${Math.round(blue / count)})`;
  } catch {
    return fallbackColor;
  }
}
