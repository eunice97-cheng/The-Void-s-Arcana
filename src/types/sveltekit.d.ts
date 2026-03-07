declare module '$app/navigation' {
	/** Minimal declaration for goto used in this project */
	export function goto(href: string): Promise<void>;
}

declare module '$app/stores' {
	// fallback empty declarations to satisfy tsc if referenced elsewhere
	export const navigating: any;
}

// Allow importing SVG and other static assets as URLs in the app
declare module '*.svg' {
	const src: string;
	export default src;
}

declare module '*.png' {
	const src: string;
	export default src;
}

declare module '*.jpg' {
	const src: string;
	export default src;
}
