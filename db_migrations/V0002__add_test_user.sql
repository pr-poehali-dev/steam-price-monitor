INSERT INTO users (id, username, avatar_url) 
VALUES (1, 'Test User', 'https://api.dicebear.com/7.x/avataaars/svg?seed=test')
ON CONFLICT (id) DO NOTHING;
