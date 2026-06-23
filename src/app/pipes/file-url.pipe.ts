import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../environment/environment.prod';

/**
 * Resolve a stored file URL against the host the app is CURRENTLY using for API
 * calls, so uploaded files load no matter how the app was reached:
 *   - LAN:    environment.apiUrl = 'http://192.168.8.189:3002/api'
 *             -> 'http://192.168.8.189:3002/uploads/...'
 *   - Public: environment.apiUrl = '/api'  (same origin)
 *             -> '/uploads/...'
 *
 * Only locally-stored files (paths containing '/uploads/') are rewritten. Any
 * other URL (legacy 'https://hrproindia.in/...' links, local assets like
 * '/img.png', data URIs) is returned unchanged. Empty/null -> ''.
 *
 * For single-domain clients (e.g. IM, always reached via one public domain) the
 * rewritten host equals the original, so this is effectively a no-op there.
 * It only changes behaviour for clients reached over both LAN and public (JMRH).
 */
export function resolveFileUrl(url: string | null | undefined): string {
  if (!url) return '';
  const idx = url.indexOf('/uploads/');
  if (idx === -1) return url; // not a locally-stored upload — leave as-is
  const origin = environment.apiUrl.replace(/\/api\/?$/, ''); // strip trailing /api
  return `${origin}${url.substring(idx)}`;
}

@Pipe({ name: 'fileUrl', standalone: true })
export class FileUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    return resolveFileUrl(url);
  }
}
