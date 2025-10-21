-- Migration: Add task tracking tables for Gantt chart functionality
-- Date: 2025-10-22

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    next_task_id INT NULL,
    FOREIGN KEY (next_task_id) REFERENCES tasks(task_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create tacts table
CREATE TABLE IF NOT EXISTS tacts (
    tact_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    next_tact_id INT NULL,
    FOREIGN KEY (next_tact_id) REFERENCES tacts(tact_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create works table
CREATE TABLE IF NOT EXISTS works (
    work_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create operators table
CREATE TABLE IF NOT EXISTS operators (
    operator_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create task_logs table
CREATE TABLE IF NOT EXISTS task_logs (
    task_log_id INT AUTO_INCREMENT PRIMARY KEY,
    scenario_id INT NOT NULL,
    replication INT NOT NULL,
    time_stamp VARCHAR(50) NOT NULL,
    task_id INT NOT NULL,
    tact_id INT NULL,
    work_id INT NOT NULL,
    operator_id INT NOT NULL,
    state ENUM('start', 'end', 'pause', 'resume') NOT NULL,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (tact_id) REFERENCES tacts(tact_id) ON DELETE SET NULL,
    FOREIGN KEY (work_id) REFERENCES works(work_id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES operators(operator_id) ON DELETE CASCADE,
    INDEX idx_scenario_replication (scenario_id, replication),
    INDEX idx_time_stamp (time_stamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
