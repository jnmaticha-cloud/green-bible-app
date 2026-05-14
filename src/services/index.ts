// Service exports and factory functions
import { ContentManagerService } from './content/ContentManager';
import { SearchEngineService } from './search/SearchEngine';
import { StudyToolsService } from './study/StudyTools';
import { UserExperienceService } from './user/UserExperience';
import { OfflineStorageService } from './offline/OfflineStorage';

export { ContentManagerService } from './content/ContentManager';
export { BibleVersionLoader } from './content/BibleVersionLoader';
export { SearchEngineService } from './search/SearchEngine';
export { StudyToolsService } from './study/StudyTools';
export { UserExperienceService } from './user/UserExperience';
export { OfflineStorageService } from './offline/OfflineStorage';
export { indexedDBManager } from './offline/IndexedDBManager';
export { CompressionUtils } from './offline/CompressionUtils';
export { progressiveLoader } from './content/ProgressiveLoader';

export * from './interfaces';

// Service factory for dependency injection
export class ServiceFactory {
  private static contentManager: ContentManagerService;
  private static searchEngine: SearchEngineService;
  private static studyTools: StudyToolsService;
  private static userExperience: UserExperienceService;
  private static offlineStorage: OfflineStorageService;

  static getContentManager(): ContentManagerService {
    if (!this.contentManager) {
      this.contentManager = new ContentManagerService();
    }
    return this.contentManager;
  }

  static getSearchEngine(): SearchEngineService {
    if (!this.searchEngine) {
      this.searchEngine = new SearchEngineService();
    }
    return this.searchEngine;
  }

  static getStudyTools(): StudyToolsService {
    if (!this.studyTools) {
      this.studyTools = new StudyToolsService();
    }
    return this.studyTools;
  }

  static getUserExperience(): UserExperienceService {
    if (!this.userExperience) {
      this.userExperience = new UserExperienceService();
    }
    return this.userExperience;
  }

  static getOfflineStorage(): OfflineStorageService {
    if (!this.offlineStorage) {
      this.offlineStorage = new OfflineStorageService();
    }
    return this.offlineStorage;
  }

  static reset(): void {
    this.contentManager = undefined as any;
    this.searchEngine = undefined as any;
    this.studyTools = undefined as any;
    this.userExperience = undefined as any;
    this.offlineStorage = undefined as any;
  }
}