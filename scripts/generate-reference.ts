import { Project, SyntaxKind } from "ts-morph";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const version = process.argv[2];

if (!version) {
    console.error("Usage: bun docs:generate <version>");
    process.exit(1);
}

const INPUT = "reference/atlas.d.ts";
const OUTPUT = `content/${version}/docs`;
const BRIDGES = "reference/generated";

const project = new Project({
    skipAddingFilesFromTsConfig: true,
});

const source = project.addSourceFileAtPath(INPUT);

function slug(name: string) {
    return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const nodes = [
    ...source.getDescendantsOfKind(SyntaxKind.ClassDeclaration),
    ...source.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration),
    ...source.getDescendantsOfKind(SyntaxKind.EnumDeclaration),
    ...source.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration),
];

const declarations = nodes
    .map((declaration) => {
        const name = declaration.getName();

        const moduleDeclaration = declaration.getFirstAncestorByKind(
            SyntaxKind.ModuleDeclaration,
        );

        if (!name || !moduleDeclaration) {
            return undefined;
        }

        const module = moduleDeclaration.getName().replace(/^["']|["']$/g, "");

        return {
            name,
            module,
        };
    })
    .filter(
        (
            item,
        ): item is {
            name: string;
            module: string;
        } => item !== undefined,
    )
    .sort((a, b) => a.name.localeCompare(b.name));

await rm(OUTPUT, {
    recursive: true,
    force: true,
});

await rm(BRIDGES, {
    recursive: true,
    force: true,
});

await mkdir(OUTPUT, {
    recursive: true,
});

await mkdir(BRIDGES, {
    recursive: true,
});

for (const declaration of declarations) {
    const filename = slug(declaration.name);

    const bridge = `
/// <reference path="../atlas.d.ts" />

export { ${declaration.name} } from "${declaration.module}";
`.trimStart();

    await writeFile(path.join(BRIDGES, `${filename}.ts`), bridge);

    const mdx = `---
title: ${declaration.name}
description: API reference for ${declaration.name}.
---

# ${declaration.name}

<auto-type-table
    path="../../../reference/generated/${filename}.ts"
    name="${declaration.name}"
/>
`;

    await writeFile(path.join(OUTPUT, `${filename}.mdx`), mdx);
}

await writeFile(
    path.join(OUTPUT, "meta.json"),
    JSON.stringify(
        {
            title: "API Reference",
            pages: declarations.map(({ name }) => slug(name)),
        },
        null,
        4,
    ) + "\n",
);

console.log(
    `Generated ${declarations.length} API reference pages for ${version}.`,
);
