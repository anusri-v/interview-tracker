# Interview Tracker

Candidate recruitment management system: campaigns, candidates, interviewers, and feedback.

## Stack

- **Next.js 14** (App Router) – frontend and API
- **PostgreSQL** – database via Prisma
- **NextAuth.js** – Google (Gmail) sign-in; roles: admin, interviewer

## Setup

1. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` – PostgreSQL connection string
   - `NEXTAUTH_SECRET` – random string (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL` – e.g. `http://localhost:3000`
   - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` – from [Google Cloud Console](https://console.cloud.google.com/) (OAuth 2.0 Client)

2. **Database**

   ```bash
   npx prisma db push
   ```

   Or with migrations:

   ```bash
   npx prisma migrate dev --name init
   ```

3. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign in with Google. New users get **interviewer** role. To create the first admin: run `npx prisma studio`, open the `User` table, and set your user's `role` to `admin`. After that, admins can promote others under **Manage admins**.

## Features

- **Admin:** Create campaigns; add candidates (manual or CSV with `name`, `email`, and optional `phone`, `college`, `department`, `resume_link`); assign interviewers to candidates; edit candidate details and status (rejected / in pipeline / selected) and role; dashboard with candidate and interview counts and selected-by-role list.
- **Interviewer:** View scheduled/ongoing interviews; see candidate details and past feedbacks; start interview → complete and submit feedback + pointers for next interviewer; list of interviewed candidates and simple dashboard.

## CSV upload

Required columns: `name`, `email`. Optional: `phone`, `college`, `department`, `resume_link` (or `resume link`). Headers are case-insensitive. One candidate per row.
