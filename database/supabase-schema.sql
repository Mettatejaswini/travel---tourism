
create extension if not exists pgcrypto;

-- Travel destinations
create table if not exists public.destinations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    country text not null,
    region text,
    description text,
    image_url text,
    price_per_person numeric(12, 2) not null default 0,
    duration_days integer not null default 1,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- Customer bookings
create table if not exists public.bookings (
    id uuid primary key default gen_random_uuid(),
    destination_id uuid not null
        references public.destinations(id),
    customer_name text not null,
    email text not null,
    phone text,
    travel_date date not null,
    travelers integer not null check (travelers between 1 and 20),
    special_requests text,
    status text not null default 'pending',
    created_at timestamptz not null default now()
);

-- Contact messages
create table if not exists public.contact_messages (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    subject text,
    message text not null,
    created_at timestamptz not null default now()
);

-- Add sample destinations only if their names are not present
insert into public.destinations
    (name, country, region, description, image_url,
     price_per_person, duration_days, is_active)
select
    'Manali',
    'India',
    'Himachal Pradesh',
    'Enjoy mountain views, snowy landscapes, and peaceful valleys.',
    'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=900&q=80',
    8999,
    4,
    true
where not exists (
    select 1 from public.destinations where name = 'Manali'
);

insert into public.destinations
    (name, country, region, description, image_url,
     price_per_person, duration_days, is_active)
select
    'Bali',
    'Indonesia',
    'Southeast Asia',
    'Explore tropical beaches, temples, and beautiful green landscapes.',
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80',
    24999,
    6,
    true
where not exists (
    select 1 from public.destinations where name = 'Bali'
);

insert into public.destinations
    (name, country, region, description, image_url,
     price_per_person, duration_days, is_active)
select
    'Paris',
    'France',
    'Europe',
    'Discover famous landmarks, charming streets, and French culture.',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80',
    49999,
    5,
    true
where not exists (
    select 1 from public.destinations where name = 'Paris'
);
