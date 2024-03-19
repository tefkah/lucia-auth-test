'use client';

import { Github } from 'lucide-react';
import React from 'react';
import { useFormState } from 'react-dom';
import Link from 'next/link';
import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import Image from 'next/image';

import { signup } from '@/app/actions/signup';
import { createSignupSchema } from '@/app/lib/zod.schema';

export function SignupForm() {
  const [lastResult, action] = useFormState(signup, undefined);

  const [form, fields] = useForm({
    id: 'signup-form',
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: (control) => createSignupSchema(control),
      });
    },
    shouldValidate: 'onBlur',
  });

  return (
    <>
      <Link href="/" className="anchor-dark">
        go home
      </Link>
      <h1>Signup</h1>
      <form
        action={action}
        {...getFormProps(form)}
        className="flex flex-col gap-y-2"
      >
        <label htmlFor={fields.email.key}>Email</label>
        <input
          className={!fields.email.valid ? 'text-red-500' : ''}
          {...getInputProps(fields.email, { type: 'email' })}
          key={fields.email.key}
        />
        <label htmlFor={fields.password.key}>Password</label>
        <input {...getInputProps(fields.password, { type: 'password' })} />
        <div className="text-red-500">{fields.email.errors}</div>
        <button type="submit">signup</button>
      </form>
      <a href="/auth/github/login" className="flex gap-x-2 items-center">
        <Github />
        Sign in with Github
      </a>
      <a href="/auth/orcid/login" className="flex gap-x-2 items-center">
        <Image src="/orcid.svg" alt="orcid" width={20} height={20} />
        Sign in with ORCID
      </a>
    </>
  );
}
