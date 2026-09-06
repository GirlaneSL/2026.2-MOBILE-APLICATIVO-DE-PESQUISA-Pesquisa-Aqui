import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ['/login']

export const middleware = (request: NextRequest) => {
    const { pathname } = request.nextUrl;
    const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
    const token = request.cookies.get('access_token')?.value;

    if (!token && !isPublicPath) return NextResponse.redirect(new URL('/login', request.url));

    if (token && pathname.startsWith('/login')) return NextResponse.redirect(new URL('/', request.url));

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}

