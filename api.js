// Green Bible App - API Module
// Handles all API interactions for the application

const API_BASE_URL = window.location.origin;

class BibleAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async fetchBibleVersions() {
        try {
            const response = await fetch(`${this.baseURL}/api/bibles/versions`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching bible versions:', error);
            throw error;
        }
    }

    async fetchPassage(version, book, chapter, verses) {
        try {
            const url = new URL(`${this.baseURL}/api/bibles/passage`);
            url.searchParams.append('version', version);
            url.searchParams.append('book', book);
            url.searchParams.append('chapter', chapter);
            if (verses) {
                url.searchParams.append('verses', verses);
            }
            
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching passage:', error);
            throw error;
        }
    }

    async searchBibles(query, version, options = {}) {
        try {
            const url = new URL(`${this.baseURL}/api/bibles/search`);
            url.searchParams.append('q', query);
            if (version) {
                url.searchParams.append('version', version);
            }
            
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error searching bibles:', error);
            throw error;
        }
    }

    async comparePassages(version1, version2, book, chapter) {
        try {
            const url = new URL(`${this.baseURL}/api/bibles/compare`);
            url.searchParams.append('v1', version1);
            url.searchParams.append('v2', version2);
            url.searchParams.append('book', book);
            url.searchParams.append('chapter', chapter);
            
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error comparing passages:', error);
            throw error;
        }
    }

    async getBookmarks(userId) {
        try {
            const response = await fetch(`${this.baseURL}/api/bookmarks/${userId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching bookmarks:', error);
            throw error;
        }
    }

    async addBookmark(bookmark) {
        try {
            const response = await fetch(`${this.baseURL}/api/bookmarks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookmark)
            });
            return await response.json();
        } catch (error) {
            console.error('Error adding bookmark:', error);
            throw error;
        }
    }

    async deleteBookmark(id) {
        try {
            const response = await fetch(`${this.baseURL}/api/bookmarks/${id}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting bookmark:', error);
            throw error;
        }
    }
}

// Create global API instance
const bibleAPI = new BibleAPI();
window.bibleAPI = bibleAPI;

export default BibleAPI;
