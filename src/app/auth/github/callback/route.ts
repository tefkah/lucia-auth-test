import { github } from '../github';
import { lucia } from '../../lucia';
import { cookies } from 'next/headers';
import { OAuth2RequestError } from 'arctic';
import { generateId } from 'lucia';
import { db } from '@/app/db';
import { userTable } from '@/app/db/drizzle.schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies().get('github_oauth_state')?.value ?? null;
  if (!code || !state || !storedState || state !== storedState) {
    return new Response(null, {
      status: 400,
    });
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);
    const githubUserResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    const githubUser: GitHubUser = await githubUserResponse.json();
    console.log(githubUser);

    // Replace this with your own DB client.
    const existingUser = await db.query.userTable.findFirst({
      where: (users, { eq }) => eq(users.email, githubUser.email),
    });

    if (existingUser) {
      console.log('User already exists', existingUser);
      // user has already been created with this email
      // we allow the user to log in
      if (!existingUser.githubId) {
        console.log('Updating user with githubId');
        await db
          .update(userTable)
          .set({
            githubId: githubUser.id,
          })
          .where(eq(userTable.id, existingUser.id));
      }

      if (existingUser.githubId !== githubUser.id && existingUser.githubId) {
        throw new Error(
          'This email is already associated with another GitHub account'
        );
      }

      const session = await lucia.createSession(existingUser.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/',
        },
      });
    }

    const insert = await db
      .insert(userTable)
      .values({
        githubId: githubUser.id,
        emailVerified: 1,
        email: githubUser.email,
      })
      .returning();
    // Replace this with your own DB client.
    // await db.table('user').insert({
    //   id: userId,
    //   github_id: githubUser.id,
    //   username: githubUser.login,
    // });

    const session = await lucia.createSession(insert[0]?.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
      },
    });
  } catch (e) {
    console.log(e);
    // the specific error message depends on the provider
    if (e instanceof OAuth2RequestError) {
      // invalid code
      return new Response(null, {
        status: 400,
      });
    }
    return new Response(null, {
      status: 500,
    });
  }
}

interface GitHubUser {
  id: number;
  login: string;
  email: string;
}
