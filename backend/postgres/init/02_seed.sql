-- 1. 유저 정보가 없으면 넣고, 있으면 이름/이메일 정보 업데이트
INSERT INTO users (user_id, name, email, created_at) 
VALUES ('gnu_test01', 'gnu_test01', 'gnutest011@gmail.com', '2026-04-06 07:04:21')
ON CONFLICT (user_id) DO UPDATE SET 
  name = EXCLUDED.name, 
  email = EXCLUDED.email;

-- 2. 벡터 값 강제 고정 (추천 결과 63점을 위해 이전 값으로 덮어쓰기)
INSERT INTO user_interest_vectors (user_id, study, exercise, culture, game, religion, volunteer)
VALUES ('gnu_test01', 8, 5, 2, 9, 0, 4)
ON CONFLICT (user_id) DO UPDATE SET 
  study = 8, 
  exercise = 5, 
  culture = 2, 
  game = 9, 
  religion = 0, 
  volunteer = 4;