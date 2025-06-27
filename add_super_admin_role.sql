-- Add super-admin role to the roles table
INSERT INTO roles (name) VALUES ('super-admin') ON CONFLICT (name) DO NOTHING;

-- Create a super-admin user (optional - you can create this manually)
-- INSERT INTO users (email, password, role_id) 
-- SELECT 'superadmin@company.com', '$2b$10$your_hashed_password_here', r.id 
-- FROM roles r WHERE r.name = 'super-admin';

-- Grant super-admin role to existing admin user (optional)
-- UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'super-admin') 
-- WHERE email = 'admin@company.com'; 