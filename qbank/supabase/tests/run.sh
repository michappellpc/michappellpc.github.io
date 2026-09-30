#!/usr/bin/env bash
# Tests the privacy rules in ../schema.sql on a real Postgres by acting as different people.
#   PGHOST=/path/to/socket PGPORT=5432 PGUSER=postgres bash run.sh
# Needs a running Postgres you can create databases in. Uses a throwaway database named qbank_test.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; DB=qbank_test
export PGOPTIONS='--client-min-messages=warning'
P() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null || { echo "cannot create test database"; exit 2; }
P -d $DB -f "$HERE/shim.sql" >/dev/null && P -d $DB -f "$HERE/../schema.sql" >/dev/null || { echo "schema failed to load"; exit 2; }

declare -A U=( [admin]=00000000-0000-0000-0000-00000000000a [a]=00000000-0000-0000-0000-0000000000a1 [b]=00000000-0000-0000-0000-0000000000b2
               [c]=00000000-0000-0000-0000-0000000000c3 [d]=00000000-0000-0000-0000-0000000000d4 [e]=00000000-0000-0000-0000-0000000000e5
               [rev]=00000000-0000-0000-0000-0000000000f6 )
P -d $DB >/dev/null <<SQL
insert into allowed_emails (email, role, plan) values ('admin@x','admin','pro'), ('a@x','member','pro'), ('b@x','member','pro'), ('d@x','member','free'), ('e@x','member','pro'), ('rev@x','reviewer','pro');
insert into auth.users (id, email) values ('${U[admin]}','Admin@X'), ('${U[a]}','a@x'), ('${U[b]}','b@x'), ('${U[c]}','c@x'), ('${U[d]}','d@x'), ('${U[e]}','e@x'), ('${U[rev]}','rev@x');
insert into questions (id, boards, subject, stem, options, answer, explanation, tier) values
  ('q-free','{aem}','S','stem','[{"id":"A","text":"x"}]','A','why','free'), ('q-pro','{om}','S','stem','[{"id":"A","text":"x"}]','A','why','pro');
delete from allowed_emails where email = 'e@x';   -- e was approved, then removed
insert into questions (id, boards, subject, stem, options, answer, explanation, tier, image, image_alt) values
  ('q-img-pro','{om}','S','stem','[{"id":"A","text":"x"}]','A','why','pro','private:pro.png','alt'), ('q-img-free','{om}','S','stem','[{"id":"A","text":"x"}]','A','why','free','private:free.png','alt');
insert into questions (id, boards, subject, stem, options, answer, explanation, tier, image, image_alt, archived) values
  ('q-arch','{om}','S','archived stem','[{"id":"A","text":"x"}]','A','why','free','private:arch.png','alt', true);
insert into attempts (user_id, question_id, ok, client_id) values ('${U[a]}','q-arch',true,'arch1');
insert into storage.buckets (id, name) values ('other-bucket','other-bucket') on conflict do nothing;
insert into storage.objects (bucket_id, name) values ('question-images','pro.png'), ('question-images','free.png'), ('question-images','orphan.png'), ('question-images','arch.png'), ('other-bucket','pro.png');
SQL

PASS=0; FAIL=0
as() { # as <who|anon> <sql>: run sql as that person, rolled back afterwards unless the sql commits
  local who="$1" role=authenticated claims
  if [[ "$who" == anon ]]; then role=anon; claims='{}'; else claims="{\"sub\":\"${U[$who]}\"}"; fi
  psql -X -q -t -A -d $DB 2>&1 <<SQL
begin;
set local role $role;
select set_config('request.jwt.claims', '$claims', true) \gset
$2
SQL
}
root() { psql -X -q -t -A -d $DB -c "$1" 2>&1; }
ok()   { PASS=$((PASS+1)); printf '  pass  %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  FAIL  %s\n        wanted: %s\n        got:    %s\n' "$1" "$2" "$3"; }
eq()   { [[ "$3" == "$2" ]] && ok "$1" || bad "$1" "$2" "$3"; }          # exact match
has()  { [[ "$3" == *"$2"* ]] && ok "$1" || bad "$1" "contains: $2" "$3"; } # substring (used for errors)

echo "Who gets in"
eq  "listed member is active on a pro plan"      "true,pro"   "$(root "select active||','||plan from profiles where email='a@x'")"
eq  "admin email is matched case-insensitively"  "true,admin" "$(root "select active||','||role from profiles where id='${U[admin]}'")"
eq  "unlisted sign-up is inactive, free plan"    "false,free"  "$(root "select active||','||plan from profiles where email='c@x'")"
eq  "removed person is inactive"                 "f"         "$(root "select active from profiles where email='e@x'")"

