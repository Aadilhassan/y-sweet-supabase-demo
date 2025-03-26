-- Create profiles table to store user information
create table profiles (
  id uuid references auth.users not null primary key,
  email text unique not null,
  display_name text,
  created_at timestamp with time zone default now() not null
);

-- Create documents table
create table documents (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text,
  owner_id uuid references profiles(id) not null,
  collaborators uuid[] not null default '{}',
  version_count integer not null default 0,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  last_edited_by uuid references profiles(id)
);

-- Create document_versions table to track document history
create table document_versions (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references documents(id) not null,
  content text not null,
  version_number integer not null,
  created_at timestamp with time zone default now() not null,
  created_by uuid references profiles(id) not null,
  restored_from integer
);

-- Create trigger to create profile on user signup
create or replace function create_profile_for_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure create_profile_for_user();

-- Set up RLS (Row Level Security)
-- Enable RLS on documents
alter table documents enable row level security;

-- Documents policy (users can read documents they own or collaborate on)
create policy "Users can read their own documents or ones they collaborate on"
  on documents for select
  using (auth.uid() = owner_id or auth.uid() = any(collaborators));

-- Documents policy (only owners and collaborators can update)
create policy "Users can update their own documents or ones they collaborate on"
  on documents for update
  using (auth.uid() = owner_id or auth.uid() = any(collaborators));

-- Documents policy (only authenticated users can insert documents they own)
create policy "Users can insert their own documents"
  on documents for insert
  with check (auth.uid() = owner_id);

-- Documents policy (only owners can delete)
create policy "Only owners can delete documents"
  on documents for delete
  using (auth.uid() = owner_id);

-- Document versions policy
alter table document_versions enable row level security;

-- Only collaborators can insert versions
create policy "Only collaborators can insert versions"
  on document_versions for insert
  with check ((select owner_id = auth.uid() or auth.uid() = any(collaborators) from documents where id = document_id));

-- Only collaborators can read versions
create policy "Only collaborators can read versions"
  on document_versions for select
  using ((select owner_id = auth.uid() or auth.uid() = any(collaborators) from documents where id = document_id));

-- Set up realtime
alter publication supabase_realtime add table documents;
