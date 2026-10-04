-- Stone Temple Cards Game · aggiornamento 3: il viaggio della Modalità Storia salvato sull'account.
-- Da incollare una volta in Supabase → SQL Editor → New query → Run (dopo schema.sql).
-- Così chi ha l'account ritrova la storia anche se il telefono cancella i dati del sito o cambia telefono.

create table if not exists public.storia (
  giocatore uuid primary key references auth.users on delete cascade,
  dati jsonb not null check (pg_column_size(dati) < 262144),
  aggiornata timestamptz not null default now()
);
alter table public.storia enable row level security;
create policy "ognuno vede il suo viaggio" on public.storia for select using (giocatore = auth.uid());
create policy "ognuno salva il suo viaggio" on public.storia for insert with check (giocatore = auth.uid());
create policy "ognuno aggiorna il suo viaggio" on public.storia for update using (giocatore = auth.uid()) with check (giocatore = auth.uid());
grant select, insert, update on public.storia to authenticated;
