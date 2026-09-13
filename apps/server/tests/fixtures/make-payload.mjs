import { writeFileSync } from "node:fs";

const rootPath = process.argv[2];
const outPath = process.argv[3];
writeFileSync(outPath, JSON.stringify({ rootPath }));
console.log("wrote", outPath, "for", rootPath);
