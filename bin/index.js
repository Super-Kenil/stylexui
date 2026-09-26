#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { Command } from "commander"

const program = new Command()

const getRunner = () => {
  const ua = process.env.npm_config_user_agent || ""
  if (ua.startsWith("bun") || existsSync("bun.lock") || existsSync("bun.lockb")) {
    return { cmd: "bun", baseArgs: ["x", "--bun"] }
  }
  if (ua.startsWith("pnpm") || existsSync("pnpm-lock.yaml")) {
    return { cmd: "pnpm", baseArgs: ["dlx"] }
  }
  if (ua.startsWith("yarn") || existsSync("yarn.lock")) {
    return { cmd: "yarn", baseArgs: ["dlx"] }
  }
  return { cmd: "npx", baseArgs: [] }
}

const ensureTsConfigAliases = () => {
  const isSrc = existsSync("src")
  const aliasPath = isSrc ? ["./src/*"] : ["./*"]
  const configFiles = ["tsconfig.json", "tsconfig.app.json"].filter(existsSync)

  for (const file of configFiles) {
    try {
      const raw = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
      const ts = JSON.parse(raw)
      ts.compilerOptions = ts.compilerOptions || {}
      ts.compilerOptions.paths = ts.compilerOptions.paths || {}

      if (!ts.compilerOptions.paths["@/*"]) {
        ts.compilerOptions.baseUrl = "."
        ts.compilerOptions.paths["@/*"] = aliasPath
        writeFileSync(file, JSON.stringify(ts, null, 2))
      }
    } catch {}
  }
}

const getComponentsConfig = (registryUrl) => ({
  $schema: "https://ui.shadcn.com/schema.json",
  style: "default",
  rsc: false,
  tsx: true,
  tailwind: {
    config: "",
    css: existsSync("src") ? "src/styles/stylex.css" : "styles/stylex.css",
    baseColor: "neutral",
    cssVariables: true,
    prefix: "",
  },
  aliases: {
    components: "@/components",
    utils: "@/lib/utils",
    ui: "@/components/stylex-ui",
  },
  registries: {
    "@stylexui": {
      url: registryUrl || process.env.STYLEXUI_REGISTRY_URL || "https://stylexui.dev/r/{name}.json",
      headers: {
        Authorization: "Bearer ${STYLEXUI_REGISTRY_TOKEN}",
      },
    },
  },
})

program
  .name("stylexui")
  .description("CLI wrapper for StyleXUI components")
  .version("0.1.0")

program
  .command("init")
  .description("Initialize project with StyleXUI and components.json")
  .option("-y, --yes", "Skip prompts", false)
  .option("-u, --url <url>", "Custom registry URL")
  .action((opts) => {
    ensureTsConfigAliases()

    if (!existsSync("components.json")) {
      writeFileSync("components.json", JSON.stringify(getComponentsConfig(opts.url), null, 2))
    }

    const { cmd, baseArgs } = getRunner()
    const args = [...baseArgs, "shadcn@latest", "add", "@stylexui/init"]
    if (opts.yes) args.push("-y")
    spawnSync(cmd, args, { stdio: "inherit", shell: true })
  })

program
  .command("add [components...]")
  .description("Add StyleXUI components or blocks")
  .option("-y, --yes", "Skip prompts", false)
  .option("-o, --overwrite", "Overwrite existing files", false)
  .option("-a, --all", "Add all components", false)
  .action((components, opts) => {
    ensureTsConfigAliases()

    const { cmd, baseArgs } = getRunner()
    const args = [...baseArgs, "shadcn@latest", "add"]
    if (opts.yes) args.push("-y")
    if (opts.overwrite) args.push("-o")
    if (opts.all) args.push("-a")

    if (components?.length) {
      const items = components.map((c) => (c.startsWith("@") || c.startsWith("http") ? c : `@stylexui/${c}`))
      args.push(...items)
    }

    spawnSync(cmd, args, { stdio: "inherit", shell: true })
  })

program.parse()
