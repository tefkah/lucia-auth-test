import { db } from '@/app/db';
import { userTable } from '@/app/db/drizzle.schema';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { lucia } from '../../lucia';
import { sendEmailVerificationCode } from '@/app/actions/signup';
import { TimeSpan } from 'lucia';
import { eq } from 'drizzle-orm';

async function addOrcidEmail(form: FormData) {
  'use server';
  const orcid = cookies().get('orcid_user_id')?.value;
  console.log(cookies());
  const email = form.get('email')?.toString();
  console.log(form);

  if (!orcid) {
    console.error('No ORCID user found');
    return { error: 'No ORCID user found' };
  }

  if (!email) {
    console.error('No email provided');
    return { error: 'No email provided' };
  }

  const existingUser = await db.query.userTable.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (!existingUser) {
    const insert = await db
      .insert(userTable)
      .values({
        orcidId: orcid,
        emailVerified: 0,
        email: email,
      })
      .returning();

    try {
      sendEmailVerificationCode(insert[0].id, email);

      cookies().set(VERIFIED_EMAIL_ALERT, 'true', {
        maxAge: new TimeSpan(1, 'm').seconds(), // 10 minutes = 60 * 60 * 1
      });
    } catch (err) {
      console.error(`Signup error while creating Lucia session:`);
      console.error(err);
    }

    cookies().delete('orcid_user_id');
    redirect('/verify-email');
  }

  if (existingUser.orcidId !== orcid && existingUser.orcidId) {
    throw new Error(
      'This email is already associated with another ORCID account'
    );
  }

  if (existingUser.orcidId) {
    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
    cookies().delete('orcid_user_id');
    redirect('/');
  }

  try {
    await db
      .update(userTable)
      .set({
        orcidId: orcid,
      })
      .where(eq(userTable.id, existingUser.id));
  } catch (err) {
    console.error(`Signup error while creating Lucia session:`);
    console.error(err);
  }

  const session = await lucia.createSession(existingUser.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  cookies().delete('orcid_user_id');
  redirect('/');
}

export default async function AddOrcidEmail() {
  return (
    <>
      <h1>Add your email</h1>
      <p>
        You have set your email to private on ORCID. Either set it to public, or
        add an email here.
      </p>
      <form action={addOrcidEmail}>
        <label>
          Email
          <input type="email" name="email" required />
        </label>
        <button type="submit">Add email</button>
      </form>
    </>
  );
}
