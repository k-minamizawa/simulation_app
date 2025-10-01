-- 1. flexsim_demo という名前のスキーマを作成します
CREATE SCHEMA `flexsim_demo`;

-- 2. 作成した flexsim_demo スキーマを使用することを宣言します
USE `flexsim_demo`;

-- 3. scenarios テーブルを作成します
CREATE TABLE scenarios (
    scenario_id INT PRIMARY KEY AUTO_INCREMENT,
    scenario_name VARCHAR(255) NOT NULL,
    description TEXT
);

-- 4. simulation_results テーブルを作成します
CREATE TABLE simulation_results (
    sim_result_id INT PRIMARY KEY AUTO_INCREMENT,
    scenario_id INT,
    replication INT NOT NULL,
    total_labor_costs DECIMAL(10, 2) NOT NULL,
    ontime_delivery_rate DECIMAL(5, 4) NOT NULL,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(scenario_id)
);