create schema if not exists registers;
create table registers.registers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0),
 description text not null default '', country text not null default 'NZ' check(country in ('NZ','AU','OTHER')),
 app_entity boolean not null default false, personal_data boolean not null default false,
 purpose text not null default '', review_days integer not null default 30 check(review_days>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index register_name on registers.registers(lower(name));
create table registers.fields (
 id uuid primary key default gen_random_uuid(), register_id uuid not null references registers.registers(id),
 name text not null check(length(trim(name))>0), kind text not null check(kind in ('text','number','date','boolean','choice')),
 required boolean not null default false, options jsonb not null default '[]',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(register_id,name), check(jsonb_typeof(options)='array')
);
create table registers.records (
 id uuid primary key default gen_random_uuid(), register_id uuid not null references registers.registers(id),
 external_id text, title text not null check(length(trim(title))>0), owner text not null default '',
 status text not null default 'open' check(status in ('open','active','waiting','done','archived')),
 due_on date, reviewed_on date, review_due_on date, retain_until date,
 legal_hold boolean not null default false, hold_reason text not null default '',
 values jsonb not null default '{}', source_values jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(register_id,external_id), check(jsonb_typeof(values)='object'),check(jsonb_typeof(source_values)='object'),
 check(not legal_hold or length(trim(hold_reason))>0)
);
create table registers.links (
 id uuid primary key default gen_random_uuid(), from_id uuid not null references registers.records(id),
 to_id uuid not null references registers.records(id), kind text not null check(kind in ('depends-on','related')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(from_id,to_id,kind),check(from_id<>to_id)
);
create table registers.reviews (
 id uuid primary key default gen_random_uuid(), record_id uuid not null references registers.records(id),
 actor text not null, note text not null check(length(trim(note))>0), reviewed_on date not null,
 next_due date not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(next_due>reviewed_on)
);
create table registers.notes (
 id uuid primary key default gen_random_uuid(), record_id uuid not null references registers.records(id),
 actor text not null, note text not null check(length(trim(note))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table registers.imports (
 id uuid primary key default gen_random_uuid(), register_id uuid not null references registers.registers(id),
 file_name text not null, sha256 text not null, row_count integer not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table registers.audit (
 id uuid primary key default gen_random_uuid(), entity text not null, entity_id uuid not null,
 action text not null, actor text not null, changed_keys jsonb not null,
 created_at timestamptz not null default now()
);
create function registers.touch() returns trigger language plpgsql as $$
begin new.updated_at=clock_timestamp(); return new; end $$;
create function registers.audit_change() returns trigger language plpgsql as $$
declare keys jsonb;
begin
 if TG_OP='UPDATE' then
  select coalesce(jsonb_agg(n.key),'[]'::jsonb) into keys from jsonb_each(to_jsonb(new)) n
  where n.value is distinct from to_jsonb(old)->n.key and n.key<>'updated_at';
 else select jsonb_agg(key) into keys from jsonb_each(to_jsonb(new)); end if;
 insert into registers.audit(entity,entity_id,action,actor,changed_keys)
 values(TG_TABLE_NAME,new.id,TG_OP,coalesce(nullif(current_setting('registers.actor',true),''),'database operator'),keys);
 return new;
end $$;
create function registers.no_audit_change() returns trigger language plpgsql as $$
begin raise exception 'Audit entries are append-only'; end $$;
create trigger immutable_audit before update or delete on registers.audit for each row execute function registers.no_audit_change();
do $$ declare t text; begin
 foreach t in array array['registers','fields','records','links','reviews','notes','imports'] loop
 execute format('create trigger touch before update on registers.%I for each row execute function registers.touch()',t);
 execute format('create trigger journal after insert or update on registers.%I for each row execute function registers.audit_change()',t);
 execute format('alter table registers.%I enable row level security',t);
 execute format('revoke all on registers.%I from public',t);
 end loop;
end $$;
alter table registers.audit enable row level security;
revoke all on registers.audit from public;
revoke all on schema registers from public;
create view registers.record_overview as
 select r.id,g.name as register,r.title,r.owner,r.status,r.due_on,r.review_due_on,r.retain_until,
 r.legal_hold,r.updated_at::date as last_changed,
 (select count(*)::int from registers.links l join registers.records d on d.id=l.to_id
 where l.from_id=r.id and l.kind='depends-on' and d.status not in ('done','archived')) as blockers,
 r.register_id,r.values
 from registers.records r join registers.registers g on g.id=r.register_id;
create view registers.workload as
 select coalesce(nullif(owner,''),'Unassigned') as owner, count(*)::int as open_records,
 count(*) filter(where due_on<current_date)::int as overdue,
 count(*) filter(where status='waiting')::int as waiting,
 count(*) filter(where review_due_on<current_date or review_due_on is null)::int as reviews_due
 from registers.records where status not in ('done','archived') group by owner;
create view registers.compliance as
 select r.id,g.name as register,r.title,'RETENTION-REVIEW'::text as rule,
 case when g.country='NZ' then 'NZ IPP 9' else 'AU APP 11.2' end as basis,
 'Purpose and retention review overdue; check lawful need and any retention duties'::text as finding,
 case when g.country='NZ' then 'https://www.privacy.org.nz/privacy-principles/9/' else 'https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information' end as source
 from registers.records r join registers.registers g on g.id=r.register_id
 where g.personal_data and (g.country='NZ' or (g.country='AU' and g.app_entity))
 and (r.retain_until is null or r.retain_until<current_date) and not r.legal_hold
 union all
 select r.id,g.name,r.title,'ACCURACY-REVIEW','NZ IPP 8',
 'Accuracy check due under the business review schedule; check before use or disclosure',
 'https://www.privacy.org.nz/privacy-principles/8/'
 from registers.records r join registers.registers g on g.id=r.register_id
 where g.personal_data and g.country='NZ' and r.status<>'archived' and (r.review_due_on is null or r.review_due_on<current_date)
 union all
 select r.id,g.name,r.title,'PURPOSE-MISSING','Business policy supporting privacy review',
 'Personal-data register has no recorded lawful purpose',
 case when g.country='NZ' then 'https://www.privacy.org.nz/privacy-principles/1/' else 'https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information' end
 from registers.records r join registers.registers g on g.id=r.register_id where g.personal_data and trim(g.purpose)='';
create view registers.attention as
 select id,register,title,owner,'OVERDUE'::text as issue,due_on::text as detail from registers.record_overview
 where status not in ('done','archived') and due_on<current_date
 union all select id,register,title,owner,'UNASSIGNED','No owner' from registers.record_overview where status not in ('done','archived') and owner=''
 union all select id,register,title,owner,'BLOCKED',blockers::text||' incomplete dependencies' from registers.record_overview where status not in ('done','archived') and blockers>0
 union all select id,register,title,owner,'STALE','No update in 30 days (business policy)' from registers.record_overview where status not in ('done','archived') and last_changed<current_date-30
 union all select c.id,c.register,c.title,r.owner,c.rule,c.finding from registers.compliance c join registers.records r on r.id=c.id;
