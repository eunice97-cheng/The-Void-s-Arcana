// Game asset preloading service
// @ts-nocheck
class AssetLoader {
	constructor() {
		this.loadedAssets = new Map();
		this.loading = new Map();
	}

	async preloadImage(url) {
		if (this.loadedAssets.has(url)) {
			return this.loadedAssets.get(url);
		}

		if (this.loading.has(url)) {
			return this.loading.get(url);
		}

		const loadPromise = new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				this.loadedAssets.set(url, img);
				resolve(img);
			};
			img.onerror = () => reject(new Error('Failed to load image: ' + url));
			img.src = url;
		});

		this.loading.set(url, loadPromise);
		return loadPromise;
	}

	async preloadSceneAssets(scene) {
		const assets = [];
		if (scene.background) {
			const url = scene.background.match(/url\(['"]?(.*?)['"]?\)/)?.[1];
			if (url) {
				assets.push(this.preloadImage(url));
			}
		}
		if (scene.npcPortrait) {
			assets.push(this.preloadImage(scene.npcPortrait));
		}
		try {
			await Promise.all(assets);
		} catch (e) {
			// Don't let a single missing/broken asset block scene loading.
			// Log for debugging, but resolve so callers can continue.
			// (Callers may still choose to treat this as an error.)

			console.warn('[assetLoader] preloadSceneAssets: some assets failed to load', e);
		}
	}

	clearCache() {
		this.loadedAssets.clear();
		this.loading.clear();
	}
}

export const assetLoader = new AssetLoader();
