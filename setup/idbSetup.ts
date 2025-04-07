import { setup } from "vitest-indexeddb";
import 'blob-polyfill';
import { Blob as BlobPolyfill } from 'buffer';

global.Blob = BlobPolyfill as any; // Polyfill for Blob in Node.js environment
setup();