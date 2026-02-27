declare module 'markdown-it-attrs' {
  import type MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'markdown-it-lazy-headers' {
  import type MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module 'markdown-it-emoji' {
  import type MarkdownIt from 'markdown-it';
  export const full: MarkdownIt.PluginSimple;
}

declare module 'markdown-it-expand-tabs' {
  import type MarkdownIt from 'markdown-it';
  const plugin: MarkdownIt.PluginWithOptions<{ tabWidth?: number }>;
  export default plugin;
}
