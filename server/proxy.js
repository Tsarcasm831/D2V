import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { ESM_ORIGIN, ESM_REDIRECT_LIMIT, ESM_PROXY_HEADERS } from './constants.js';

export const shouldProxyEsmPath = (pathname) => {
    if (pathname.startsWith('/esm/')) {
        return true;
    }
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
        return false;
    }
    if (segments[0].includes('@')) {
        return true;
    }
    if (segments[0].startsWith('@') && segments[1]?.includes('@')) {
        return true;
    }
    return false;
};

export const buildUpstreamUrl = (pathname, search) => {
    let upstreamPath = pathname.startsWith('/esm/')
        ? pathname.slice('/esm/'.length)
        : pathname.replace(/^\/+/, '');
    try {
        upstreamPath = decodeURIComponent(upstreamPath);
    } catch {
        // Keep the raw path if it is not valid percent-encoding.
    }
    const origin = ESM_ORIGIN.replace(/\/$/, '');
    return `${origin}/${encodeURI(upstreamPath)}${search}`;
};

export const proxyEsmModule = (res, upstreamUrl, redirectsLeft = ESM_REDIRECT_LIMIT) => {
    const targetUrl = new URL(upstreamUrl);
    const requestFn = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
    const upstreamRequest = requestFn(
        targetUrl,
        {
            method: 'GET',
            headers: {
                Accept: 'application/javascript, text/javascript, */*',
                'User-Agent': 'D2V-ESM-Proxy'
            }
        },
        (upstreamResponse) => {
            const statusCode = upstreamResponse.statusCode || 502;
            const redirectLocation = upstreamResponse.headers.location;

            if (statusCode >= 300 && statusCode < 400 && redirectLocation) {
                if (redirectsLeft <= 0) {
                    upstreamResponse.resume();
                    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('ESM redirect limit exceeded');
                    return;
                }

                const nextUrl = new URL(redirectLocation, targetUrl).toString();
                upstreamResponse.resume();
                proxyEsmModule(res, nextUrl, redirectsLeft - 1);
                return;
            }

            const headers = {};
            for (const headerName of ESM_PROXY_HEADERS) {
                const headerValue = upstreamResponse.headers[headerName];
                if (headerValue) {
                    headers[headerName] = headerValue;
                }
            }
            res.writeHead(statusCode, headers);
            upstreamResponse.pipe(res);
        }
    );

    upstreamRequest.on('error', (error) => {
        console.error(`[HTTP] ESM proxy failed: ${error.message}`);
        res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Upstream module fetch failed');
    });

    upstreamRequest.end();
};
