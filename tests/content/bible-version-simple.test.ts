// Simple test for Bible Version Integration
import { describe, it, expect } from 'vitest';
import { BibleVersionLoader } from '../../src/services/content/BibleVersionLoader';

describe('Bible Version Simple Test', () => {
  it('should create BibleVersionLoader instance', () => {
    const loader = new BibleVersionLoader();
    expect(loader).toBeDefined();
  });

  it('should return supported versions', () => {
    const loader = new BibleVersionLoader();
    const versions = loader.getSupportedVersions();
    expect(versions).toBeDefined();
    expect(versions.length).toBeGreaterThan(0);
  });
});