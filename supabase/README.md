# Supabase Database & Migration Guide

This directory contains the database schema and Row Level Security (RLS) migrations for MailGuard AI.

## Applying the Migration

### Option A: Using the Supabase Dashboard (Fastest)
1. Navigate to your Supabase project at [supabase.com](https://supabase.com).
2. Click on **SQL Editor** in the left navigation sidebar.
3. Open `supabase/migrations/20261102000000_init_mailguard.sql` from this repository.
4. Paste the SQL statements into the SQL Editor and click **Run**.
5. Verify that the `predictions` and `user_settings` tables appear in the **Table Editor** with RLS enabled.

### Option B: Using the Supabase CLI
```bash
# Link project
supabase link --project-ref your-project-id

# Push migration
supabase db push
```

## Security & Access Policies

- **`predictions` table**:
  - `user_id`: References `auth.users(id)`
  - RLS Policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE` all enforce `auth.uid() = user_id`.
  - Unauthenticated access is rejected by PostgreSQL.
- **`user_settings` table**:
  - Stores `store_email_body` privacy preference (default: `false`).
  - Auto-initialized upon user creation via trigger `on_auth_user_created_settings`.
