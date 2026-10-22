export interface DiscoverPost {
	slug: string;
	data: {
		title: string;
		description: string;
		published: Date | string;
		category: string | null;
		tags: string[];
	};
}

export interface PostFilters {
	query: string;
	categories: string[];
	tags: string[];
	uncategorized: boolean;
	saved: boolean;
	sort: "newest" | "oldest" | "title";
}

export function parsePostFilters(params: URLSearchParams): PostFilters {
	const sort = params.get("sort");
	return {
		query: params.get("q") || "",
		categories: params.getAll("category"),
		tags: params.getAll("tag"),
		uncategorized: params.get("uncategorized") === "true",
		saved: params.get("saved") === "true",
		sort: sort === "oldest" || sort === "title" ? sort : "newest",
	};
}

export function getCategoryTagOptions(
	posts: DiscoverPost[],
	filters: Pick<PostFilters, "categories" | "uncategorized">,
): string[] {
	const matchingPosts = posts.filter((post) => {
		const category = post.data.category?.trim() || "";
		return (
			(!filters.categories.length || filters.categories.includes(category)) &&
			(!filters.uncategorized || !category)
		);
	});
	return [...new Set(matchingPosts.flatMap((post) => post.data.tags))].sort();
}

export function retainAvailableTags(
	posts: DiscoverPost[],
	filters: PostFilters,
): PostFilters {
	const availableTags = new Set(getCategoryTagOptions(posts, filters));
	return { ...filters, tags: filters.tags.filter((tag) => availableTags.has(tag)) };
}

export function filterPosts<T extends DiscoverPost>(
	posts: T[],
	filters: PostFilters,
	bookmarks: string[] = [],
): T[] {
	const terms = filters.query
		.normalize("NFKC")
		.toLocaleLowerCase()
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	const saved = new Set(bookmarks);
	return posts
		.filter((post) => {
			const category = post.data.category?.trim() || "";
			const text = [
				post.data.title,
				post.data.description,
				category,
				...post.data.tags,
			]
				.join(" ")
				.normalize("NFKC")
				.toLocaleLowerCase();
			return (
				terms.every((term) => text.includes(term)) &&
				(!filters.categories.length || filters.categories.includes(category)) &&
				(!filters.tags.length ||
					post.data.tags.some((tag) => filters.tags.includes(tag))) &&
				(!filters.uncategorized || !category) &&
				(!filters.saved || saved.has(post.slug))
			);
		})
		.sort((a, b) => {
			if (filters.sort === "title")
				return a.data.title.localeCompare(b.data.title, "zh-Hant");
			const difference =
				new Date(b.data.published).getTime() -
				new Date(a.data.published).getTime();
			return (
				(filters.sort === "oldest" ? -difference : difference) ||
				a.slug.localeCompare(b.slug)
			);
		});
}
