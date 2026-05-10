
-- Roles
create type public.app_role as enum ('user','admin','banned');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role='admin')
$$;

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
          coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles policies
create policy "profiles readable by all" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid()=id);
create policy "admin update any profile" on public.profiles for update using (public.is_admin(auth.uid()));

-- user_roles policies
create policy "roles readable by all auth" on public.user_roles for select using (true);
create policy "admin manage roles" on public.user_roles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- CMS: page content blocks
create table public.page_content (
  id uuid primary key default gen_random_uuid(),
  page_id text not null,
  section_id text not null,
  content_text text not null default '',
  content_json jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique(page_id, section_id)
);
alter table public.page_content enable row level security;
create policy "cms public read" on public.page_content for select using (true);
create policy "cms admin write" on public.page_content for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  page_id text not null,
  section_id text not null,
  content_text text not null,
  content_json jsonb,
  saved_by uuid references auth.users(id),
  saved_at timestamptz not null default now()
);
alter table public.content_versions enable row level security;
create policy "versions admin only" on public.content_versions for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Feature blocks
create table public.feature_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id text not null,
  title text not null,
  description text not null default '',
  icon text,
  sort_order int not null default 0,
  enabled boolean not null default true
);
alter table public.feature_blocks enable row level security;
create policy "features public read" on public.feature_blocks for select using (enabled or public.is_admin(auth.uid()));
create policy "features admin write" on public.feature_blocks for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  product_key text unique not null,
  name text not null,
  tier text not null,
  description text not null default '',
  price_cents int not null default 0,
  features jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  sort_order int not null default 0
);
alter table public.products enable row level security;
create policy "products public read" on public.products for select using (true);
create policy "products admin write" on public.products for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Pricing plans
create table public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text unique not null,
  name text not null,
  price_cents int not null default 0,
  period text not null default 'lifetime',
  features jsonb not null default '[]'::jsonb,
  highlight boolean not null default false,
  enabled boolean not null default true,
  sort_order int not null default 0
);
alter table public.pricing_plans enable row level security;
create policy "plans public read" on public.pricing_plans for select using (true);
create policy "plans admin write" on public.pricing_plans for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- FAQ
create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  enabled boolean not null default true
);
alter table public.faq_items enable row level security;
create policy "faq public read" on public.faq_items for select using (enabled or public.is_admin(auth.uid()));
create policy "faq admin write" on public.faq_items for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null default 'info',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "announce public read" on public.announcements for select using (active or public.is_admin(auth.uid()));
create policy "announce admin write" on public.announcements for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Changelogs
create table public.changelogs (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  release_date date not null default current_date,
  changes jsonb not null default '[]'::jsonb,
  notes text
);
alter table public.changelogs enable row level security;
create policy "changelog public read" on public.changelogs for select using (true);
create policy "changelog admin write" on public.changelogs for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- News
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.news_posts enable row level security;
create policy "news public read" on public.news_posts for select using (published or public.is_admin(auth.uid()));
create policy "news admin write" on public.news_posts for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- System status
create table public.system_status (
  id uuid primary key default gen_random_uuid(),
  service_name text unique not null,
  status text not null default 'operational',
  message text,
  updated_at timestamptz not null default now()
);
alter table public.system_status enable row level security;
create policy "status public read" on public.system_status for select using (true);
create policy "status admin write" on public.system_status for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Downloads (admin-only data; surfaced as pricing per user request)
create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  product_key text not null,
  file_name text not null,
  version text not null,
  url text not null,
  requires_approval boolean not null default true
);
alter table public.downloads enable row level security;
create policy "downloads admin only" on public.downloads for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Purchase requests
create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_key text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  cashapp_username text not null,
  amount_cents int not null default 0,
  status text not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now()
);
alter table public.purchase_requests enable row level security;
create policy "user read own purchase" on public.purchase_requests for select using (auth.uid()=user_id or public.is_admin(auth.uid()));
create policy "user create purchase" on public.purchase_requests for insert with check (auth.uid()=user_id);
create policy "admin update purchase" on public.purchase_requests for update using (public.is_admin(auth.uid()));
create policy "admin delete purchase" on public.purchase_requests for delete using (public.is_admin(auth.uid()));