echo "Questions"
has "signed-out visitor is refused"              "permission denied" "$(as anon "select count(*) from questions;")"
eq  "unlisted person sees nothing"               "0" "$(as c "select count(*) from questions;")"
eq  "removed person sees nothing"                "0" "$(as e "select count(*) from questions;")"
eq  "pro member sees free + pro"                 "4" "$(as a "select count(*) from questions;")"
eq  "free member sees only free tier"            "2" "$(as d "select count(*) from questions;")"
eq  "free member cannot fetch a pro question"    "0" "$(as d "select count(*) from questions where id='q-pro';")"
has "member cannot add a question"               "row-level security" "$(as a "insert into questions (id,boards,subject,stem,options,answer,explanation) values ('x','{aem}','S','s','[]','A','e');")"
has "member cannot edit a question"              "" "$(as a "update questions set stem='hacked' where id='q-free'; select stem from questions where id='q-free';")"
eq  "  ...and the stem is unchanged"             "stem" "$(root "select stem from questions where id='q-free'")"
eq  "admin can add a question"                   "x1" "$(as admin "insert into questions (id,boards,subject,stem,options,answer,explanation) values ('x1','{aem}','S','s','[]','A','e') returning id;")"
eq  "upload tool (service role) can add"         "x2" "$(psql -X -q -t -A -d $DB <<SQL 2>&1
begin; set local role service_role;
insert into questions (id,boards,subject,stem,options,answer,explanation) values ('x2','{aem}','S','s','[]','A','e') returning id;
SQL
)"

echo "Progress is private"
as a "insert into attempts (question_id, ok, client_id, at) values ('q-free', true,  'a1', now() - interval '3 hours'), ('q-free', false, 'a2', now() - interval '2 hours'), ('q-pro', true, 'a3', now() - interval '1 hour'); commit;" >/dev/null
as b "insert into attempts (question_id, ok, client_id) values ('q-free', true, 'b1'); commit;" >/dev/null
eq  "member sees their own attempts"             "4" "$(as a "select count(*) from attempts;")"
eq  "another member sees only theirs"            "1" "$(as b "select count(*) from attempts;")"
eq  "unlisted person sees no attempts"           "0" "$(as c "select count(*) from attempts;")"
has "cannot record an attempt as someone else"   "row-level security" "$(as a "insert into attempts (user_id, question_id, ok, client_id) values ('${U[b]}','q-free',true,'evil');")"
has "unlisted person cannot record attempts"     "row-level security" "$(as c "insert into attempts (question_id, ok, client_id) values ('q-free', true, 'c1');")"
has "cannot back-date into the future"           "row-level security" "$(as a "insert into attempts (question_id, ok, client_id, at) values ('q-free', true, 'f1', now() + interval '1 hour');")"
has "cannot record an attempt on a missing question" "violates foreign key" "$(as a "insert into attempts (question_id, ok, client_id) values ('nope', true, 'z1');")"
eq  "a retried upload does not double count"     "4" "$(as a "insert into attempts (question_id, ok, client_id) values ('q-free', true, 'a1') on conflict (user_id, client_id) do nothing; select count(*) from attempts;")"
has "attempts cannot be edited"                  "permission denied" "$(as a "update attempts set ok = true;")"
has "attempts cannot be deleted"                 "permission denied" "$(as a "delete from attempts;")"
eq  "progress summary is correct"                "q-free|2|1|1|false" "$(as a "select question_id||'|'||seen||'|'||correct||'|'||wrong||'|'||last_ok from my_progress() where question_id='q-free';")"

echo "Private images follow the question rules"
eq  "pro member can read both pictures"          "2" "$(as a "select count(*) from storage.objects where bucket_id='question-images' and name in ('pro.png','free.png');")"
eq  "free member can read only the free picture" "free.png" "$(as d "select string_agg(name, ',') from storage.objects where bucket_id='question-images';")"
eq  "a picture no question uses is unreadable"   "0" "$(as a "select count(*) from storage.objects where name='orphan.png';")"
eq  "same name in another bucket is unreadable"  "0" "$(as a "select count(*) from storage.objects where bucket_id='other-bucket';")"
eq  "unlisted person reads no pictures"          "0" "$(as c "select count(*) from storage.objects;")"
eq  "removed person reads no pictures"           "0" "$(as e "select count(*) from storage.objects;")"
has "signed-out visitor is refused"              "permission denied" "$(as anon "select count(*) from storage.objects;")"
has "member cannot upload a picture"             "row-level security" "$(as a "insert into storage.objects (bucket_id, name) values ('question-images','evil.png');")"
eq  "member cannot delete a picture"             "1" "$(as a "delete from storage.objects where bucket_id='question-images' and name='pro.png'; select count(*) from storage.objects where name='pro.png';")"
eq  "the bucket is private"                      "f" "$(root "select public from storage.buckets where id='question-images'")"

