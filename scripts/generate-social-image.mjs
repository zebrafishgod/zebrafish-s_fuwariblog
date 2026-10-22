import sharp from "sharp";
import { fileURLToPath } from "node:url";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#173d58"/>
<g fill="none" stroke="#9ccde3" stroke-opacity=".16"><circle cx="1020" cy="315" r="370"/><circle cx="1020" cy="315" r="300"/><circle cx="1020" cy="315" r="230"/></g>
<text x="90" y="145" fill="#a3c6d9" font-family="Arial,sans-serif" font-size="18" letter-spacing="5">NOTES FROM A CURIOUS MIND</text>
<text x="84" y="315" fill="#f0f7fa" font-family="Arial,sans-serif" font-size="112" font-weight="700" letter-spacing="-4">Zebrafish</text>
<text x="90" y="395" fill="#bbd0dc" font-family="Arial,sans-serif" font-size="30">Stay curious. Keep exploring.</text>
<path d="M835 309c65-82 145-82 208 0-63 82-143 82-208 0Zm208 0 71-59v118Z" fill="#c2dce9"/>
<path d="M859 290h149m-155 24h155m-130 24h108" stroke="#37627f" stroke-width="9"/>
<circle cx="863" cy="307" r="6" fill="#173d58"/>
<path d="M90 478h1020" stroke="#9ccde3" stroke-opacity=".25"/>
<text x="90" y="537" fill="#a3c6d9" font-family="Arial,sans-serif" font-size="22">www.zebrafish.world</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL("../public/og-default.png", import.meta.url)));

