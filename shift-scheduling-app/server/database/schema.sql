-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  google_id VARCHAR(255) UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  username VARCHAR(255)
);

-- Availability table
CREATE TABLE IF NOT EXISTS availability (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  week DATE,
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  status INTEGER NOT NULL DEFAULT 0,
  year INTEGER,
  iso_week INTEGER
);

-- Indexes and constraints for availability
CREATE INDEX IF NOT EXISTS idx_availability_user_week ON availability(user_id, week);
ALTER TABLE availability ADD CONSTRAINT unique_availability 
  UNIQUE (user_id, week, day_of_week, start_time, end_time);

-- Manager schedules table
CREATE TABLE IF NOT EXISTS manager_schedules (
  id SERIAL PRIMARY KEY,
  week DATE NOT NULL,
  year INTEGER NOT NULL,
  iso_week INTEGER NOT NULL,
  schedule_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  option_number INTEGER NOT NULL DEFAULT 1,
  is_selected BOOLEAN NOT NULL DEFAULT false
);

-- Indexes and constraints for manager_schedules
CREATE INDEX IF NOT EXISTS idx_manager_schedules_week ON manager_schedules(week);
ALTER TABLE manager_schedules ADD CONSTRAINT unique_selected_schedule 
  UNIQUE (week, is_selected);
ALTER TABLE manager_schedules ADD CONSTRAINT manager_schedules_week_option_number_key 
  UNIQUE (week, option_number);

-- Trigger function for manager schedules
CREATE OR REPLACE FUNCTION enforce_single_selected_schedule()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_selected THEN
        UPDATE manager_schedules
        SET is_selected = FALSE
        WHERE week = NEW.week AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER IF NOT EXISTS ensure_single_selected_schedule
BEFORE INSERT OR UPDATE ON manager_schedules
FOR EACH ROW
EXECUTE FUNCTION enforce_single_selected_schedule();

-- Insert initial employee user
INSERT INTO users (email, password, name, role, username)
VALUES ('sarah.garson.santos@gmail.com', '12345', 'Sarah Garson', 'employee', 'sarahgarson')
ON CONFLICT (email) DO NOTHING;

-- Updated manager role
UPDATE users SET role = 'manager' WHERE email = 'sasa.garson.santos@gmail.com';

-- Troubleshooting redirection for users roles
-- To check the current user set up
SELECT * FROM users WHERE email = 'sarah.garson.santos@gmail.com';

-- Inserting users again to make sure deploy sees them
INSERT INTO users (email, password, name, role, username)
VALUES 
    ('sarah.garson.santos@gmail.com', 'hashedpassword', 'Sarah Garson', 'employee', 'sarahgarson'),
    ('john.bonjovi@gmail.com', 'hashedpassword', 'John Bon Jovi', 'employee', 'johnbonjovi'),
    ('beyonce.pop@gmail.com', 'hashedpassword', 'Beyoncé', 'employee', 'beyoncepop')
ON CONFLICT (email) DO NOTHING;


-- Inserting manager user
INSERT INTO users (email, password, name, role, username, google_id)
VALUES 
    ('sasa.garson.santos@gmail.com', NULL, 'Sasa Garson', 'manager', 'sasagarson', '117571476391017283917')
ON CONFLICT (email) DO NOTHING;

--no password set for the employees: want to set it like this instead of hashing it
UPDATE users
SET password = '123456'
WHERE email = 'john.bonjovi@gmail.com';

UPDATE users
SET password = '1234567'
WHERE email = 'beyonce.pop@gmail.com';

INSERT INTO users (email, password, name, created_at, role, username)
VALUES ('testing.manager@google.com', '12345678', 'Testing Manager', NOW(), 'manager', 'testingmanager');