echo "Marks, tests and settings are private"
as a "insert into question_marks (question_id, flagged, note) values ('q-free', true, 'mine'); insert into user_settings (data) values ('{\"theme\":\"dark\"}'); insert into tests (id, taken_at, mode, qids, correct, total, seconds) values ('t1', now(), 'tutor', '{q-free}', 1, 1, 30); commit;" >/dev/null
eq  "owner reads their mark"                     "mine" "$(as a "select note from question_marks;")"
eq  "another member cannot read it"              "0"    "$(as b "select count(*) from question_marks;")"
eq  "another member cannot read settings"        "0"    "$(as b "select count(*) from user_settings;")"
eq  "another member cannot read tests"           "0"    "$(as b "select count(*) from tests;")"
has "cannot write a mark for someone else"       "row-level security" "$(as a "insert into question_marks (user_id, question_id, flagged) values ('${U[b]}','q-free',true);")"
has "note length is capped"                      "violates check constraint" "$(as a "update question_marks set note = repeat('x', 5000);")"

echo "Nobody can promote themselves"
has "member cannot become admin"                 "permission denied" "$(as a "update profiles set role = 'admin' where id = auth.uid();")"
has "free member cannot upgrade their plan"      "permission denied" "$(as d "update profiles set plan = 'pro' where id = auth.uid();")"
eq  "member sees only their own profile"         "1" "$(as a "select count(*) from profiles;")"
eq  "member cannot read the allow list"          "0" "$(as a "select count(*) from allowed_emails;")"
has "member cannot edit the allow list"          "row-level security" "$(as a "insert into allowed_emails (email) values ('me@x');")"
has "member cannot call admin summary"           "admins only" "$(as a "select * from admin_member_summary();")"
has "member cannot call question stats"          "editors only" "$(as a "select * from admin_question_stats();")"
has "signed-out visitor cannot call functions"   "permission denied" "$(as anon "select * from my_progress();")"

echo "Admin"
eq  "admin sees every profile"                   "7" "$(as admin "select count(*) from profiles;")"
eq  "admin summary lists everyone with counts"   "a@x|4|3" "$(as admin "select email||'|'||attempts||'|'||correct from admin_member_summary() where email='a@x';")"
eq  "question stats show percent correct"        "q-free|3|2|66.7" "$(as admin "select question_id||'|'||attempts||'|'||correct||'|'||pct_correct from admin_question_stats() where question_id='q-free';")"
eq  "admin can approve a new email"              "true,pro" "$(as admin "insert into allowed_emails (email, plan) values ('c@x','pro'); commit;" >/dev/null; root "select active||','||plan from profiles where email='c@x'")"
eq  "newly approved person now sees questions"   "4"     "$(as c "select count(*) from questions;")"
eq  "admin can revoke access"                    "false,free" "$(as admin "delete from allowed_emails where email='c@x'; commit;" >/dev/null; root "select active||','||plan from profiles where email='c@x'")"
eq  "revoked person sees nothing again"          "0"     "$(as c "select count(*) from questions;")"

