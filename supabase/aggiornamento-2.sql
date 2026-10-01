-- Stone Temple Cards Game · aggiornamento 2: missioni, medaglie e classifica settimanale.
-- Da incollare una volta in Supabase → SQL Editor → New query → Run (dopo schema.sql).

-- ------------------------------------------------------------ missioni riscattate
-- Le missioni le controlla il gioco; il database registra il premio (una volta per missione e periodo).
create table if not exists public.missioni_fatte (
  giocatore uuid not null references public.profili on delete cascade,
  codice text not null,
  periodo text not null,
  xp integer not null,
  fatta timestamptz not null default now(),
  primary key (giocatore, codice, periodo)
);
alter table public.missioni_fatte enable row level security;
create policy "ognuno vede le sue missioni" on public.missioni_fatte for select using (giocatore = auth.uid());

-- Giornaliere (g-…) valgono 30 punti, settimanali (s-…) 120. Il periodo è il giorno (AAAA-MM-GG)
-- o la settimana (AAAA-Wnn) di oggi, oppure quelli appena passati (per chi gioca a cavallo della mezzanotte).
create or replace function public.riscatta_missione(codice text, periodo text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  premio integer;
begin
  if auth.uid() is null then raise exception 'serve un account'; end if;
  if codice in ('g-vinci2', 'g-gioca3', 'g-speciali5', 'g-ko4', 'g-allievi', 'g-arma', 'g-effetto2', 'g-normale') then
    if periodo not in (to_char(oggi, 'YYYY-MM-DD'), to_char(oggi - 1, 'YYYY-MM-DD')) then raise exception 'missione scaduta'; end if;
    premio := 30;
  elsif codice in ('s-vinci10', 's-torneo', 's-online', 's-difficile', 's-ko20', 's-palestre') then
    if periodo not in (to_char(oggi, 'IYYY-"W"IW'), to_char(oggi - 7, 'IYYY-"W"IW')) then raise exception 'missione scaduta'; end if;
    premio := 120;
  else
    raise exception 'missione sconosciuta';
  end if;
  insert into missioni_fatte (giocatore, codice, periodo, xp) values (auth.uid(), codice, periodo, premio);
  update profili set xp = xp + premio where id = auth.uid();
  return premio;
exception when unique_violation then
  raise exception 'missione già riscattata';
end;
$$;
revoke execute on function public.riscatta_missione(text, text) from public, anon;
grant execute on function public.riscatta_missione(text, text) to authenticated;

-- ------------------------------------------------------------ medaglie
create table if not exists public.medaglie (
  giocatore uuid not null references public.profili on delete cascade,
  codice text not null check (codice ~ '^[a-z]{2,20}$'),
  presa timestamptz not null default now(),
  primary key (giocatore, codice)
);
alter table public.medaglie enable row level security;
create policy "ognuno vede le sue medaglie" on public.medaglie for select using (giocatore = auth.uid());
create policy "ognuno aggiunge le sue medaglie" on public.medaglie for insert with check (giocatore = auth.uid());

-- ------------------------------------------------------------ classifica della settimana
-- Punti fatti da lunedì (ora italiana): partite più missioni.
create or replace function public.classifica_settimana()
returns table (nome text, xp bigint, vittorie bigint)
language sql
security definer
set search_path = public
stable
as $$
  with inizio as (select (date_trunc('week', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome') as t),
  punti as (
    select giocatore, xp, vinta from partite, inizio where creata >= inizio.t
    union all
    select giocatore, xp, false from missioni_fatte, inizio where fatta >= inizio.t
  )
  select p.nome, sum(x.xp)::bigint, count(*) filter (where x.vinta)::bigint
  from punti x join profili p on p.id = x.giocatore
  group by p.nome
  order by 2 desc, 3 desc
  limit 50;
$$;
grant execute on function public.classifica_settimana() to anon, authenticated;
