// src/utils/songStorage.ts
import { GeneratedMusic } from '@/types/music';

const STORAGE_KEY = 'hibeats_generated_songs';

export interface StoredSong extends GeneratedMusic {
  storedAt: string;
  sessionId: string;
}

export class SongStorage {
  static saveSong(song: GeneratedMusic, sessionId?: string): void {
    try {
      const storedSongs = this.getAllSongs();
      const storedSong: StoredSong = {
        ...song,
        storedAt: new Date().toISOString(),
        sessionId: sessionId || `session_${Date.now()}`
      };

      // Check if song already exists (by id)
      const existingIndex = storedSongs.findIndex(s => s.id === song.id);
      if (existingIndex >= 0) {
        storedSongs[existingIndex] = storedSong;
      } else {
        storedSongs.unshift(storedSong); // Add to beginning
      }

      // Keep only last 100 songs to prevent storage bloat
      const limitedSongs = storedSongs.slice(0, 100);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedSongs));
    } catch (error) {
      console.error('Failed to save song:', error);
    }
  }

  static getAllSongs(): StoredSong[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load songs:', error);
      return [];
    }
  }

  static getSongById(songId: string): StoredSong | null {
    const songs = this.getAllSongs();
    return songs.find(song => song.id === songId) || null;
  }

  static updateSong(songId: string, updates: Partial<StoredSong>): boolean {
    try {
      const songs = this.getAllSongs();
      const index = songs.findIndex(song => song.id === songId);

      if (index >= 0) {
        songs[index] = { ...songs[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update song:', error);
      return false;
    }
  }

  static deleteSong(songId: string): boolean {
    try {
      const songs = this.getAllSongs();
      const filteredSongs = songs.filter(song => song.id !== songId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSongs));
      return true;
    } catch (error) {
      console.error('Failed to delete song:', error);
      return false;
    }
  }

  static getUnmintedSongs(): StoredSong[] {
    return this.getAllSongs().filter(song => !song.isMinted);
  }

  static getMintedSongs(): StoredSong[] {
    return this.getAllSongs().filter(song => song.isMinted);
  }

  static clearAllSongs(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear songs:', error);
    }
  }

  static getSongsBySession(sessionId: string): StoredSong[] {
    return this.getAllSongs().filter(song => song.sessionId === sessionId);
  }

  static getStorageStats(): { total: number; minted: number; unminted: number } {
    const all = this.getAllSongs();
    const minted = all.filter(song => song.isMinted).length;
    const unminted = all.filter(song => !song.isMinted).length;

    return {
      total: all.length,
      minted,
      unminted
    };
  }
}