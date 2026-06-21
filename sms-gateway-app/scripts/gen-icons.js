/**
 * Generates the app icon set from the SVGs in assets/.
 *   - icon.png            1024x1024  full-bleed app/store icon (cap mark on purple)
 *   - adaptive-icon.png   1024x1024  cap mark, padded & transparent (Android adaptive)
 *   - splash-icon.png     1024x?     "shule clOud" wordmark on transparent (splash)
 *
 * To use your own logo instead: drop a square PNG at assets/logo.png and this
 * script will use it for icon.png / adaptive-icon.png automatically.
 *
 * Run:  node scripts/gen-icons.js   (needs sharp: npm i -D sharp)
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const A = path.join(__dirname, "..", "assets");

(async () => {
  const iconSvg = fs.readFileSync(path.join(A, "icon.svg"));
  const wordmarkSvg = fs.readFileSync(path.join(A, "wordmark.svg"));
  const customLogo = fs.existsSync(path.join(A, "logo.png")) ? path.join(A, "logo.png") : null;

  // Main app/store icon
  if (customLogo) {
    // Place the supplied logo on the purple brand square (contain w/ padding).
    const logo = await sharp(customLogo).resize(760, 760, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0x61, g: 0x3d, b: 0xdf, alpha: 1 } } })
      .composite([{ input: logo, gravity: "center" }]).png().toFile(path.join(A, "icon.png"));
  } else {
    await sharp(iconSvg).resize(1024, 1024).png().toFile(path.join(A, "icon.png"));
  }

  // Adaptive foreground: mark centered with safe padding on transparent canvas.
  const fgSource = customLogo
    ? await sharp(customLogo).resize(620, 620, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    : await sharp(Buffer.from(iconSvg.toString().replace(/<rect[^>]*\/>/, ""))).resize(620, 620).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fgSource, gravity: "center" }]).png().toFile(path.join(A, "adaptive-icon.png"));

  // Splash: the full wordmark (white-friendly: it's on a purple splash bg, so
  // render the wordmark in white for contrast).
  const whiteWordmark = wordmarkSvg.toString().replace(/#1a1333/g, "#ffffff").replace(/#6b46f0/g, "#d7c9ff");
  await sharp(Buffer.from(whiteWordmark)).resize(820, null).png().toFile(path.join(A, "splash-icon.png"));

  console.log("Generated:", fs.readdirSync(A).filter(f => f.endsWith(".png")));
})().catch(e => { console.error(e); process.exit(1); });
