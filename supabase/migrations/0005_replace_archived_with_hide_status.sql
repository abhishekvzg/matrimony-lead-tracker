-- Replace the separate `archived` boolean with a "Hide" status value, so
-- hiding a lead is just one more status transition instead of a parallel
-- flag that can drift out of sync with it.

-- Preserve current archived state before the column disappears.
update leads set status = 'Hide' where archived = true;

alter table leads drop constraint if exists leads_status_check;
alter table leads add constraint leads_status_check check (status in (
  'New', 'Reviewing', 'Contacted', 'In Discussion', 'Meeting Planned',
  'Meeting Done', 'On Hold', 'Rejected', 'Rejected by Other Side', 'Hide'
));

drop index if exists leads_archived_idx;
alter table leads drop column if exists archived;
