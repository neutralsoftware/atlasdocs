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
    } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
    type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
