import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useFrontendUpdateStore } from './stores/frontendUpdateStore';
import { reloadOnceForFrontendUpdate } from './utils/frontendUpdate';

const DEPLOY_CHECK_INTERVAL_MS = 3 * 60 * 1000;
const DEPLOY_SCRIPT_RE = /<script[^>]+type=["']module["'][^>]+src=["']([^"']*\/assets\/[^"']+\.js[^"']*)["']/i;
const DEPLOY_STYLE_RE = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']*\/assets\/[^"']+\.css[^"']*)["']/i;

function isDynamicImportFailureMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch dynamically imported module')
    || normalized.includes('importing a module script failed')
    || normalized.includes('failed to load module script')
    || normalized.includes('chunkloaderror')
    || normalized.includes('loading css chunk')
    || normalized.includes('unable to preload css')
  );
}

function shouldRecoverFromAssetFailure(event: ErrorEvent) {
  const directMessage = typeof event.message === 'string' ? event.message : '';
  const nestedMessage =
    event.error && typeof event.error === 'object' && 'message' in event.error && typeof event.error.message === 'string'
      ? event.error.message
      : '';

  if (isDynamicImportFailureMessage(directMessage) || isDynamicImportFailureMessage(nestedMessage)) {
    return true;
  }

  const target = event.target;
  if (target instanceof HTMLScriptElement) {
    return /\/assets\/.+\.js(?:$|\?)/.test(target.src);
  }
  if (target instanceof HTMLLinkElement) {
    return target.rel === 'stylesheet' && /\/assets\/.+\.css(?:$|\?)/.test(target.href);
  }

  return false;
}

function shouldRecoverFromPromiseRejection(reason: unknown) {
  if (typeof reason === 'string') {
    return isDynamicImportFailureMessage(reason);
  }

  if (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string') {
    return isDynamicImportFailureMessage(reason.message);
  }

  return false;
}

function normalizeAssetPath(value: string) {
  try {
    return new URL(value, window.location.origin).pathname;
  } catch {
    return value;
  }
}

function createDeploySignature(scriptPath: string | null, stylePath: string | null) {
  if (!scriptPath && !stylePath) return null;
  return `${scriptPath ?? ''}|${stylePath ?? ''}`;
}

function getCurrentDeploySignature() {
  const moduleScript = document.querySelector('script[type="module"][src]') as HTMLScriptElement | null;
  const stylesheet = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]')).find((node) =>
    /\/assets\/.+\.css(?:$|\?)/.test(node.getAttribute('href') ?? ''),
  ) as HTMLLinkElement | undefined;

  return createDeploySignature(
    moduleScript?.src ? normalizeAssetPath(moduleScript.src) : null,
    stylesheet?.href ? normalizeAssetPath(stylesheet.href) : null,
  );
}

function extractDeploySignature(html: string) {
  const scriptMatch = html.match(DEPLOY_SCRIPT_RE);
  const styleMatch = html.match(DEPLOY_STYLE_RE);

  return createDeploySignature(
    scriptMatch?.[1] ? normalizeAssetPath(scriptMatch[1]) : null,
    styleMatch?.[1] ? normalizeAssetPath(styleMatch[1]) : null,
  );
}

async function fetchLatestDeploySignature() {
  const url = new URL('/index.html', window.location.origin);
  url.searchParams.set('deploy-check', String(Date.now()));

  const response = await fetch(url.toString(), {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) return null;
  return extractDeploySignature(await response.text());
}

function installDeployRefreshMonitor() {
  if (import.meta.env.DEV) return;

  const currentSignature = getCurrentDeploySignature();
  if (!currentSignature) return;
  useFrontendUpdateStore.getState().setCurrentSignature(currentSignature);

  let knownSignature = currentSignature;
  let checkInFlight = false;

  const checkForDeployUpdate = async () => {
    if (checkInFlight) return;
    checkInFlight = true;

    try {
      const latestSignature = await fetchLatestDeploySignature();
      if (!latestSignature || latestSignature === knownSignature) return;

      knownSignature = latestSignature;
      useFrontendUpdateStore.getState().markUpdateReady(latestSignature);
    } catch {
      /* ignore transient deploy check failures */
    } finally {
      checkInFlight = false;
    }
  };

  const intervalId = window.setInterval(() => {
    void checkForDeployUpdate();
  }, DEPLOY_CHECK_INTERVAL_MS);

  window.addEventListener('focus', () => {
    void checkForDeployUpdate();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkForDeployUpdate();
    }
  });

  window.addEventListener('beforeunload', () => {
    window.clearInterval(intervalId);
  });
}

function installChunkMismatchRecovery() {
  window.addEventListener(
    'error',
    (event) => {
      if (shouldRecoverFromAssetFailure(event)) {
        reloadOnceForFrontendUpdate();
      }
    },
    true,
  );

  window.addEventListener('unhandledrejection', (event) => {
    if (shouldRecoverFromPromiseRejection(event.reason)) {
      event.preventDefault();
      reloadOnceForFrontendUpdate();
    }
  });
}

installChunkMismatchRecovery();
installDeployRefreshMonitor();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
