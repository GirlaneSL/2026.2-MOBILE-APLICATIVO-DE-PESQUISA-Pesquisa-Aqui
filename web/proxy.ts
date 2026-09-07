import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ['/login']

export const proxy = (request: NextRequest) => {
    const { pathname } = request.nextUrl;
    const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
    const token = request.cookies.get('access_token')?.value;

    if (!token && !isPublicPath) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('access_token');
        return response;
    }

    if (token && pathname.startsWith('/login')) return NextResponse.redirect(new URL('/', request.url));

    const response = NextResponse.next();

    if (!isPublicPath) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    ],
}
