// =========================================
// CodePulse Database Setup
// =========================================

// Create / Switch Database
// use codepulse;

// =========================================
// USERS
// =========================================

db.createCollection("users", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["name", "email", "password_hash", "email_verified"],
            properties: {
                name: {
                    bsonType: "string"
                },
                email: {
                    bsonType: "string"
                },
                password_hash: {
                    bsonType: "string"
                },
                email_verified: {
                    bsonType: "bool"
                },
                profile: {
                    bsonType: "object",
                    properties: {
                        title: {
                            bsonType: "string"
                        },
                        company: {
                            bsonType: "string"
                        },
                        timezone: {
                            bsonType: "string"
                        },
                        location: {
                            bsonType: "string"
                        },
                        bio: {
                            bsonType: "string"
                        }
                    }
                },
                settings: {
                    bsonType: "object",
                    properties: {
                        theme: {
                            enum: ["system", "light", "dark"]
                        },
                        density: {
                            enum: ["compact", "comfortable", "spacious"]
                        },
                        scan_frequency: {
                            enum: ["manual", "daily", "weekly"]
                        },
                        ai_summary_level: {
                            enum: ["concise", "balanced", "detailed"]
                        },
                        email_notifications: {
                            bsonType: "bool"
                        },
                        weekly_digest: {
                            bsonType: "bool"
                        },
                        risk_alerts: {
                            bsonType: "bool"
                        },
                        drift_alerts: {
                            bsonType: "bool"
                        }
                    }
                },
                created_at: {
                    bsonType: "date"
                },
                updated_at: {
                    bsonType: "date"
                }
            }
        }
    }
});

db.users.createIndex({ email: 1 }, { unique: true });

// =========================================
// AUTH SESSIONS
// =========================================

db.createCollection("auth_sessions", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "token_hash", "created_at", "expires_at"],
            properties: {
                user_id: {
                    bsonType: "objectId"
                },
                token_hash: {
                    bsonType: "string"
                },
                user_agent: {
                    bsonType: "string"
                },
                ip: {
                    bsonType: "string"
                },
                created_at: {
                    bsonType: "date"
                },
                expires_at: {
                    bsonType: "date"
                },
                revoked_at: {
                    bsonType: ["date", "null"]
                }
            }
        }
    }
});

db.auth_sessions.createIndex({ token_hash: 1 }, { unique: true });
db.auth_sessions.createIndex({ user_id: 1 });
db.auth_sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

// =========================================
// AUTH ATTEMPTS
// =========================================

db.createCollection("auth_attempts", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["key", "email", "ip", "failures", "updated_at"],
            properties: {
                key: {
                    bsonType: "string"
                },
                email: {
                    bsonType: "string"
                },
                ip: {
                    bsonType: "string"
                },
                failures: {
                    bsonType: "int"
                },
                locked_until: {
                    bsonType: "date"
                },
                created_at: {
                    bsonType: "date"
                },
                updated_at: {
                    bsonType: "date"
                }
            }
        }
    }
});

db.auth_attempts.createIndex({ key: 1 }, { unique: true });
db.auth_attempts.createIndex({ updated_at: 1 }, { expireAfterSeconds: 3600 });

// =========================================
// EMAIL VERIFICATION TOKENS
// =========================================

db.createCollection("email_verification_tokens", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "email", "token_hash", "created_at", "expires_at"],
            properties: {
                user_id: {
                    bsonType: "objectId"
                },
                email: {
                    bsonType: "string"
                },
                token_hash: {
                    bsonType: "string"
                },
                created_at: {
                    bsonType: "date"
                },
                expires_at: {
                    bsonType: "date"
                }
            }
        }
    }
});

db.email_verification_tokens.createIndex({ token_hash: 1 }, { unique: true });
db.email_verification_tokens.createIndex({ user_id: 1 });
db.email_verification_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

// =========================================
// PASSWORD RESET TOKENS
// =========================================

