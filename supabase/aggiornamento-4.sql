-- Stone Temple Cards Game · aggiornamento 4: le sfide della Modalità Storia e dell'Arena del Tempio valgono punti.
-- Da incollare una volta in Supabase → SQL Editor → New query → Run (dopo schema.sql).
-- Finché non c'è, le sfide della storia non entrano nei punti dell'account (il gioco funziona lo stesso).

alter table public.partite drop constraint if exists partite_modalita_check;
alter table public.partite add constraint partite_modalita_check
  check (modalita in ('cpu', 'torneo', 'online', 'pvp', 'tutorial', 'storia', 'arena'));

-- Punti esperienza: come schema.sql, più Arena 40 (come il torneo); la storia vale come il computer
-- al livello dell'avversario. Sconfitta: 10. Sempre al massimo una partita al minuto.
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
    when modalita in ('torneo', 'arena') then 40
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
revoke execute on function public.registra_partita(boolean, text, text, text[]) from public, anon;
grant execute on function public.registra_partita to authenticated;
