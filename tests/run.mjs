// Node runner: `node tests/run.mjs` (any Node ≥ 18, no dependencies).
import {readFileSync} from "node:fs";
import {buildApi, runTests} from "./scoring.tests.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const {passed, failed, failures} = runTests(buildApi(html));

for(const f of failures) console.error("FAIL " + f);
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
