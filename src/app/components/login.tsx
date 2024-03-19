'use client';

import React from 'react';
import { useFormState } from 'react-dom';
import Link from 'next/link';
import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';

import { login } from '@/app/actions/login';
import { loginSchema } from '@/app/lib/zod.schema';
import { Toast } from '@/app/components/toast';
import { Github } from 'lucide-react';
import Image from 'next/image';

export function LoginForm() {
  const [lastResult, action] = useFormState(login, undefined);

  const [form, fields] = useForm({
    id: 'login-form',
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: loginSchema,
      });
    },
    shouldValidate: 'onBlur',
  });

  return (
    <>
      <Link href="/" className="anchor-dark">
        go home
      </Link>
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
        {form.allErrors.email && (
          <div className="text-red-500">{form.allErrors.email}</div>
        )}
        <label htmlFor={fields.password.key}>Password</label>
        <input {...getInputProps(fields.password, { type: 'password' })} />
        {form.allErrors.password && (
          <div className="text-red-500">{form.allErrors.password}</div>
        )}
        <button type="submit" name="intent" value="login">
          login
        </button>
      </form>

      <a href="/auth/github/login" className="flex gap-x-2 items-center">
        <Github />
        Sign in with Github
      </a>
      <a href="/auth/orcid/login" className="flex gap-x-2 items-center">
        <Image
          src="/orcid.svg"
          height="20"
          width="20"
          alt="ORCID logo"
          className="w-6 h-6"
        />
        Sign in with ORCID
      </a>
    </>
  );
}
