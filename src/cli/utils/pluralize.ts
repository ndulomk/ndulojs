const IRREGULARS: Record<string, string> = {
  people: 'person',
  men: 'man',
  women: 'woman',
  children: 'child',
  sheep: 'sheep',
  fish: 'fish',
  data: 'data',
};

export const toSingular = (word: string): string => {
  const w = word.toLowerCase();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (w in IRREGULARS) return IRREGULARS[w]!;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ves')) return w.slice(0, -3) + 'fe';
  if (/(?:s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 2) return w.slice(0, -1);
  return w;
};

export const toPascalCase = (w: string): string =>
  w
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c: string) => c.toUpperCase());

export const toCamelCase = (w: string): string => {
  const p = toPascalCase(w);
  return p.charAt(0).toLowerCase() + p.slice(1);
};

export const toKebabCase = (w: string): string =>
  w
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[-_\s]+/g, '-');

export interface ModuleNames {
  plural: string;
  singular: string;
  pascal: string;
  camel: string;
  kebab: string;
  kebabPlural: string;
}

export const deriveNames = (input: string): ModuleNames => {
  const kebabPlural = toKebabCase(input);
  const singularRaw = toSingular(kebabPlural.replace(/-/g, ''));
  const kebab = toKebabCase(singularRaw);
  return {
    plural: kebabPlural,
    singular: singularRaw,
    pascal: toPascalCase(singularRaw),
    camel: toCamelCase(singularRaw),
    kebab,
    kebabPlural,
  };
};
