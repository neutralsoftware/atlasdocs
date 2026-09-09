import { Project, Node } from "ts-morph";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const version = process.argv[2];

if (!version) {
    console.error("Usage: bun docs:generate <version>");
    console.error("Example: bun docs:generate beta1");
    process.exit(1);
}

const INPUT = path.resolve("reference/atlas.d.ts");
const OUTPUT = path.resolve("content", version, "reference");

const project = new Project({
    skipAddingFilesFromTsConfig: true,
});

const source = project.addSourceFileAtPath(INPUT);

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function moduleName(name: string): string {
    return name.replace(/^["']|["']$/g, "");
}

function slugify(name: string): string {
    return name
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
}

function shortDescription(text: string): string {
    if (!text) return "";

    return text
        .replace(/\s+/g, " ")
        .replace(/[`*_#]/g, "")
        .trim()
        .slice(0, 220);
}

function frontmatter(title: string, description: string): string {
    return [
        "---",
        `title: ${JSON.stringify(title)}`,
        `description: ${JSON.stringify(description)}`,
        "---",
        "",
    ].join("\n");
}

function code(text: string): string {
    return `\`\`\`ts\n${text.trim()}\n\`\`\`\n`;
}

function getDocs(node: any) {
    const jsDocs = typeof node.getJsDocs === "function" ? node.getJsDocs() : [];

    const description = jsDocs
        .map((doc: any) => doc.getDescription().trim())
        .filter(Boolean)
        .join("\n\n");

    const tags = jsDocs.flatMap((doc: any) => doc.getTags());

    const examples = tags
        .filter((tag: any) => tag.getText().trim().startsWith("@example"))
        .map((tag: any) =>
            tag
                .getText()
                .replace(/^@example\s*/, "")
                .replace(/^\s*\*\s?/gm, "")
                .trim(),
        );

    return {
        description,
        examples,
    };
}

function declarationHeader(node: any): string {
    const text = node.getText();

    if (Node.isClassDeclaration(node) || Node.isInterfaceDeclaration(node)) {
        const index = text.indexOf("{");

        if (index !== -1) {
            return `${text.slice(0, index).trim()} { ... }`;
        }
    }

    return text;
}

async function writePage(
    file: string,
    title: string,
    description: string,
    content: string,
) {
    await mkdir(path.dirname(file), {
        recursive: true,
    });

    await writeFile(
        file,
        frontmatter(title, shortDescription(description)) + content,
    );
}

async function writeMeta(directory: string, title: string) {
    await mkdir(directory, {
        recursive: true,
    });

    await writeFile(
        path.join(directory, "meta.json"),
        JSON.stringify(
            {
                title,
                pages: ["index", "..."],
            },
            null,
            4,
        ) + "\n",
    );
}

/* -------------------------------------------------------------------------- */
/* Member rendering                                                           */
/* -------------------------------------------------------------------------- */

function renderProperties(properties: any[]): string {
    if (properties.length === 0) return "";

    let output = "## Properties\n\n";

    for (const property of properties) {
        const name =
            typeof property.getName === "function"
                ? property.getName()
                : "property";

        const docs = getDocs(property);

        output += `### \`${name}\`\n\n`;

        if (docs.description) {
            output += `${docs.description}\n\n`;
        }

        output += code(property.getText());
        output += "\n";
    }

    return output;
}

function renderMethods(methods: any[]): string {
    if (methods.length === 0) return "";

    const grouped = new Map<string, any[]>();

    for (const method of methods) {
        const name = method.getName();

        const list = grouped.get(name) ?? [];
        list.push(method);
        grouped.set(name, list);
    }

    let output = "## Methods\n\n";

    for (const [name, overloads] of grouped) {
        output += `### \`${name}\`\n\n`;

        const docs = overloads.map(getDocs).find((value) => value.description);

        if (docs?.description) {
            output += `${docs.description}\n\n`;
        }

        for (const overload of overloads) {
            output += code(overload.getText());
            output += "\n";
        }
    }

    return output;
}

function renderConstructors(constructors: any[]): string {
    if (constructors.length === 0) return "";

    let output = "## Constructors\n\n";

    for (const constructor of constructors) {
        const docs = getDocs(constructor);

        if (docs.description) {
            output += `${docs.description}\n\n`;
        }

        output += code(constructor.getText());
        output += "\n";
    }

    return output;
}

function renderExamples(node: any): string {
    const { examples } = getDocs(node);

    if (examples.length === 0) return "";

    let output = "## Examples\n\n";

    for (const example of examples) {
        if (example.startsWith("```")) {
            output += `${example}\n\n`;
        } else {
            output += code(example);
            output += "\n";
        }
    }

    return output;
}

/* -------------------------------------------------------------------------- */
/* Symbols                                                                    */
/* -------------------------------------------------------------------------- */

async function generateClass(node: any, directory: string, module: string) {
    const name = node.getName();

    if (!name) return;

    const docs = getDocs(node);

    let body = `**Module:** \`${module}\`\n\n`;

    if (docs.description) {
        body += `${docs.description}\n\n`;
    }

    body += "## Declaration\n\n";
    body += code(declarationHeader(node));
    body += "\n";

    const base = node.getExtends?.();

    if (base) {
        body += `**Extends:** \`${base.getText()}\`\n\n`;
    }

    const implementations = node.getImplements?.() ?? [];

    if (implementations.length > 0) {
        body += `**Implements:** ${implementations
            .map((item: any) => `\`${item.getText()}\``)
            .join(", ")}\n\n`;
    }

    body += renderConstructors(node.getConstructors?.() ?? []);

    body += renderProperties(node.getProperties?.() ?? []);

    body += renderMethods(node.getMethods?.() ?? []);

    body += renderExamples(node);

    await writePage(
        path.join(directory, `${slugify(name)}.mdx`),
        name,
        docs.description || `${name} class from ${module}.`,
        body,
    );
}

async function generateInterface(node: any, directory: string, module: string) {
    const name = node.getName();

    if (!name) return;

    const docs = getDocs(node);

    let body = `**Module:** \`${module}\`\n\n`;

    if (docs.description) {
        body += `${docs.description}\n\n`;
    }

    body += "## Declaration\n\n";
    body += code(declarationHeader(node));
    body += "\n";

    body += renderProperties(node.getProperties?.() ?? []);

    body += renderMethods(node.getMethods?.() ?? []);

    body += renderExamples(node);

    await writePage(
        path.join(directory, `${slugify(name)}.mdx`),
        name,
        docs.description || `${name} interface from ${module}.`,
        body,
    );
}

async function generateTypeAlias(node: any, directory: string, module: string) {
    const name = node.getName();
    const docs = getDocs(node);

    let body = `**Module:** \`${module}\`\n\n`;

    if (docs.description) {
        body += `${docs.description}\n\n`;
    }

    body += "## Declaration\n\n";
    body += code(node.getText());
    body += "\n";

    const typeNode = node.getTypeNode();

    if (typeNode && Node.isTypeLiteral(typeNode)) {
        body += renderProperties(typeNode.getProperties());

        body += renderMethods(typeNode.getMethods());
    }

    body += renderExamples(node);

    await writePage(
        path.join(directory, `${slugify(name)}.mdx`),
        name,
        docs.description || `${name} type from ${module}.`,
        body,
    );
}

async function generateEnum(node: any, directory: string, module: string) {
    const name = node.getName();
    const docs = getDocs(node);

    let body = `**Module:** \`${module}\`\n\n`;

    if (docs.description) {
        body += `${docs.description}\n\n`;
    }

    body += "## Declaration\n\n";
    body += code(node.getText());
    body += "\n";

    body += "## Values\n\n";

    for (const member of node.getMembers()) {
        const memberDocs = getDocs(member);

        body += `### \`${member.getName()}\`\n\n`;

        if (memberDocs.description) {
            body += `${memberDocs.description}\n\n`;
        }

        body += code(member.getText());
        body += "\n";
    }

    await writePage(
        path.join(directory, `${slugify(name)}.mdx`),
        name,
        docs.description || `${name} enum from ${module}.`,
        body,
    );
}

async function generateVariableStatement(
    statement: any,
    directory: string,
    module: string,
) {
    const declarations = statement.getDeclarations();

    for (const declaration of declarations) {
        const name = declaration.getName();

        const docs = getDocs(statement).description
            ? getDocs(statement)
            : getDocs(declaration);

        let body = `**Module:** \`${module}\`\n\n`;

        if (docs.description) {
            body += `${docs.description}\n\n`;
        }

        body += "## Declaration\n\n";

        if (declarations.length === 1) {
            body += code(statement.getText());
        } else {
            body += code(declaration.getText());
        }

        body += "\n";

        const typeNode = declaration.getTypeNode();

        if (typeNode && Node.isTypeLiteral(typeNode)) {
            body += renderProperties(typeNode.getProperties());

            body += renderMethods(typeNode.getMethods());
        }

        await writePage(
            path.join(directory, `${slugify(name)}.mdx`),
            name,
            docs.description || `${name} value from ${module}.`,
            body,
        );
    }
}

/* -------------------------------------------------------------------------- */
/* Namespaces                                                                 */
/* -------------------------------------------------------------------------- */

async function generateNamespace(
    namespace: any,
    parentDirectory: string,
    module: string,
) {
    const name = moduleName(namespace.getName());

    // Namespace suffix avoids collisions such as:
    // class TextField + namespace TextField
    const directory = path.join(parentDirectory, `${slugify(name)}-namespace`);

    await mkdir(directory, {
        recursive: true,
    });

    await writeMeta(directory, `${name} namespace`);

    const body = namespace.getBody();

    if (!body || !Node.isModuleBlock(body)) {
        return;
    }

    const docs = getDocs(namespace);

    let index = `**Namespace:** \`${module}.${name}\`\n\n`;

    if (docs.description) {
        index += `${docs.description}\n\n`;
    }

    index += renderSymbolIndex(body.getStatements(), ".");

    await writePage(
        path.join(directory, "index.mdx"),
        name,
        docs.description || `${name} namespace from ${module}.`,
        index,
    );

    await generateStatements(
        body.getStatements(),
        directory,
        `${module}.${name}`,
    );
}

/* -------------------------------------------------------------------------- */
/* Index generation                                                           */
/* -------------------------------------------------------------------------- */

type IndexEntry = {
    name: string;
    href: string;
    kind: string;
    description: string;
};

function getIndexEntries(statements: any[]): IndexEntry[] {
    const entries: IndexEntry[] = [];

    for (const statement of statements) {
        if (Node.isClassDeclaration(statement)) {
            const name = statement.getName();
            if (!name) continue;

            entries.push({
                name,
                href: slugify(name),
                kind: "Classes",
                description: getDocs(statement).description,
            });

            continue;
        }

        if (Node.isInterfaceDeclaration(statement)) {
            const name = statement.getName();
            if (!name) continue;

            entries.push({
                name,
                href: slugify(name),
                kind: "Interfaces",
                description: getDocs(statement).description,
            });

            continue;
        }

        if (Node.isTypeAliasDeclaration(statement)) {
            const name = statement.getName();

            entries.push({
                name,
                href: slugify(name),
                kind: "Types",
                description: getDocs(statement).description,
            });

            continue;
        }

        if (Node.isEnumDeclaration(statement)) {
            const name = statement.getName();

            entries.push({
                name,
                href: slugify(name),
                kind: "Enums",
                description: getDocs(statement).description,
            });

            continue;
        }

        if (Node.isVariableStatement(statement)) {
            for (const declaration of statement.getDeclarations()) {
                entries.push({
                    name: declaration.getName(),
                    href: slugify(declaration.getName()),
                    kind: "Values",
                    description: getDocs(statement).description,
                });
            }

            continue;
        }

        if (Node.isModuleDeclaration(statement)) {
            const name = moduleName(statement.getName());

            entries.push({
                name,
                href: `${slugify(name)}-namespace`,
                kind: "Namespaces",
                description: getDocs(statement).description,
            });
        }
    }

    return entries;
}

function renderSymbolIndex(statements: any[], base: string): string {
    const entries = getIndexEntries(statements);

    const groups = new Map<string, IndexEntry[]>();

    for (const entry of entries) {
        const current = groups.get(entry.kind) ?? [];
        current.push(entry);
        groups.set(entry.kind, current);
    }

    let output = "";

    for (const [kind, items] of groups) {
        output += `## ${kind}\n\n`;

        for (const item of items) {
            output += `- [\`${item.name}\`](${base}/${item.href})`;

            if (item.description) {
                output += ` — ${shortDescription(item.description)}`;
            }

            output += "\n";
        }

        output += "\n";
    }

    return output;
}

/* -------------------------------------------------------------------------- */
/* Statement walker                                                           */
/* -------------------------------------------------------------------------- */

async function generateStatements(
    statements: any[],
    directory: string,
    module: string,
) {
    for (const statement of statements) {
        if (Node.isClassDeclaration(statement)) {
            await generateClass(statement, directory, module);

            continue;
        }

        if (Node.isInterfaceDeclaration(statement)) {
            await generateInterface(statement, directory, module);

            continue;
        }

        if (Node.isTypeAliasDeclaration(statement)) {
            await generateTypeAlias(statement, directory, module);

            continue;
        }

        if (Node.isEnumDeclaration(statement)) {
            await generateEnum(statement, directory, module);

            continue;
        }

        if (Node.isVariableStatement(statement)) {
            await generateVariableStatement(statement, directory, module);

            continue;
        }

        if (Node.isModuleDeclaration(statement)) {
            await generateNamespace(statement, directory, module);
        }
    }
}

/* -------------------------------------------------------------------------- */
/* Modules                                                                    */
/* -------------------------------------------------------------------------- */

const modules = source.getModules().filter((module) => {
    const body = module.getBody();
    return body && Node.isModuleBlock(body);
});

const moduleMap = new Map(
    modules.map((module) => [moduleName(module.getName()), module]),
);

async function generateModule(module: any) {
    const name = moduleName(module.getName());

    const parts = name.split("/").map(slugify);

    const directory = path.join(OUTPUT, ...parts);

    await mkdir(directory, {
        recursive: true,
    });

    await writeMeta(directory, name);

    const body = module.getBody();

    if (!body || !Node.isModuleBlock(body)) {
        return;
    }

    const docs = getDocs(module);

    let index = `\`declare module "${name}"\`\n\n`;

    if (docs.description) {
        index += `${docs.description}\n\n`;
    }

    const directChildren = [...moduleMap.keys()]
        .filter((candidate) => {
            const parent = candidate.split("/").slice(0, -1).join("/");

            return parent === name;
        })
        .sort();

    if (directChildren.length > 0) {
        index += "## Submodules\n\n";

        for (const child of directChildren) {
            const childName = child.split("/").at(-1)!;

            index += `- [\`${child}\`](./${slugify(childName)})\n`;
        }

        index += "\n";
    }

    index += renderSymbolIndex(body.getStatements(), ".");

    await writePage(
        path.join(directory, "index.mdx"),
        name,
        docs.description || `${name} API reference.`,
        index,
    );

    await generateStatements(body.getStatements(), directory, name);
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

console.log(`Generating Atlas API reference for ${version}...`);

await rm(OUTPUT, {
    recursive: true,
    force: true,
});

await mkdir(OUTPUT, {
    recursive: true,
});

await writeMeta(OUTPUT, "API Reference");

const topLevelModules = [...moduleMap.keys()]
    .filter((name) => !name.includes("/"))
    .sort();

let rootIndex =
    "This section is generated automatically from `atlas.d.ts`.\n\n" +
    "Do not edit generated API reference pages manually.\n\n" +
    "## Modules\n\n";

for (const name of topLevelModules) {
    const module = moduleMap.get(name)!;
    const docs = getDocs(module);

    rootIndex += `- [\`${name}\`](./${slugify(name)})`;

    if (docs.description) {
        rootIndex += ` — ${shortDescription(docs.description)}`;
    }

    rootIndex += "\n";
}

await writePage(
    path.join(OUTPUT, "index.mdx"),
    "API Reference",
    "Complete Atlas scripting API reference.",
    rootIndex,
);

for (const module of modules) {
    await generateModule(module);
}

console.log(`Generated ${modules.length} modules into:`);
console.log(OUTPUT);
