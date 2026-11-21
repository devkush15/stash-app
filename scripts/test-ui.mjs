import { mkdir, writeFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const route = resolve("src/app/dev-qa");
await mkdir(route, { recursive: true });
await writeFile(
  `${route}/page.tsx`,
  'import { notFound } from "next/navigation";\nexport default async function Page(props: {searchParams: Promise<{data?: string}>}) { if (process.env.NODE_ENV !== "development") notFound(); const {default: Preview} = await import("../../../tests/ui/preview"); return Preview(props); }\n',
);
try {
  const child = spawn(
    "npx",
    ["playwright", "test", "tests/e2e/library-layout.spec.ts"],
    { stdio: "inherit", env: { ...process.env, STASH_UI_TESTS: "1" } },
  );
  process.exitCode = await new Promise((resolveCode) =>
    child.on("exit", (code) => resolveCode(code ?? 1)),
  );
} finally {
  await rm(route, { recursive: true, force: true });
}
