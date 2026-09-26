#!/usr/bin/env node
import { writeFileSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { Command } from "commander"

const program = new Command()

const CONFIG = {
  $schema: "https://ui.shadcn.com/schema.json",
  style: "default",
  rsc: false,
  tsx: true,
  tailwind: {
    config: "",
    css: "styles/stylex.css",
    baseColor: "neutral",
    cssVariables: true,
    prefix: ""
  },
  aliases: {
    components: "@/components",
    utils: "@/lib/utils",
    ui: "@/components/ui"
  },
  registries: {
    "@stylexui": {
      url: "https://stylexui.dev/r/{name}.json",
      headers: {
        Authorization: "Bearer ${STYLEXUI_REGISTRY_TOKEN}"
      }
    }
  }
}

program
  .command("init")
  .description("Setup StyleXUI and components.json")
  .action(() => {
    if (!existsSync("components.json")) {
      writeFileSync("components.json", JSON.stringify(CONFIG, null, 2))
    }
    execSync("npx shadcn@latest add @stylexui/init", { stdio: "inherit" })
  })

program
  .command("add [components...]")
  .description("Add components via shadcn")
  .action((components) => {
    const items = components.map((c) => (c.startsWith("@") ? c : `@stylexui/${c}`)).join(" ")
    execSync(`npx shadcn@latest add ${items}`, { stdio: "inherit" })
  })

program.parse()