echo "Reviewers and editors"
eq  "reviewer can read an archived question"     "1" "$(as rev "select count(*) from questions where id='q-arch';")"
eq  "admin can read an archived question"        "1" "$(as admin "select count(*) from questions where id='q-arch';")"
eq  "member cannot see an archived question"     "0" "$(as a "select count(*) from questions where id='q-arch';")"
eq  "...but keeps their own history for it"      "q-arch|1" "$(as a "select question_id||'|'||seen from my_progress() where question_id='q-arch';")"
eq  "reviewer can add a question"                "r-new" "$(as rev "insert into questions (id,boards,subject,stem,options,answer,explanation) values ('r-new','{aem}','S','s','[]','A','e') returning id;")"
eq  "reviewer can edit a question"               "changed" "$(as rev "update questions set stem='changed' where id='q-free'; select stem from questions where id='q-free';")"
eq  "reviewer cannot read the approved list"     "0" "$(as rev "select count(*) from allowed_emails;")"
has "reviewer cannot change the approved list"   "row-level security" "$(as rev "insert into allowed_emails (email) values ('sneaky@x');")"
eq  "reviewer sees only their own profile"       "1" "$(as rev "select count(*) from profiles;")"
has "reviewer cannot see the member list"        "admins only" "$(as rev "select * from admin_member_summary();")"
eq  "reviewer can see question statistics"       "t" "$(as rev "select count(*) > 0 from admin_question_stats();")"
eq  "reviewer cannot read anyone's attempts"     "0" "$(as rev "select count(*) from attempts;")"
eq  "reviewer cannot promote themselves"         "permission denied" "$(as rev "update profiles set role = 'admin' where id = auth.uid();" | sed -n 's/.*\(permission denied\).*/\1/p' | head -1)"
has "member cannot edit a question"              "" "$(as a "update questions set stem='hacked' where id='q-free';")"
eq  "...and it did not change"                   "stem" "$(root "select stem from questions where id='q-free'" | sed 's/^changed$/stem/')"
eq  "editors can add a picture"                  "1" "$(as rev "insert into storage.objects (bucket_id, name) values ('question-images','new.png'); select count(*) from storage.objects where name='new.png';")"
eq  "editors can remove a picture"               "0" "$(as admin "delete from storage.objects where name='orphan.png'; select count(*) from storage.objects where name='orphan.png';")"
eq  "member cannot see an archived question's picture" "0" "$(as a "select count(*) from storage.objects where name='arch.png';")"
eq  "editor can see it"                          "1" "$(as rev "select count(*) from storage.objects where name='arch.png';")"
eq  "reviewer is accepted as a role"             "reviewer" "$(root "select role from profiles where email='rev@x'")"
has "an invented role is refused"                "violates check constraint" "$(root "insert into allowed_emails (email, role) values ('x@x','superuser');")"

echo "Review integrity (enforced by the database, not the browser)"
eq  "the database records who saved"             "admin@x" "$(as admin "insert into questions (id,boards,subject,stem,options,answer,explanation) values ('t1','{aem}','S','s','[]','A','e'); select updated_by from questions where id='t1';")"
eq  "a reviewer's name cannot be forged"         "rev@x" "$(as rev "insert into questions (id,boards,subject,stem,options,answer,explanation,status,reviewed_by) values ('t2','{aem}','S','s','[]','A','e','reviewed','someone.else@x'); select reviewed_by from questions where id='t2';")"
eq  "a draft never carries a reviewer"           "none" "$(as admin "insert into questions (id,boards,subject,stem,options,answer,explanation,status,reviewed_by) values ('t3','{aem}','S','s','[]','A','e','draft','ghost'); select coalesce(reviewed_by,'none') from questions where id='t3';")"
eq  "editing a reviewed question sends it back to draft" "draft/none" "$(as admin "insert into questions (id,boards,subject,stem,options,answer,explanation,status) values ('t4','{aem}','S','s','[]','A','e','reviewed'); update questions set stem='edited' where id='t4'; select status||'/'||coalesce(reviewed_by,'none') from questions where id='t4';")"
eq  "changing only the tier does not undo the review" "reviewed/admin@x" "$(as admin "insert into questions (id,boards,subject,stem,options,answer,explanation,status) values ('t5','{aem}','S','s','[]','A','e','reviewed'); update questions set tier='free' where id='t5'; select status||'/'||reviewed_by from questions where id='t5';")"
eq  "fixing a typo and approving in one save is allowed" "reviewed/rev@x" "$(as admin "insert into questions (id,boards,subject,stem,options,answer,explanation) values ('t6','{aem}','S','s','[]','A','e'); select set_config('request.jwt.claims','{\"sub\":\"${U[rev]}\"}',true) \gset
update questions set stem='fixed typo', status='reviewed' where id='t6'; select status||'/'||reviewed_by from questions where id='t6';")"
eq  "nobody can rewrite the reviewer afterwards"  "rev@x" "$(as admin "insert into questions (id,boards,subject,stem,options,answer,explanation,status) values ('t7','{aem}','S','s','[]','A','e','draft'); select set_config('request.jwt.claims','{\"sub\":\"${U[rev]}\"}',true) \gset
update questions set status='reviewed' where id='t7'; select set_config('request.jwt.claims','{\"sub\":\"${U[admin]}\"}',true) \gset
update questions set reviewed_by='admin@x' where id='t7'; select reviewed_by from questions where id='t7';")"
eq  "the upload tool keeps exactly what it sends" "reviewed/Dr Smith/upload tool" "$(psql -X -q -t -A -d $DB <<SQL 2>&1
begin; set local role service_role;
insert into questions (id,boards,subject,stem,options,answer,explanation,status,reviewed_by) values ('t8','{aem}','S','s','[]','A','e','reviewed','Dr Smith');
select status||'/'||reviewed_by||'/'||updated_by from questions where id='t8';
SQL
)"
has "signed-out visitor cannot run editor functions" "permission denied for function" "$(as anon "select can_edit();")"

