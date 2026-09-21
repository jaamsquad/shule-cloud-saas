/**
 * Prepares a signature or stamp picture for printing on documents: scales it down and, unless it is already a transparent
 * PNG, turns the white paper background transparent so it sits cleanly over a signature line (a photo of a signature on
 * white paper works).
 */
export async function prepareTransparentImage(file: File, maxWidth = 560): Promise<string> {
    const url = URL.createObjectURL(file);
    try {
        const img: HTMLImageElement = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That file is not a readable image.")); i.src = url; });
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h); const px = data.data;
        let hasAlpha = false;
        for (let i = 3; i < px.length; i += 4) if (px[i] < 250) { hasAlpha = true; break; }
        if (!hasAlpha) {
            for (let i = 0; i < px.length; i += 4) {
                const white = Math.min(px[i], px[i + 1], px[i + 2]);      // how close to paper-white this pixel is
                if (white >= 236) px[i + 3] = 0;                          // paper
                else if (white >= 200) px[i + 3] = Math.round(255 * (236 - white) / 36);   // soft edge of the ink
            }
            ctx.putImageData(data, 0, 0);
        }
        return c.toDataURL("image/png");
    } finally { URL.revokeObjectURL(url); }
}
