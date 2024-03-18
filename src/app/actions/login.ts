'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { TimeSpan } from 'oslo';

import { db } from '@/app/db/index';
import { userTable } from '@/app/db/drizzle.schema';
import { loginSchema } from '@/app/lib/zod.schema';

import { sendEmailVerificationCode } from '@/app/actions/signup';
import { VERIFIED_EMAIL_ALERT } from '@/app/lib/constants';
import { Bcrypt } from 'oslo/password';
import { lucia } from '../auth/lucia';

export async function login(prevState: unknown, formData: FormData) {
  const submission = await parseWithZod(formData, {
    schema: loginSchema.transform(async (data, ctx) => {
      const existingUser = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, data.email))
        .execute()
        .then((s) => s[0]);
      if (!(existingUser && existingUser.id)) {
        ctx.addIssue({
          path: ['email'],
          code: z.ZodIssueCode.custom,
          message: 'Invalid email',
        });
        return z.NEVER;
      }

      const validPassword = await new Bcrypt().verify(
        existingUser.hashedPassword,
        data.password
      );

      if (!validPassword) {
        ctx.addIssue({
          path: ['password'],
          code: z.ZodIssueCode.custom,
          message: 'Invalid password',
        });
      }

      return { ...data, ...existingUser };
    }),
    async: true,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  try {
    //   sendEmailVerificationCode(submission.value.id, submission.value.email)
    // cookies().set(VERIFIED_EMAIL_ALERT, 'true', {
    //   maxAge: new TimeSpan(1, 'm').seconds(), // 10 minutes = 60 * 60 * 1
    // });
    const session = await lucia.createSession(submission.value.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
  } catch (err) {
    console.error(`Login error while creating Lucia session:`);
    console.error(err);
  }

  return redirect('/');
}
