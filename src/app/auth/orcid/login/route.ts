import { generateState } from 'arctic';
import { cookies } from 'next/headers';
import { orcid } from '../orcid';

export async function GET(): Promise<Response> {
  const state = generateState();
  const url = await orcid.createAuthorizationURL(state, {
    scopes: ['openid'],
  });
  console.log(url);

  cookies().set('orcid_oauth_state', state, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: 'lax',
  });

  return Response.redirect(url);
}
