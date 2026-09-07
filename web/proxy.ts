import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ['/login']
const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export const proxy = async (request: NextRequest) => {
    const { pathname } = request.nextUrl;
    const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
    const token = request.cookies.get('access_token')?.value;

    let isValid = false;

    if (token) {
        try {
            await jwtVerify(token, secret);
            isValid = true;
        } catch (error) {
            isValid = false;
        }
    }

    if (!isValid && !isPublicPath) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('access_token');
        return response;
    }

    if (isValid && pathname.startsWith('/login')) return NextResponse.redirect(new URL('/', request.url));

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
