import type { APIRoute } from "astro";
import { getSortedPosts } from "../utils/content-utils";
import { getPostUrlBySlug } from "../utils/url-utils";

export const GET: APIRoute = async () => {
	const posts = await getSortedPosts();
	return new Response(
		JSON.stringify(
			posts
				.filter((post) => !post.data.draft)
				.map((post) => ({
					url: getPostUrlBySlug(post.slug),
					title: post.data.title,
					description: post.data.description,
					category: post.data.category || "",
					tags: post.data.tags,
				})),
		),
		{ headers: { "Content-Type": "application/json; charset=utf-8" } },
	);
};
