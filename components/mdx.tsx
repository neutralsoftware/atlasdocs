import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { Step, Steps } from "fumadocs-ui/components/steps";
import {
    Tabs,
    Tab,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "fumadocs-ui/components/tabs";
import { File, Folder, Files } from "fumadocs-ui/components/files";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Mermaid } from "./mermaid";
import { TypeTable } from "fumadocs-ui/components/type-table";

export function getMDXComponents(components?: MDXComponents) {
    return {
        ...defaultMdxComponents,
        ...components,

        Step,
        Steps,

        Tabs,
        Tab,
        TabsList,
        TabsTrigger,
        TabsContent,

        File,
        Folder,
        Files,

        Accordion,
        Accordions,

        Mermaid,
        TypeTable,
    } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
    type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
