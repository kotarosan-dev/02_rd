-- いいね数を増やす関数
create or replace function increment_likes(post_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update forum_posts
  set likes = likes + 1
  where id = post_id;
end;
$$;

-- いいね数を減らす関数
create or replace function decrement_likes(post_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update forum_posts
  set likes = greatest(likes - 1, 0)
  where id = post_id;
end;
$$; 