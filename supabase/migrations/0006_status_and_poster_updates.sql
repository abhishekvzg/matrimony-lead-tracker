-- Drop the unused "Reviewing" status, and rename the family "who's this"
-- identities used for spoke_by from generic roles to actual names.

alter table leads drop constraint if exists leads_status_check;

update leads set status = 'New' where status = 'Reviewing';

alter table leads add constraint leads_status_check check (status in (
  'New', 'Contacted', 'In Discussion', 'Meeting Planned',
  'Meeting Done', 'On Hold', 'Rejected', 'Rejected by Other Side', 'Hide'
));

alter table interactions drop constraint if exists interactions_spoke_by_check;

update interactions set spoke_by = 'Surya' where spoke_by = 'Dad';
update interactions set spoke_by = 'Sireesha' where spoke_by = 'Mom';
update interactions set spoke_by = 'Sruthi' where spoke_by = 'Sister';
update interactions set spoke_by = 'Abhishek' where spoke_by in ('You', 'Other');

alter table interactions add constraint interactions_spoke_by_check check (spoke_by in (
  'Surya', 'Sireesha', 'Sruthi', 'Abhishek'
));
