import type { Plugin, PluginContext, PluginManager } from './types';

const sortByDependencies = (plugins: Plugin[]): Plugin[] => {
  const sorted: Plugin[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (plugin: Plugin): void => {
    if (visited.has(plugin.name)) return;
    if (visiting.has(plugin.name)) {
      throw new Error(`Circular plugin dependency detected: ${plugin.name}`);
    }

    visiting.add(plugin.name);

    for (const dep of plugin.dependencies ?? []) {
      const depPlugin = plugins.find((p) => p.name === dep);
      if (!depPlugin) {
        throw new Error(`Plugin "${plugin.name}" depends on "${dep}" but it is not registered`);
      }
      visit(depPlugin);
    }

    visiting.delete(plugin.name);
    visited.add(plugin.name);
    sorted.push(plugin);
  };

  for (const plugin of plugins) {
    if (!visited.has(plugin.name)) {
      visit(plugin);
    }
  }

  return sorted;
};

export const createPluginManager = (ctx: PluginContext): PluginManager => {
  const plugins: Plugin[] = [];

  return {
    use(plugin) {
      plugins.push(plugin);
      return this;
    },

    registerAll() {
      const sorted = sortByDependencies(plugins);
      for (const plugin of sorted) {
        const result = plugin.register?.(ctx);
        if (result instanceof Promise) {
          result.catch((e) => {
            ctx.logger.app.error({ err: String(e), plugin: plugin.name }, 'Plugin register failed');
          });
        }
      }
    },

    async bootAll() {
      const sorted = sortByDependencies(plugins);
      for (const plugin of sorted) {
        await plugin.boot?.(ctx);
      }
    },

    async startAll() {
      const sorted = sortByDependencies(plugins);
      for (const plugin of sorted) {
        await plugin.start?.(ctx);
      }
      ctx.logger.app.info('All plugins started');
    },

    async stopAll() {
      const sorted = sortByDependencies(plugins).reverse();
      for (const plugin of sorted) {
        await plugin.stop?.(ctx);
      }
      ctx.logger.app.info('All plugins stopped');
    },
  };
};
