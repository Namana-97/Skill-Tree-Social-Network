
import { storage } from "../storage";
import lunr from "lunr";

class RagService {
  private index: lunr.Index | null = null;
  private docs: any[] = [];

  async initialize() {
    const articles = await storage.getArticles();
    this.docs = articles;

    this.index = lunr(function () {
      this.ref("id");
      this.field("title");
      this.field("content");
      this.field("tags");

      articles.forEach((doc) => {
        this.add({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            tags: doc.tags?.join(" ")
        });
      });
    });
  }

  async query(text: string): Promise<{ title: string, snippet: string, score: number }[]> {
    if (!this.index) {
        await this.initialize();
    }

    if (!this.index) return [];

    const results = this.index.search(text);
    return results.slice(0, 3).map(r => {
        const doc = this.docs.find(d => d.id == r.ref);
        return {
            title: doc?.title || "Unknown",
            snippet: doc?.content.substring(0, 100) + "..." || "",
            score: r.score
        };
    });
  }
}

export const ragService = new RagService();
