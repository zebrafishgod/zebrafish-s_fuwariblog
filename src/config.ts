import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	MusicConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Zebrafish",
	subtitle: "A fish which is swimming in the sea of coding",
	description:
		"Zebrafish 的个人博客，记录程序开发、技术探索与生活灵感。在知识的海洋里，持续学习与分享。",
	url: "https://www.zebrafish.world/",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 250, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: "assets/images/demo-banner.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		{ src: "/favicon/zebrafish.svg" },
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		{ name: "稍后阅读", url: "/archive/?saved=true" },
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/zebrafishgod", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/zebrafish.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "Zebrafish",
	bio: "A fish which is swimming in the sea of coding.",
	links: [
		{
			name: "Steam",
			icon: "fa6-brands:steam",
			url: "https://steamcommunity.com/profiles/76561198389395383/",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/zebrafishgod",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const musicConfig: MusicConfig = {
	enable: true,
	name: "Blog BGM",
	// Drop your own files into public/music/ and list them here.
	// With `tracks` empty the player still shows in the navbar, but its panel
	// only explains how to add music — nothing is shipped, nothing plays.
	muteByDefault: true,
	tracks: [
		{
			name: "キミの記憶",
			artist: "高橋あず美",
			url: "/music/kimi-no-kioku.mp3",
		},
	],
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
