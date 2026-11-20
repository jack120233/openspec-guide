import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const read = name => readFile(path.join(root, name), "utf8");
let html = await read("index.html");
const css = await read("styles.css");
const image = await readFile(path.join(root, "assets/openspec-dashboard.png"));
const imageUri = `data:image/png;base64,${image.toString("base64")}`;
const favicon = await readFile(path.join(root, "assets/favicon.svg"));
const faviconUri = `data:image/svg+xml;base64,${favicon.toString("base64")}`;
html = html.replace('href="assets/favicon.svg"', `href="${faviconUri}"`);
html = html.replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`);
for (const name of ["assets/lucide.min.js", "data.js", "app.js"]) {
  let source = await read(name);
  source = source.replaceAll("assets/openspec-dashboard.png", imageUri);
  source = source.replaceAll("</script", "<\\/script");
  html = html.replace(`<script src="${name}" defer></script>`, () => `<script>\n${source}\n</script>`);
}
// Keep execution after the document exists, matching the source page's defer scripts.
const scripts = [];
html = html.replace(/<script>\n[\s\S]*?\n<\/script>/g, match => { scripts.push(match); return ""; });
html = html.replace("</body>", () => `${scripts.join("\n")}\n</body>`);
const licenses = await Promise.all(["OpenSpec-LICENSE.txt","Lucide-LICENSE.txt"].map(name => read(`assets/${name}`)));
html = html.replace("</html>", `<!-- Third-party asset notices\n${licenses.join("\n\n")}\n-->\n</html>`);
const out = path.join(root, "OpenSpec-Learning-Guide.html");
await writeFile(out, html, "utf8");
console.log(`Standalone guide: ${out}\n${Buffer.byteLength(html).toLocaleString()} bytes`);
