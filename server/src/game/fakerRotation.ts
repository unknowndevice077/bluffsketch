import { shuffle } from '../utils/random.js';

/**
 * Deals the Faker role from a shuffled deck so everyone is Faker once
 * before anyone repeats. The same player never gets it twice in a row
 * when there is any alternative.
 */
export class FakerRotation {
  private queue: string[] = [];
  private last: string | null = null;

  next(eligible: readonly string[]): string {
    if (eligible.length === 0) throw new Error('No eligible players for the Faker role');
    this.queue = this.queue.filter((id) => eligible.includes(id));
    if (this.queue.length === 0) {
      this.queue = shuffle(eligible);
      if (this.queue.length > 1 && this.queue[0] === this.last) {
        [this.queue[0], this.queue[1]] = [this.queue[1], this.queue[0]];
      }
    }
    const picked = this.queue.shift() as string;
    this.last = picked;
    return picked;
  }

  reset(): void {
    this.queue = [];
    this.last = null;
  }
}
