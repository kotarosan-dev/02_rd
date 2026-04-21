import { SlyteDocClient } from "../client/slyteClient.js";

const path = process.argv[2];
if (!path) {
  console.error(
    "Usage: pnpm run probe -- <path>\n" +
      "  e.g. pnpm run probe -- /dxh-data-store/slyte-components-configuration_ecf3f4bdcb7d416bffd2da5ba03fe7b1_.json",
  );
  process.exit(1);
}

const client = new SlyteDocClient();
const isJson = path.endsWith(".json");
const res = isJson ? await client.get(path) : await client.getText(path);
console.log(`status: ${res.status}`);
if (isJson) {
  console.log(JSON.stringify((res as { data: unknown }).data, null, 2).slice(0, 4000));
} else {
  console.log((res as { text: string }).text.slice(0, 4000));
}
