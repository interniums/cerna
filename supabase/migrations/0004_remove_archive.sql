-- Cerna: remove archiving (drop resources.status)
--
-- We first normalize existing rows to avoid losing meaning, then remove the column.
-- If you were using "archived" as a delete surrogate, adjust this migration accordingly.

update public.resources
set status = 'unread'
where status = 'archived';

alter table public.resources
drop column if exists status;


