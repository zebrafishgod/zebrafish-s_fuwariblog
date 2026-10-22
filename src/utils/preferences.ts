// Browsers can disable storage. Reading the blog must still work in that case.
export const BOOKMARK_KEY = "zebrafish:bookmarks:v1";
export const BOOKMARK_EVENT = "zebrafish:bookmarks-changed";

export function readPreference(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function writePreference(key: string, value: string): boolean {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

export function readBookmarks(): string[] {
	try {
		const value: unknown = JSON.parse(readPreference(BOOKMARK_KEY) || "[]");
		return Array.isArray(value)
			? [
					...new Set(
						value.filter((item): item is string => typeof item === "string"),
					),
				]
			: [];
	} catch {
		return [];
	}
}

export function toggleBookmark(slug: string): boolean {
	const saved = new Set(readBookmarks());
	if (saved.has(slug)) saved.delete(slug);
	else saved.add(slug);
	const success = writePreference(BOOKMARK_KEY, JSON.stringify([...saved]));
	if (success) window.dispatchEvent(new Event(BOOKMARK_EVENT));
	return success;
}
