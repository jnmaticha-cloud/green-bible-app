// Debug import test
import { describe, it, expect } from 'vitest';

describe('Debug Import Test', () => {
  it('should show what is imported', async () => {
    // Try importing the new file
    const newModule = await import('../../src/services/content/BibleVersionLoader');
    console.log('New module:', newModule);
    console.log('BibleVersionLoader:', newModule.BibleVersionLoader);
    
    if (newModule.BibleVersionLoader) {
      const loader = new newModule.BibleVersionLoader();
      console.log('Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(loader)));
      
      // Try to access specific methods
      console.log('getVersion method:', typeof loader.getVersion);
      console.log('getVersionById method:', typeof loader.getVersionById);
      
      // Try calling a method
      try {
        const versions = loader.getSupportedVersions();
        console.log('Versions count:', versions.length);
        
        if (loader.getVersion) {
          const kjv = loader.getVersion('kjv');
          console.log('KJV version:', kjv);
        }
      } catch (error) {
        console.log('Error calling methods:', error);
      }
    }
    
    expect(newModule.BibleVersionLoader).toBeDefined();
  });
});