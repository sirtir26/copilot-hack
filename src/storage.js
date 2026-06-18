import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const STORE_PATH = "data/store.json";

function initialState() {
  return { rooms: {} };
}

export class Storage {
  #writeQueue = Promise.resolve();

  async #load() {
    try {
      const text = await readFile(STORE_PATH, "utf8");
      const data = JSON.parse(text);
      if (!data.rooms || typeof data.rooms !== "object") {
        return initialState();
      }
      return data;
    } catch (error) {
      if (error.code === "ENOENT") {
        return initialState();
      }
      throw error;
    }
  }

  async #save(state) {
    await mkdir(dirname(STORE_PATH), { recursive: true });
    await writeFile(STORE_PATH, JSON.stringify(state, null, 2));
  }

  async #update(mutator) {
    this.#writeQueue = this.#writeQueue.then(async () => {
      const state = await this.#load();
      await mutator(state);
      await this.#save(state);
    });
    return this.#writeQueue;
  }

  async appendMessage(roomId, message) {
    await this.#update(async (state) => {
      const room = state.rooms[roomId] || { messages: [], lastPostedAt: null, jiraIssueKey: null };
      room.messages.push(message);

      const keepFrom = Date.now() - 14 * 24 * 60 * 60 * 1000;
      room.messages = room.messages.filter((msg) => Date.parse(msg.created) >= keepFrom);
      state.rooms[roomId] = room;
    });
  }

  async getRoom(roomId) {
    const state = await this.#load();
    return state.rooms[roomId] || { messages: [], lastPostedAt: null, jiraIssueKey: null };
  }

  async setRoom(roomId, updates) {
    await this.#update(async (state) => {
      const room = state.rooms[roomId] || { messages: [], lastPostedAt: null, jiraIssueKey: null };
      state.rooms[roomId] = { ...room, ...updates };
    });
  }

  async getRoomIds() {
    const state = await this.#load();
    return Object.keys(state.rooms);
  }
}
