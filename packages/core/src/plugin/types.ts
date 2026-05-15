import type { Container } from '../container/types';
import type { IHttpAdapter } from '../http/types';
import type { LoggerSuite } from '../logger/types';

export type PluginContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly container: Container<any>;
  readonly app: IHttpAdapter;
  readonly logger: LoggerSuite;
};

export type Plugin = {
  readonly name: string;
  readonly version?: string;
  readonly dependencies?: string[];
  readonly register?: (ctx: PluginContext) => void | Promise<void>;
  readonly boot?: (ctx: PluginContext) => void | Promise<void>;
  readonly start?: (ctx: PluginContext) => void | Promise<void>;
  readonly stop?: (ctx: PluginContext) => Promise<void>;
};

export type PluginManager = {
  use(plugin: Plugin): PluginManager;
  registerAll(): void;
  bootAll(): Promise<void>;
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
};