db.createCollection("password_reset_tokens", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "email", "token_hash", "created_at", "expires_at"],
            properties: {
                user_id: {
                    bsonType: "objectId"
                },
                email: {
                    bsonType: "string"
                },
                token_hash: {
                    bsonType: "string"
                },
                created_at: {
                    bsonType: "date"
                },
                expires_at: {
                    bsonType: "date"
                },
                used_at: {
                    bsonType: ["date", "null"]
                }
            }
        }
    }
});

db.password_reset_tokens.createIndex({ token_hash: 1 }, { unique: true });
db.password_reset_tokens.createIndex({ user_id: 1 });
db.password_reset_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

// =========================================
// REPOSITORIES
// =========================================

db.createCollection("repositories", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: [
                "user_id",
                "repo_name",
                "repo_url"
            ],
            properties: {
                user_id: {
                    bsonType: "objectId"
                },
                repo_name: {
                    bsonType: "string"
                },
                repo_url: {
                    bsonType: "string"
                },
                default_branch: {
                    bsonType: "string"
                },
                total_files: {
                    bsonType: "int"
                },
                total_commits: {
                    bsonType: "int"
                },
                created_at: {
                    bsonType: "date"
                }
            }
        }
    }
});

db.repositories.createIndex({ user_id: 1 });

// =========================================
// REPO FILES
// =========================================

db.createCollection("repo_files", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: [
                "repository_id",
                "file_path"
            ],
            properties: {
                repository_id: {
                    bsonType: "objectId"
                },
                file_path: {
                    bsonType: "string"
                },
                file_type: {
                    bsonType: "string"
                },
                language: {
                    bsonType: "string"
                },
                size: {
                    bsonType: "int"
                }
            }
        }
    }
});

db.repo_files.createIndex({ repository_id: 1 });

// =========================================
// COMMITS
// =========================================

db.createCollection("commits", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: [
                "repository_id",
                "commit_hash"
            ],
            properties: {
                repository_id: {
                    bsonType: "objectId"
                },
                commit_hash: {
                    bsonType: "string"
                },
                author: {
                    bsonType: "string"
                },
                message: {
                    bsonType: "string"
                },
                commit_date: {
                    bsonType: "date"
                }
            }
        }
    }
});

db.commits.createIndex({ repository_id: 1 });
db.commits.createIndex({ commit_hash: 1 }, { unique: true });
db.commits.createIndex({ commit_date: -1 });

// =========================================
// DEPENDENCIES
// =========================================

db.createCollection("dependencies", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: [
                "repository_id",
                "source_file",
                "target_file"
            ],
            properties: {
                repository_id: {
                    bsonType: "objectId"
                },
                source_file: {
                    bsonType: "string"
                },
                target_file: {
                    bsonType: "string"
                },
                dependency_type: {
                    bsonType: "string"
                }
            }
        }
    }
});

db.dependencies.createIndex({ repository_id: 1 });

// =========================================
// DOCUMENTATION
// =========================================

db.createCollection("documentation", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: [
                "repository_id",
                "doc_path"
            ],
            properties: {
                repository_id: {
                    bsonType: "objectId"
                },
                doc_path: {
                    bsonType: "string"
                },
                content_summary: {
                    bsonType: "string"
                }
            }
        }
    }
});

db.documentation.createIndex({ repository_id: 1 });

// =========================================
// DRIFT FINDINGS
// =========================================

db.createCollection("drift_findings", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: [
                "repository_id",
                "drift_type",
                "severity"
            ],
            properties: {
                repository_id: {
                    bsonType: "objectId"
                },
                drift_type: {
                    bsonType: "string"
                },
                description: {
                    bsonType: "string"
                },
                severity: {
                    enum: [
                        "Low",
                        "Medium",
                        "High",
                        "Critical"
                    ]
                },
                evidence: {}
            }
        }
    }
});

db.drift_findings.createIndex({ repository_id: 1 });

// =========================================
// FINISHED
// =========================================

print("==================================");
print(" CodePulse Database Created");
print("==================================");
print("Collections:");
print("- users");
print("- auth_sessions");
print("- auth_attempts");
print("- email_verification_tokens");
print("- password_reset_tokens");
print("- repositories");
print("- repo_files");
print("- commits");
print("- dependencies");
print("- documentation");
print("- drift_findings");
print("==================================");
