// filepath: src/lib/signatureBg.ts
// Қолтаңба суретінің ФОНЫН автоматты жою (браузерде, canvas арқылы).
// Идея: сия — түсті (көк/қара/күлгін), қағаз — сұр/ақ. Сондықтан пиксельдің
// «сия екендігін» ТҮС ҚАНЫҚТЫҒЫ (chroma) + қаралық арқылы бағалаймыз —
// осылай көлеңкелі қағаз да ұсталмайды. Нәтиже: тек штрихтар қалатын мөлдір
// PNG, bbox бойынша қиылған. (procurementDocs-тағы PIL алгоритмімен бірдей.)

export interface BgOptions {
  maxWidth?: number; // нәтиже ені (әдепкі 440)
}

export async function removeSignatureBackground(src: string, opts: BgOptions = {}): Promise<string> {
  const img = await loadImage(src);
  // Өңдеуге лайық өлшемге кішірейту (жылдамдық + сапа)
  const scale = Math.min(1, 1100 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const chroma = mx - mn;                       // түс қанықтығы (сия жоғары)
    const blue = Math.max(0, b - Math.max(r, g)); // көк/күлгін басымдығы
    let ink = Math.max(chroma / 55, blue / 45);
    ink = ink < 0 ? 0 : ink > 1 ? 1 : ink;
    // Smoothstep (жиектер жұмсақ)
    const lo = 0.35, hi = 0.75;
    let t = (ink - lo) / (hi - lo);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    let alpha = t * t * (3 - 2 * t) * 255;
    if (chroma > 25) alpha = Math.min(255, alpha + 40); // қою штрихтарды толықтыру
    d[i + 3] = alpha;
    if (alpha > 40) {
      const px = (i / 4) % w, py = Math.floor((i / 4) / w);
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
  }
  ctx.putImageData(im, 0, 0);

  if (maxX < 0) return src; // сия табылмады — түпнұсқаны қайтарамыз
  const pad = 14;
  const cx = Math.max(0, minX - pad), cy = Math.max(0, minY - pad);
  const cw = Math.min(w, maxX + pad) - cx, ch = Math.min(h, maxY + pad) - cy;

  // Bbox бойынша қиып, керек болса ені бойынша кішірейту
  const outW = Math.min(cw, opts.maxWidth ?? 440);
  const outH = Math.round(ch * (outW / cw));
  const out = document.createElement("canvas");
  out.width = outW; out.height = outH;
  out.getContext("2d")!.drawImage(cv, cx, cy, cw, ch, 0, 0, outW, outH);
  return out.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
