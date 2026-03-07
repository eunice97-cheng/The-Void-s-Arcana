/* @ts-check */
// Lightweight adaptation of parts of the legacy ui.js for the Free Mode component.
// This module exports an initUI(root) function that wires up tooltips and avatar upload
// without relying on global gameState/saveManager. All calls are defensive.

/**
 * @param {Document} [root=document]
 */
export function initUI(root = document) {
	try {
		console.debug('[freeModeLegacy] initUI - start');
		setupTooltips(root);
		setupAvatarUpload(root);
		console.debug('[freeModeLegacy] initUI - complete');
	} catch (e) {
		console.warn('[freeModeLegacy] initUI failed', e);
	}
}

/**
 * @param {Document} root
 */
function setupTooltips(root) {
	try {
		const customTooltip = root.getElementById('custom-tooltip');
		if (!customTooltip) return;

		/** @type {{[k:string]:string}} */
		const tooltipData = {
			'audio-toggle': 'Toggle Audio',
			'save-btn': 'Save Game',
			'load-btn': 'Load Game',
			'reset-btn': 'Reset Game',
			'import-btn': 'Import Game Data',
			'export-btn': 'Export Game Data',
			'settings-btn': 'Game Settings',
			'game-info-btn': 'Game Information',
			'avatar-container': 'Click to upload avatar'
		};

		const elements = Array.from(
			root.querySelectorAll('.icon-btn, .window-toggle, #avatar-container')
		);
		elements.forEach((element) => {
			/** @type {string|null} */
			const id = element.id || element.getAttribute('data-window') || null;
			const key = id || element.id;
			element.addEventListener(
				'mouseenter',
				/** @param {Event} e */ (e) => {
					const tooltipText = tooltipData[key];
					if (!tooltipText) return;
					customTooltip.textContent = tooltipText;
					customTooltip.classList.add('show');
					const rect = element.getBoundingClientRect();
					const isRightSide = rect.left > window.innerWidth / 2;
					if (isRightSide) customTooltip.classList.add('right-side');
					else customTooltip.classList.remove('right-side');
					positionTooltip(/** @type {MouseEvent} */ (e), customTooltip, isRightSide);
				}
			);
			element.addEventListener(
				'mousemove',
				/** @param {Event} e */ (e) =>
					positionTooltip(
						/** @type {MouseEvent} */ (e),
						customTooltip,
						element.getBoundingClientRect().left > window.innerWidth / 2
					)
			);
			element.addEventListener('mouseleave', () => {
				customTooltip.classList.remove('show');
				customTooltip.classList.remove('right-side');
			});
		});
	} catch {
		console.warn('[freeModeLegacy] setupTooltips failed');
	}
}

/**
 * @param {MouseEvent} e
 * @param {HTMLElement} customTooltip
 * @param {boolean} isRightSide
 */
function positionTooltip(e, customTooltip, isRightSide) {
	try {
		const element = /** @type {HTMLElement} */ (e.currentTarget);
		const rect = element.getBoundingClientRect();
		if (isRightSide) {
			const x = rect.left - customTooltip.offsetWidth - 5;
			const y = rect.top + rect.height / 2 - customTooltip.offsetHeight / 2;
			customTooltip.style.left = Math.max(5, x) + 'px';
			customTooltip.style.top = Math.max(5, y) + 'px';
		} else {
			const x = rect.right + 5;
			const y = rect.top + rect.height / 2 - customTooltip.offsetHeight / 2;
			customTooltip.style.left =
				Math.min(window.innerWidth - customTooltip.offsetWidth - 5, x) + 'px';
			customTooltip.style.top = Math.max(5, y) + 'px';
		}
	} catch {
		// ignore
	}
}

/**
 * @param {Document} root
 */
function setupAvatarUpload(root) {
	try {
		const avatarContainer = root.getElementById('avatar-container');
		const avatarUpload = root.getElementById('avatar-upload');
		const avatar = /** @type {HTMLImageElement|null} */ (root.getElementById('avatar'));
		const avatarPlaceholder = root.getElementById('avatar-placeholder');
		// const uploadProgress = root.querySelector('.upload-progress');

		if (!avatarContainer || !avatarUpload || !avatar) return;

		avatarContainer.addEventListener('click', () => avatarUpload.click());

		avatarUpload.addEventListener('change', (e) => {
			const input = /** @type {HTMLInputElement} */ (e.target);
			const file = input && input.files && input.files[0];
			if (!file) return;
			if (!file.type.startsWith('image/')) {
				try {
					alert('Please select an image file');
				} catch {
					/* ignore */
				}
				return;
			}
			const reader = new FileReader();
			reader.onload = (ev) => {
				const result = ev && ev.target && ev.target.result;
				if (result && avatar) {
					avatar.src = String(result);
					avatar.style.display = 'block';
					if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
				}
			};
			reader.readAsDataURL(file);
		});
	} catch {
		console.warn('[freeModeLegacy] setupAvatarUpload failed');
	}
}