-- Appeals
create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  message text not null,
  status text not null default 'pending',
  admin_response text,
  created_at timestamptz not null default now()
);
alter table public.appeals enable row level security;
create policy "user read own appeal" on public.appeals for select using (auth.uid()=user_id or public.is_admin(auth.uid()));
create policy "user create appeal" on public.appeals for insert with check (auth.uid()=user_id);
create policy "admin update appeal" on public.appeals for update using (public.is_admin(auth.uid()));

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "user read own notif" on public.notifications for select using (auth.uid()=user_id or user_id is null or public.is_admin(auth.uid()));
create policy "user mark read own" on public.notifications for update using (auth.uid()=user_id);
create policy "admin manage notif" on public.notifications for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Security logs
create table public.security_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.security_logs enable row level security;
create policy "security admin read" on public.security_logs for select using (public.is_admin(auth.uid()));
create policy "security insert any" on public.security_logs for insert with check (true);

-- Audit logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target text,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy "audit admin read" on public.audit_logs for select using (public.is_admin(auth.uid()));
create policy "audit admin write" on public.audit_logs for insert with check (public.is_admin(auth.uid()));

-- Site settings & toggles
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select using (true);
create policy "settings admin write" on public.site_settings for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  method_key text unique not null,
  name text not null,
  enabled boolean not null default false,
  sort_order int not null default 0
);
alter table public.payment_methods enable row level security;
create policy "pm public read" on public.payment_methods for select using (true);
create policy "pm admin write" on public.payment_methods for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.ip_blocklist (
  id uuid primary key default gen_random_uuid(),
  ip text unique not null,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.ip_blocklist enable row level security;
create policy "ip admin only" on public.ip_blocklist for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.community_posts enable row level security;
create policy "community public read" on public.community_posts for select using (not hidden or public.is_admin(auth.uid()));
create policy "community user create" on public.community_posts for insert with check (auth.uid()=user_id);
create policy "community admin moderate" on public.community_posts for update using (public.is_admin(auth.uid()));
create policy "community admin delete" on public.community_posts for delete using (public.is_admin(auth.uid()));

-- Seed data
insert into public.payment_methods (method_key,name,enabled,sort_order) values
  ('cashapp','CashApp',true,1),('stripe','Stripe',false,2),('credit_card','Credit Card',false,3),
  ('paypal','PayPal',false,4),('crypto','Crypto',false,5),('bank','Bank Transfer',false,6);

insert into public.products (product_key,name,tier,description,price_cents,features,sort_order) values
  ('xeno','Xeno','basic','Essential next-gen protection for everyday systems.',1999,'["Real-time scanning","Web shield","Email guard","24/7 monitoring"]'::jsonb,1),
  ('superxeno','SuperXeno','mid','Advanced threat defense with AI-driven analysis.',4999,'["Everything in Xeno","AI heuristics","Ransomware shield","Identity protection","Priority support"]'::jsonb,2),
  ('hyperxeno','HyperXeno','premium','Flagship enterprise-grade fortress for elite defense.',9999,'["Everything in SuperXeno","Zero-day defense","Quantum-grade encryption","Dedicated specialist","Multi-device (10)","Hardware firewall integration"]'::jsonb,3);

insert into public.pricing_plans (plan_key,name,price_cents,period,features,highlight,sort_order) values
  ('xeno','Xeno',1999,'lifetime','["Real-time scanning","Web shield","Email guard"]'::jsonb,false,1),
  ('superxeno','SuperXeno',4999,'lifetime','["AI heuristics","Ransomware shield","Identity protection"]'::jsonb,true,2),
  ('hyperxeno','HyperXeno',9999,'lifetime','["Zero-day defense","Quantum encryption","Dedicated specialist"]'::jsonb,false,3);

insert into public.system_status (service_name,status) values
  ('Auth Service','operational'),('Threat Engine','operational'),('Cloud Sync','operational'),
  ('Update Server','operational'),('Dashboard API','operational'),('Payment Gateway','operational');

insert into public.faq_items (question,answer,sort_order) values
  ('What is HYPER XENO?','A next-generation cybersecurity suite engineered as a premium alternative to legacy defenders.',1),
  ('How do I purchase?','Choose a tier, submit the purchase form, and send payment via CashApp to $CMasxter. An admin verifies and unlocks access.',2),
  ('Is there a refund policy?','Refunds are reviewed case-by-case via the Appeals system within 7 days of purchase.',3),
  ('Which OS is supported?','Windows 10/11 (64-bit). macOS and Linux builds in beta.',4);

insert into public.changelogs (version,release_date,changes,notes) values
  ('3.2.0',current_date,'["Quantum encryption layer","Refined dashboard","Faster scan engine"]'::jsonb,'Major release.'),
  ('3.1.4',current_date - 14,'["Patched zero-day vector","UI polish"]'::jsonb,'Stability patch.');

insert into public.news_posts (title,body) values
  ('HyperXeno 3.2 launches','The flagship build now ships with quantum-grade encryption.'),
  ('Threat report: Q1','Detected and neutralized 2.4M attack vectors this quarter.');

insert into public.announcements (title,body,type,active) values
  ('Welcome to HYPER XENO','Premium next-gen protection — now in public beta.','info',true);

insert into public.feature_blocks (page_id,title,description,icon,sort_order) values
  ('home','Real-time defense','Sub-millisecond threat interception across every vector.','shield',1),
  ('home','AI heuristics','Self-learning models adapt to zero-day attacks instantly.','brain',2),
  ('home','Quantum encryption','Post-quantum cryptography securing every byte at rest.','lock',3),
  ('home','24/7 monitoring','Always-on watchtower with global telemetry coverage.','radar',4);

insert into public.site_settings (key,value) values
  ('maintenance_mode','false'::jsonb),
  ('registration_open','true'::jsonb),
  ('cashapp_handle','"$CMasxter"'::jsonb);

-- Seed CMS content for every page
insert into public.page_content (page_id,section_id,content_text) values
  ('home','hero_title','Defend the impossible.'),
  ('home','hero_subtitle','HYPER XENO is the next-generation cybersecurity suite built for those who refuse to compromise.'),
  ('home','hero_cta','Explore Pricing'),
  ('home','stats_protected','2.4M+'),
  ('home','stats_detection','99.9%'),
  ('home','stats_response','<1ms'),
  ('about','title','About HYPER XENO'),
  ('about','body','Founded by a coalition of ex-defense engineers, HYPER XENO redefines endpoint protection from first principles.'),
  ('features','title','A new defense paradigm'),
  ('features','body','Every layer engineered for elegance, speed, and silence.'),
  ('products','title','Three tiers. One philosophy.'),
  ('products','body','Choose the level of protection that matches your threat model.'),
  ('pricing','title','Pricing'),
  ('pricing','body','Lifetime licenses. No subscriptions. No telemetry tax.'),
  ('contact','title','Contact'),
  ('contact','body','Reach our security operations center anytime.'),
  ('contact','email','ops@hyperxeno.io'),
  ('credits','title','Credits'),
  ('credits','body','Built by the HYPER XENO collective. Special thanks to the open security community.'),
  ('faq','title','Frequently Asked Questions'),
  ('terms','title','Terms of Service'),
  ('terms','body','By using HYPER XENO you agree to fair use, no reverse engineering, and the appeals process for disputes.'),
  ('privacy','title','Privacy Policy'),
  ('privacy','body','We collect only what is required to operate the service. Telemetry is opt-in. We never sell data.'),
  ('community','title','Community'),
  ('community','body','Join the HYPER XENO collective — share intel, request features, and help shape the roadmap.'),
  ('docs','title','Documentation'),
  ('docs','body','Installation, configuration, and advanced tuning guides for every tier.'),
  ('security','title','Security Center'),
  ('security','body','Live posture for your fleet. Threats neutralized, vectors monitored, posture grade.'),
  ('demo','title','Live Protection Demo'),
  ('demo','body','Watch HYPER XENO intercept simulated threats in real time.'),
  ('news','title','News & Updates'),
  ('changelog','title','Changelog'),
  ('status','title','Status'),
  ('system_status','title','System Status'),
  ('downloads','title','Downloads'),
  ('downloads','body','Pricing-only view — purchase a tier to unlock your build.');

-- Seed admin user (gxdctrg / gxdctrgILoveShoes2)
do $$
declare _uid uuid;
begin
  if not exists (select 1 from auth.users where email='gxdctrg@hyperxeno.local') then
    _uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', _uid, 'authenticated','authenticated',
      'gxdctrg@hyperxeno.local',
      crypt('gxdctrgILoveShoes2', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username','gxdctrg'),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), _uid,
      jsonb_build_object('sub',_uid::text,'email','gxdctrg@hyperxeno.local'),
      'email', _uid::text, now(), now(), now());
    insert into public.profiles (id, username, display_name) values (_uid,'gxdctrg','gxdctrg') on conflict do nothing;
    insert into public.user_roles (user_id, role) values (_uid,'admin') on conflict do nothing;
  else
    select id into _uid from auth.users where email='gxdctrg@hyperxeno.local';
    insert into public.user_roles (user_id, role) values (_uid,'admin') on conflict do nothing;
  end if;
end$$;
