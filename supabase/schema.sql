-- Stone Temple Card Game: account, livelli, classifica generale e collezione.
-- Da incollare una volta in Supabase → SQL Editor → New query → Run.

-- ------------------------------------------------------------ profili dei giocatori
create table if not exists public.profili (
  id uuid primary key references auth.users on delete cascade,
  nome text not null unique check (char_length(nome) between 2 and 20),
  xp integer not null default 0,
  vittorie integer not null default 0,
  sconfitte integer not null default 0,
  creato timestamptz not null default now()
);
alter table public.profili enable row level security;
-- la classifica è pubblica: tutti vedono nome, punti e risultati
create policy "profili visibili a tutti" on public.profili for select using (true);
create policy "ognuno crea il proprio profilo" on public.profili for insert with check (id = auth.uid());
create policy "ognuno cambia il proprio nome" on public.profili for update using (id = auth.uid());
-- punti e risultati si cambiano solo con registra_partita, non a mano
revoke update on public.profili from authenticated, anon;
grant update (nome) on public.profili to authenticated;
revoke insert on public.profili from authenticated, anon;
grant insert (id, nome) on public.profili to authenticated;

-- ------------------------------------------------------------ partite giocate
create table if not exists public.partite (
  id bigint generated always as identity primary key,
  giocatore uuid not null references public.profili on delete cascade,
  vinta boolean not null,
  modalita text not null check (modalita in ('cpu', 'torneo', 'online', 'pvp', 'tutorial')),
  livello text,
  carte text[] not null default '{}',
  xp integer not null default 0,
  creata timestamptz not null default now()
);
create index if not exists partite_giocatore on public.partite (giocatore, creata desc);
alter table public.partite enable row level security;
create policy "ognuno vede le sue partite" on public.partite for select using (giocatore = auth.uid());
-- nessun insert diretto: si passa da registra_partita

-- ------------------------------------------------------------ collezione di carte
create table if not exists public.collezione (
  giocatore uuid not null references public.profili on delete cascade,
  carta text not null check (carta ~ '^[a-z]{2,20}$'),
  ottenuta timestamptz not null default now(),
  primary key (giocatore, carta)
);
alter table public.collezione enable row level security;
create policy "ognuno vede la sua collezione" on public.collezione for select using (giocatore = auth.uid());
create policy "ognuno aggiunge alla sua collezione" on public.collezione for insert with check (giocatore = auth.uid());

-- ------------------------------------------------------------ registrazione di una partita
-- Punti esperienza: vittoria contro il computer 20/30/45 (facile/normale/difficile), torneo 40,
-- online 50, due giocatori sullo stesso telefono 15, tutorial 10. Sconfitta: 10.
-- Al massimo una partita al minuto, per evitare raffiche di risultati finti.
create or replace function public.registra_partita(vinta boolean, modalita text, livello text, carte text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  guadagno integer;
begin
  if auth.uid() is null then raise exception 'serve un account'; end if;
  if exists (select 1 from partite p where p.giocatore = auth.uid() and p.creata > now() - interval '60 seconds') then
    raise exception 'troppo presto per un''altra partita';
  end if;
  guadagno := case
    when not vinta then 10
    when modalita = 'online' then 50
    when modalita = 'torneo' then 40
    when modalita = 'pvp' then 15
    when modalita = 'tutorial' then 10
    when livello = 'difficile' then 45
    when livello = 'normale' then 30
    else 20 end;
  insert into partite (giocatore, vinta, modalita, livello, carte, xp)
    values (auth.uid(), vinta, modalita, livello, coalesce(carte[1:4], '{}'), guadagno);
  update profili set xp = xp + guadagno,
    vittorie = vittorie + (case when vinta then 1 else 0 end),
    sconfitte = sconfitte + (case when vinta then 0 else 1 end)
    where id = auth.uid();
  return guadagno;
end;
$$;
revoke execute on function public.registra_partita from anon;
grant execute on function public.registra_partita to authenticated;
