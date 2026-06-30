CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE repositories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    repo_name VARCHAR(255),
    repo_url TEXT,
    default_branch VARCHAR(100),
    total_files INTEGER,
    total_commits INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE repo_files (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id),
    file_path TEXT,
    file_type VARCHAR(50),
    language VARCHAR(50),
    size BIGINT
);

CREATE TABLE commits (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id),
    commit_hash VARCHAR(64),
    author VARCHAR(255),
    message TEXT,
    commit_date TIMESTAMP
);

CREATE TABLE dependencies (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id),
    source_file TEXT,
    target_file TEXT,
    dependency_type VARCHAR(50)
);

CREATE TABLE documentation (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id),
    doc_path TEXT,
    content_summary TEXT
);

CREATE TABLE drift_findings (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id),
    drift_type VARCHAR(100),
    description TEXT,
    severity VARCHAR(20),
    evidence TEXT
);