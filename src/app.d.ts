// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SavesRepo } from '$lib/db/saves-repo';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			deviceId: string;
			repo: SavesRepo;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
