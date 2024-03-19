import { orcid } from '../orcid';
import { lucia } from '../../lucia';
import { cookies } from 'next/headers';
import { OAuth2RequestError } from 'arctic';
import { generateId } from 'lucia';
import { db } from '@/app/db';
import { userTable } from '@/app/db/drizzle.schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies().get('orcid_oauth_state')?.value ?? null;
  if (!code || !state || !storedState || state !== storedState) {
    console.log({
      code,
      state,
      storedState,
    });
    return new Response(null, {
      status: 400,
    });
  }

  const tokens = await orcid.validateAuthorizationCode(code);
  console.log(tokens);
  const orcidUserResponse = await fetch(
    'https://sandbox.orcid.org/oauth/userinfo',
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    }
  );
  const orcidUser: OrcidUser = await orcidUserResponse.json();
  console.log(orcidUser);

  // const url = await orcid.createAuthorizationURL(state, {
  //   scopes: ['/read-public'],
  // });

  // const res = await fetch(url);

  // const { access_token } = await res.json();

  const existingUser = await db.query.userTable.findFirst({
    where: (users, { eq }) => eq(users.orcidId, orcidUser.sub),
  });

  if (existingUser) {
    const session = await lucia.createSession(existingUser?.id, {});
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

  const orcidUserResponse1 = await fetch(
    `https://pub.sandbox.orcid.org/v3.0/${orcidUser.sub}/record`,
    {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: 'application/json',
      },
    }
  );
  const orcidUser2 = await orcidUserResponse1.json();
  console.log(orcidUser2);

  const email = orcidUser2.person.emails?.email[0]?.email;
  console.log('email: ', email);

  if (!email) {
    console.log('No email found');
    // the user has not added an email to their ORCID account
    // so we manually need to ask them to add an email
    cookies().set('orcid_user_id', orcidUser.sub, {
      path: '/',
      expires: 1000 * 60 * 10, // 10 minutes
      maxAge: 1000 * 60 * 10,
      name: 'orcid_user_id',
      secure: process.env.NODE_ENV === 'production',
      value: orcidUser.sub,
    });

    redirect('/auth/orcid/addEmail');
    // return new Response(null, {
    //   status: 302,
    //   headers: {
    //     Location: '/auth/orcid/addEmail',
    //   },
    // });
  }
  // try {
  //     redirect('/auth/orcid/addEmail');
  //   }

  // Replace this with your own DB client.

  if (existingUser) {
    console.log('User already exists', existingUser);
    // user has already been created with this email
    // we allow the user to log in
    if (!existingUser.githubId) {
      console.log('Updating user with githubId');
      await db
        .update(userTable)
        .set({
          githubId: orcidUser.id,
        })
        .where(eq(userTable.id, existingUser.id));
    }

    if (existingUser.orcidId !== orcidUser.id && existingUser.githubId) {
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
      orcidId: orcidUser.id,
      emailVerified: 1,
      email: email,
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
  // } catch (e) {
  //   console.log(e);
  //   // the specific error message depends on the provider
  //   if (e instanceof OAuth2RequestError) {
  //     // invalid code
  //     return new Response(null, {
  //       status: 400,
  //     });
  //   }
  //   return new Response(null, {
  //     status: 500,
  //   });
  // }
}

interface OrcidUser {
  sub: string;
  id: string;
  name: string | null;
  family_name: string | null;
  given_name: string;
}
