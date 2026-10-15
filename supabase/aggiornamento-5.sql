-- Stone Temple Cards Game · aggiornamento 5: chat globale fra tutti i giocatori.
-- Da incollare una volta in Supabase → SQL Editor → New query → Run (dopo schema.sql).
-- Finché non c'è, nel gioco la chat dice "non ancora attiva" (il resto funziona lo stesso).
-- La chat la leggono e la scrivono solo i giocatori con l'account e un nome.

create table if not exists public.chat (
  id bigint generated always as identity primary key,
  giocatore uuid not null references public.profili on delete cascade,
  nome text not null,
  testo text not null check (char_length(testo) between 1 and 300),
  creato timestamptz not null default now()
);
create index if not exists chat_giocatore_creato on public.chat (giocatore, creato desc);

alter table public.chat enable row level security;
drop policy if exists "chat visibile a chi ha l'account" on public.chat;
create policy "chat visibile a chi ha l'account" on public.chat for select to authenticated using (true);
drop policy if exists "ognuno cancella i suoi messaggi" on public.chat;
create policy "ognuno cancella i suoi messaggi" on public.chat for delete to authenticated using (giocatore = auth.uid());
-- si scrive solo con la funzione qui sotto (nome giusto, lunghezza, niente raffiche)
revoke all on public.chat from anon, authenticated;
grant select, delete on public.chat to authenticated;

create or replace function public.scrivi_chat(testo text)
returns public.chat
language plpgsql
security definer
set search_path = public
as $$
declare
  n text;
  r public.chat;
begin
  if auth.uid() is null then raise exception 'serve un account'; end if;
  select p.nome into n from profili p where p.id = auth.uid();
  if n is null then raise exception 'serve un nome giocatore'; end if;
  testo := btrim(regexp_replace(testo, '\s+', ' ', 'g'));
  if char_length(testo) < 1 then raise exception 'messaggio vuoto'; end if;
  if char_length(testo) > 300 then raise exception 'messaggio troppo lungo'; end if;
  -- niente raffiche: un messaggio ogni 3 secondi, al massimo 12 al minuto
  if exists (select 1 from chat c where c.giocatore = auth.uid() and c.creato > now() - interval '3 seconds')
     or (select count(*) from chat c where c.giocatore = auth.uid() and c.creato > now() - interval '1 minute') >= 12 then
    raise exception 'chat troppo veloce';
  end if;
  insert into chat (giocatore, nome, testo) values (auth.uid(), n, testo) returning * into r;
  -- si tengono gli ultimi 1000 messaggi
  delete from chat c where c.id <= r.id - 1000;
  return r;
end;
$$;
revoke execute on function public.scrivi_chat(text) from public, anon;
grant execute on function public.scrivi_chat(text) to authenticated;
