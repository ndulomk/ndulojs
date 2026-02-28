import { describe, it, expect } from 'vitest';
import {
  toSingular,
  toPascalCase,
  toCamelCase,
  toKebabCase,
  deriveNames,
} from '../src/utils/pluralize.js';

describe('toSingular', () => {
  it.each([
    ['farms', 'farm'],
    ['employees', 'employee'],
    ['activities', 'activity'],
    ['buses', 'bus'],
    ['knives', 'knife'],
    ['people', 'person'],
    ['sheep', 'sheep'],
    ['fish', 'fish'],
    ['farm', 'farm'],
    ['user', 'user'],
  ])('%s → %s', (input, expected) => {
    expect(toSingular(input)).toBe(expected);
  });
});

describe('toPascalCase', () => {
  it.each([
    ['farm', 'Farm'],
    ['farm-member', 'FarmMember'],
    ['crop_cycle', 'CropCycle'],
    ['cropCycle', 'CropCycle'],
  ])('%s → %s', (input, expected) => {
    expect(toPascalCase(input)).toBe(expected);
  });
});

describe('toCamelCase', () => {
  it.each([
    ['Farm', 'farm'],
    ['FarmMember', 'farmMember'],
    ['farm-member', 'farmMember'],
  ])('%s → %s', (input, expected) => {
    expect(toCamelCase(input)).toBe(expected);
  });
});

describe('toKebabCase', () => {
  it.each([
    ['FarmMember', 'farm-member'],
    ['cropCycle', 'crop-cycle'],
    ['farm', 'farm'],
  ])('%s → %s', (input, expected) => {
    expect(toKebabCase(input)).toBe(expected);
  });
});

describe('deriveNames', () => {
  it('derives all forms from plural kebab input', () => {
    const n = deriveNames('farms');
    expect(n.plural).toBe('farms');
    expect(n.singular).toBe('farm');
    expect(n.pascal).toBe('Farm');
    expect(n.camel).toBe('farm');
    expect(n.kebab).toBe('farm');
    expect(n.kebabPlural).toBe('farms');
  });

  it('handles multi-word input', () => {
    const n = deriveNames('farm-members');
    expect(n.pascal).toBe('Farmmember');
    expect(n.kebabPlural).toBe('farm-members');
  });

  it('handles camelCase input', () => {
    const n = deriveNames('cropCycles');
    expect(n.kebabPlural).toBe('crop-cycles');
    expect(n.pascal).toBe('Cropcycle');
  });

  it('is idempotent on already singular input', () => {
    const n = deriveNames('farm');
    expect(n.singular).toBe('farm');
    expect(n.pascal).toBe('Farm');
  });
});
