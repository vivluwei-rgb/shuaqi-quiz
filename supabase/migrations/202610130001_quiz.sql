create table public.quiz_codes (
  code text primary key check (code ~ '^[A-Z0-9-]{1,64}$'),
  max_uses integer not null default 3 check (max_uses between 1 and 1000),
  used integer not null default 0 check (used >= 0 and used <= max_uses),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.quiz_attempts (
  id text primary key,
  code text not null references public.quiz_codes(code),
  created_at timestamptz not null default now(),
  completed boolean not null default false,
  result_id text
);
create table public.quiz_results (
  id text primary key,
  code text not null references public.quiz_codes(code),
  attempt_id text unique references public.quiz_attempts(id),
  answers jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index quiz_results_created_at_idx on public.quiz_results(created_at desc);
create index quiz_attempts_code_idx on public.quiz_attempts(code);
alter table public.quiz_codes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_results enable row level security;
revoke all on public.quiz_codes, public.quiz_attempts, public.quiz_results from anon, authenticated;
grant all on public.quiz_codes, public.quiz_attempts, public.quiz_results to service_role;

-- Each RPC executes in one transaction; row locks serialize starts and submissions.
create or replace function public.quiz_dispatch(p_route text, p_body jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_code public.quiz_codes;
  v_attempt public.quiz_attempts;
  v_result public.quiz_results;
  v_text text;
  v_id text;
  v_count integer;
  v_max integer;
  v_prefix text;
  v_created jsonb := '[]'::jsonb;
begin
  if p_route = 'start' then
    v_text := upper(trim(coalesce(p_body->>'password', '')));
    select * into v_code from public.quiz_codes where code = v_text for update;
    if not found or not v_code.active then
      return jsonb_build_object('status', 403, 'error', '密码不存在或已停用');
    end if;
    if v_code.used >= v_code.max_uses then
      return jsonb_build_object('status', 403, 'error', '这个密码的测试机会已用完');
    end if;
    update public.quiz_codes set used = used + 1 where code = v_text;
    v_id := 'try_' || replace(gen_random_uuid()::text, '-', '');
    insert into public.quiz_attempts(id, code) values(v_id, v_text);
    return jsonb_build_object('attemptToken', v_id, 'code', v_text,
      'remaining', v_code.max_uses - v_code.used - 1);
  elsif p_route = 'complete' then
    select * into v_attempt from public.quiz_attempts where id = p_body->>'attemptToken' for update;
    if not found then
      return jsonb_build_object('status', 403, 'error', '测试会话不存在，请重新输入密码开始');
    end if;
    if v_attempt.completed then
      select * into v_result from public.quiz_results where id = v_attempt.result_id;
    else
      v_id := 'res_' || replace(gen_random_uuid()::text, '-', '');
      insert into public.quiz_results(id, code, attempt_id, answers, result)
        values(v_id, v_attempt.code, v_attempt.id, p_body->'answers', p_body->'result')
        returning * into v_result;
      update public.quiz_attempts set completed = true, result_id = v_id where id = v_attempt.id;
    end if;
    return jsonb_build_object('id', v_result.id, 'createdAt', v_result.created_at, 'result', v_result.result);
  elsif p_route = 'result' then
    select * into v_result from public.quiz_results where id = p_body->>'id';
    if not found then return jsonb_build_object('status', 404, 'error', '没有找到这个结果'); end if;
    return jsonb_build_object('id', v_result.id, 'createdAt', v_result.created_at, 'result', v_result.result);
  elsif p_route = 'admin/state' then
    return jsonb_build_object(
      'codes', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'maxUses', max_uses,
        'used', used, 'active', active, 'createdAt', created_at) order by created_at desc, code)
        from public.quiz_codes), '[]'::jsonb),
      'results', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'code', code,
        'createdAt', created_at, 'name', result->'profile'->>'name',
        'playPercent', result->'scores'->'playPercent', 'grindPercent', result->'scores'->'grindPercent')
        order by created_at desc) from public.quiz_results), '[]'::jsonb),
      'stats', jsonb_build_object('codes', (select count(*) from public.quiz_codes),
        'used', (select coalesce(sum(used), 0) from public.quiz_codes),
        'capacity', (select coalesce(sum(max_uses), 0) from public.quiz_codes),
        'results', (select count(*) from public.quiz_results)));
  elsif p_route in ('admin/codes', 'admin/codes/batch') then
    v_max := coalesce((p_body->>'maxUses')::integer, 3);
    if v_max < 1 or v_max > 1000 then
      return jsonb_build_object('status', 400, 'error', '次数必须是 1 到 1000 的整数');
    end if;
    if p_route = 'admin/codes' then
      v_text := upper(trim(coalesce(p_body->>'code', '')));
      if v_text !~ '^[A-Z0-9-]{1,64}$' then
        return jsonb_build_object('status', 400, 'error', '密码请使用字母、数字或短横线，最多 64 位');
      end if;
      insert into public.quiz_codes(code, max_uses) values(v_text, v_max) on conflict do nothing;
      if not found then return jsonb_build_object('status', 409, 'error', '这个密码已存在'); end if;
      return jsonb_build_object('ok', true);
    end if;
    v_count := coalesce((p_body->>'count')::integer, 50);
    if v_count < 1 or v_count > 1000 then
      return jsonb_build_object('status', 400, 'error', '生成数量必须是 1 到 1000 的整数');
    end if;
    v_prefix := regexp_replace(upper(coalesce(p_body->>'prefix', 'SQ')), '[^A-Z0-9]', '', 'g');
    v_prefix := left(coalesce(nullif(v_prefix, ''), 'SQ'), 16);
    while jsonb_array_length(v_created) < v_count loop
      v_text := v_prefix || '-' || upper(replace(gen_random_uuid()::text, '-', ''));
      insert into public.quiz_codes(code, max_uses) values(v_text, v_max) on conflict do nothing;
      if found then v_created := v_created || jsonb_build_array(v_text); end if;
    end loop;
    return jsonb_build_object('ok', true, 'created', v_created);
  elsif p_route = 'admin/codes/update' then
    v_text := upper(trim(coalesce(p_body->>'code', '')));
    select * into v_code from public.quiz_codes where code = v_text for update;
    if not found then return jsonb_build_object('status', 404, 'error', '密码不存在'); end if;
    v_max := coalesce((p_body->>'maxUses')::integer, v_code.max_uses);
    if v_max < 1 or v_max > 1000 or
      (not coalesce((p_body->>'resetUsed')::boolean, false) and v_max < v_code.used) then
      return jsonb_build_object('status', 400, 'error', '可用次数不能小于已使用次数');
    end if;
    update public.quiz_codes set active = coalesce((p_body->>'active')::boolean, active),
      max_uses = v_max,
      used = case when coalesce((p_body->>'resetUsed')::boolean, false) then 0 else used end
      where code = v_text;
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('status', 404, 'error', '接口不存在');
end;
$$;
revoke execute on function public.quiz_dispatch(text, jsonb) from public, anon, authenticated;
grant execute on function public.quiz_dispatch(text, jsonb) to service_role;