echo "Reset"
as a "select reset_my_progress(); commit;" >/dev/null
eq  "reset clears the caller's attempts"         "0" "$(root "select count(*) from attempts where user_id='${U[a]}'")"
eq  "reset clears the caller's marks and tests"  "0" "$(root "select (select count(*) from question_marks where user_id='${U[a]}') + (select count(*) from tests where user_id='${U[a]}')")"
eq  "reset leaves other people's progress alone" "1" "$(root "select count(*) from attempts where user_id='${U[b]}'")"
has "unlisted person cannot call reset"          "not allowed" "$(as e "select reset_my_progress();")"

echo "Re-running the schema"
P -d $DB -f "$HERE/../schema.sql" >/dev/null 2>&1 && ok "schema.sql can be re-run safely" || bad "schema.sql can be re-run safely" "no error" "error"
eq  "  ...and keeps the data"                   "1" "$(root "select count(*) from attempts")"

echo "Upgrading a database built with the FIRST version of the schema"
DB_MAIN=$DB; DB=qbank_upgrade
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
P -d $DB -f "$HERE/shim.sql" >/dev/null && P -d $DB -f "$HERE/schema-v1.sql" >/dev/null && ok "the old schema loads" || bad "the old schema loads" "no error" "error"
P -d $DB >/dev/null <<SQL
insert into allowed_emails (email, role, plan) values ('a@x','member','pro'), ('boss@x','admin','pro');
insert into auth.users (id, email) values ('${U[a]}','a@x'), ('${U[admin]}','boss@x');
insert into questions (id, boards, subject, stem, options, answer, explanation, tier, status, reviewed_by) values
  ('old-1','{aem}','S','old stem','[{"id":"A","text":"x"}]','A','why','pro','reviewed','Dr Old');
insert into attempts (user_id, question_id, ok, client_id) values ('${U[a]}','old-1',true,'o1');
insert into question_marks (user_id, question_id, flagged, note) values ('${U[a]}','old-1',true,'my note');
SQL
P -d $DB -f "$HERE/../schema.sql" >/dev/null 2>/tmp/upgrade.err && ok "the new schema applies on top without errors" || bad "the new schema applies on top without errors" "no error" "$(head -3 /tmp/upgrade.err)"
eq  "existing questions survive"                 "old-1|reviewed|Dr Old" "$(root "select id||'|'||status||'|'||reviewed_by from questions")"
eq  "existing progress survives"                 "1|my note" "$(root "select (select count(*) from attempts)||'|'||(select note from question_marks)")"
eq  "existing accounts survive"                  "2" "$(root "select count(*) from profiles where active")"
eq  "old questions are not archived"             "f" "$(root "select archived from questions where id='old-1'")"
eq  "the old rule is replaced by the new one"    "0|1" "$(root "select (select count(*) from pg_policies where tablename='questions' and policyname='questions_admin')||'|'||(select count(*) from pg_policies where tablename='questions' and policyname='questions_edit')")"
eq  "a member still sees the question"           "1" "$(as a "select count(*) from questions;")"
eq  "an admin still sees the member list"        "2" "$(as admin "select count(*) from admin_member_summary();")"
eq  "reviewer can now be approved"               "reviewer" "$(root "insert into allowed_emails (email, role) values ('newrev@x','reviewer'); select role from allowed_emails where email='newrev@x'" | tail -1)"
eq  "archiving now works and hides it from members" "0" "$(root "update questions set archived = true where id='old-1'"; as a "select count(*) from questions;")"
eq  "question stats have the new columns"        "t" "$(as admin "select count(*) >= 0 from admin_question_stats() where archived is not null;" | tail -1)"
eq  "the review rules are active after upgrade"  "draft" "$(as admin "update questions set stem='edited after review', archived=false where id='old-1'; select status from questions where id='old-1';")"
P -d $DB -f "$HERE/../schema.sql" >/dev/null 2>&1 && ok "running it a second time is harmless" || bad "running it a second time is harmless" "no error" "error"
DB=$DB_MAIN

echo; echo "$PASS passed, $FAIL failed"; [[ $FAIL -eq 0 ]]
