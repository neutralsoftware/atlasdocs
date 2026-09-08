import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { defineConfig } from "fumadocs-mdx/config";

import {
    createFileSystemGeneratorCache,
    createGenerator,
    remarkAutoTypeTable,
} from "fumadocs-typescript";

const generator = createGenerator({
    cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
});

export default defineConfig({
    mdxOptions: {
        remarkPlugins: [remarkMdxMermaid, [remarkAutoTypeTable, { generator }]],
    },
});
