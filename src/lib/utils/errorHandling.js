// @ts-nocheck
import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';

// Initialize error tracking
export function initializeErrorTracking() {
	if (import.meta.env.VITE_SENTRY_DSN) {
		Sentry.init({
			dsn: import.meta.env.VITE_SENTRY_DSN,
			integrations: [new BrowserTracing()],
			tracesSampleRate: 1.0,
			environment: import.meta.env.NODE_ENV
		});
	}
}

// Error boundary component
export function ErrorBoundary({ children }) {
	return {
		onerror(error) {
			console.error('Error caught by boundary:', error);
			Sentry.captureException(error);
		},
		render() {
			return children;
		}
	};
}
