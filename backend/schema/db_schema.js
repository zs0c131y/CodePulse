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
                    bsonType: ["string", "null"]
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
// OAUTH ACCOUNTS
// =========================================

db.createCollection("oauth_accounts", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["provider", "provider_user_id", "user_id", "created_at"],
            properties: {
                provider: {
                    enum: ["github", "gitlab"]
                },
                provider_user_id: {
                    bsonType: "string"
                },
                user_id: {
                    bsonType: "objectId"
                },
                provider_email: {
                    bsonType: "string"
                },
                provider_name: {
                    bsonType: "string"
                },
                provider_access_token: {
                    bsonType: "string"
                },
                updated_at: {
                    bsonType: "date"
                },
                created_at: {
                    bsonType: "date"
                }
            }
        }
    }
});

db.oauth_accounts.createIndex({ provider: 1, provider_user_id: 1 }, { unique: true });
db.oauth_accounts.createIndex({ user_id: 1 });

// =========================================
// OAUTH STATES
// =========================================

db.createCollection("oauth_states", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["provider", "intent", "state_hash", "created_at", "expires_at"],
            properties: {
                provider: { enum: ["github", "gitlab"] },
                intent: { enum: ["signin", "connect"] },
                user_id: { bsonType: ["objectId", "null"] },
                state_hash: { bsonType: "string" },
                created_at: { bsonType: "date" },
                expires_at: { bsonType: "date" }
            }
        }
    }
});

db.oauth_states.createIndex({ state_hash: 1 }, { unique: true });
db.oauth_states.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

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
                repo_full_name: {
                    bsonType: "string"
                },
                repo_url: {
                    bsonType: "string"
                },
                clone_url: {
                    bsonType: "string"
                },
                default_branch: {
                    bsonType: "string"
                },
                status: {
                    enum: ["queued", "running", "completed", "failed"]
                },
                scan_id: { bsonType: "string" },
                commit_limit: { bsonType: "int" },
                error: { bsonType: ["string", "null"] },
                worker_id: { bsonType: ["string", "null"] },
                lease_expires_at: { bsonType: ["date", "null"] },
                queued_at: { bsonType: ["date", "null"] },
                started_at: { bsonType: ["date", "null"] },
                completed_at: { bsonType: ["date", "null"] },
                failed_at: { bsonType: ["date", "null"] },
                total_files: {
                    bsonType: "int"
                },
                total_commits: {
                    bsonType: "int"
                },
                total_dependencies: {
                    bsonType: "int"
                },
                total_documentation: {
                    bsonType: "int"
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

db.repositories.createIndex({ user_id: 1, updated_at: -1, _id: -1 });
db.repositories.createIndex({ user_id: 1, repo_url: 1 }, { unique: true });

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
                file_name: {
                    bsonType: "string"
                },
                extension: {
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
                },
                depth: {
                    bsonType: "int"
                }
            }
        }
    }
});

db.repo_files.createIndex({ repository_id: 1, file_path: 1, _id: 1 });

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
                author_email: {
                    bsonType: "string"
                },
                message: {
                    bsonType: "string"
                },
                commit_date: {
                    bsonType: "date"
                },
                changed_files: {
                    bsonType: "array",
                    items: {
                        bsonType: "string"
                    }
                }
            }
        }
    }
});

db.commits.createIndex({ repository_id: 1, commit_hash: 1 }, { unique: true });
db.commits.createIndex({ repository_id: 1, commit_date: -1, _id: -1 });

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
                },
                import_path: {
                    bsonType: "string"
                },
                resolved: {
                    bsonType: "bool"
                }
            }
        }
    }
});

db.dependencies.createIndex({ repository_id: 1, source_file: 1, target_file: 1, _id: 1 });

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
                file_name: {
                    bsonType: "string"
                },
                documentation_type: {
                    bsonType: "string"
                },
                content_summary: {
                    bsonType: "string"
                },
                content: {
                    bsonType: "string"
                },
                size: {
                    bsonType: "int"
                },
                truncated: {
                    bsonType: "bool"
                }
            }
        }
    }
});

db.documentation.createIndex({ repository_id: 1, doc_path: 1, _id: 1 });

// =========================================
// STRUCTURED CODE & DOCUMENTATION FACTS
// =========================================

db.createCollection("code_analysis_summaries", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["repository_id", "scan_id", "analysis_version", "metrics"],
            properties: {
                repository_id: { bsonType: "objectId" },
                scan_id: { bsonType: "string" },
                analysis_version: { bsonType: "int" },
                metrics: { bsonType: "object" },
                modules: { bsonType: "array" },
                routes: { bsonType: "array" },
                orphan_files: { bsonType: "array" },
                skipped_files: { bsonType: "array" },
                totals: { bsonType: "object" },
                truncated: { bsonType: "object" },
                analyzed_at: { bsonType: "date" },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.code_analysis_summaries.createIndex({ repository_id: 1 }, { unique: true });

db.createCollection("code_facts", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["repository_id", "scan_id", "file_path", "language"],
            properties: {
                repository_id: { bsonType: "objectId" },
                scan_id: { bsonType: "string" },
                file_path: { bsonType: "string" },
                module_path: { bsonType: "string" },
                module_name: { bsonType: "string" },
                language: { bsonType: "string" },
                is_test: { bsonType: "bool" },
                line_count: { bsonType: "number" },
                metrics: { bsonType: "object" },
                imports: { bsonType: "array" },
                exports: { bsonType: "array" },
                functions: { bsonType: "array" },
                classes: { bsonType: "array" },
                routes: { bsonType: "array" },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.code_facts.createIndex({ repository_id: 1, scan_id: 1, file_path: 1 }, { unique: true });
db.code_facts.createIndex({ repository_id: 1, scan_id: 1, module_path: 1, file_path: 1 });

db.createCollection("documentation_analysis_summaries", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["repository_id", "scan_id", "analysis_version", "metrics", "coverage"],
            properties: {
                repository_id: { bsonType: "objectId" },
                scan_id: { bsonType: "string" },
                analysis_version: { bsonType: "int" },
                metrics: { bsonType: "object" },
                coverage: { bsonType: "object" },
                facts: { bsonType: "object" },
                totals: { bsonType: "object" },
                truncated: { bsonType: "object" },
                analyzed_at: { bsonType: "date" },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.documentation_analysis_summaries.createIndex({ repository_id: 1 }, { unique: true });

db.createCollection("documentation_facts", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["repository_id", "scan_id", "doc_path"],
            properties: {
                repository_id: { bsonType: "objectId" },
                scan_id: { bsonType: "string" },
                doc_path: { bsonType: "string" },
                documentation_type: { bsonType: "string" },
                title: { bsonType: "string" },
                truncated: { bsonType: "bool" },
                headings: { bsonType: "array" },
                setup: { bsonType: "object" },
                api: { bsonType: "object" },
                architecture: { bsonType: "object" },
                source_references: { bsonType: "array" },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.documentation_facts.createIndex({ repository_id: 1, scan_id: 1, doc_path: 1 }, { unique: true });

// =========================================
// ANALYSIS SCORES
// =========================================

db.createCollection("repository_scores", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["repository_id"],
            properties: {
                repository_id: { bsonType: "objectId" },
                analysis_version: { bsonType: "int" },
                health_score: { bsonType: "number" },
                health_trend: {
                    bsonType: "array",
                    items: { bsonType: "number" }
                },
                technical_debt: { bsonType: "object" },
                knowledge_debt: { bsonType: "object" },
                drift: { bsonType: "object" },
                risk: { bsonType: "object" },
                recommendations_ready: { bsonType: "int" },
                analyzed_at: { bsonType: "date" },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.repository_scores.createIndex({ repository_id: 1 }, { unique: true });

db.createCollection("repository_score_history", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["repository_id", "health_score", "risk_score", "analyzed_at"],
            properties: {
                repository_id: { bsonType: "objectId" },
                health_score: { bsonType: "number" },
                technical_debt_score: { bsonType: "number" },
                knowledge_debt_score: { bsonType: "number" },
                drift_score: { bsonType: "number" },
                risk_score: { bsonType: "number" },
                analyzed_at: { bsonType: "date" },
                created_at: { bsonType: "date" }
            }
        }
    }
});

db.repository_score_history.createIndex({ repository_id: 1, analyzed_at: -1 });

// =========================================
// TECHNICAL DEBT METRICS
// =========================================

db.createCollection("technical_debt_metrics", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["repository_id", "file_path"],
            properties: {
                repository_id: { bsonType: "objectId" },
                file_path: { bsonType: "string" },
                owner: { bsonType: "string" },
                size: { bsonType: "number" },
                complexity: { bsonType: "number" },
                complexity_method: { bsonType: "string" },
                churn_percent: { bsonType: "number" },
                observed_churn_percent: { bsonType: "number" },
                churn_available: { bsonType: "bool" },
                contributor_count: { bsonType: "number" },
                contributor_concentration_percent: { bsonType: "number" },
                bug_fix_count: { bsonType: "number" },
                bug_fix_percent: { bsonType: "number" },
                duplication_percent: { bsonType: ["number", "null"] },
                dependency_depth: { bsonType: "number" },
                last_changed_at: { bsonType: ["date", "null"] },
                is_large_file: { bsonType: "bool" },
                is_high_complexity: { bsonType: "bool" },
                is_circular: { bsonType: "bool" },
                is_orphan: { bsonType: "bool" },
                is_stale: { bsonType: "bool" },
                dependency_graph_available: { bsonType: "bool" },
                debt_score: { bsonType: "number" },
                risk: { bsonType: "string" },
                reasons: {
                    bsonType: "array",
                    items: { bsonType: "string" }
                },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.technical_debt_metrics.createIndex({ repository_id: 1, file_path: 1 }, { unique: true });
db.technical_debt_metrics.createIndex({ repository_id: 1, debt_score: -1, file_path: 1 });

// =========================================
// KNOWLEDGE DEBT METRICS
// =========================================

db.createCollection("knowledge_debt_metrics", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["repository_id", "module_path"],
            properties: {
                repository_id: { bsonType: "objectId" },
                module_path: { bsonType: "string" },
                documented: { bsonType: "bool" },
                missing_reason: { bsonType: ["string", "null"] },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.knowledge_debt_metrics.createIndex({ repository_id: 1, module_path: 1 }, { unique: true });

// =========================================
// DRIFT FINDINGS
// =========================================

db.createCollection("drift_findings", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: [
                "repository_id",
                "finding_key",
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
                finding_key: {
                    bsonType: "string"
                },
                title: {
                    bsonType: "string"
                },
                file_path: {
                    bsonType: ["string", "null"]
                },
                module_path: {
                    bsonType: ["string", "null"]
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
                evidence: {},
                age_days: {
                    bsonType: ["number", "null"]
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

db.drift_findings.createIndex({ repository_id: 1, finding_key: 1 }, { unique: true });
db.drift_findings.createIndex({ repository_id: 1, severity: 1 });

// =========================================
// RECOMMENDATIONS
// =========================================

db.createCollection("recommendations", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["repository_id", "recommendation_key", "title", "impact"],
            properties: {
                repository_id: { bsonType: "objectId" },
                recommendation_key: { bsonType: "string" },
                title: { bsonType: "string" },
                impact: { enum: ["Low", "Medium", "High", "Critical"] },
                effort: { bsonType: "string" },
                reason: { bsonType: "string" },
                steps: {
                    bsonType: "array",
                    items: { bsonType: "string" }
                },
                order: { bsonType: "int" },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.recommendations.createIndex({ repository_id: 1, recommendation_key: 1 }, { unique: true });
db.recommendations.createIndex({ repository_id: 1, impact: 1 });

// =========================================
// DURABLE REPORT SNAPSHOTS
// =========================================

db.createCollection("reports", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["owner_id", "repository_id", "schema", "schema_version", "snapshot", "generated_at"],
            properties: {
                owner_id: { bsonType: "objectId" },
                repository_id: { bsonType: "objectId" },
                schema: { bsonType: "string" },
                schema_version: { bsonType: "int" },
                snapshot: { bsonType: "object" },
                generated_at: { bsonType: "date" },
                source_analyzed_at: { bsonType: ["date", "null"] },
                share_token_hash: { bsonType: "string" },
                shared_at: { bsonType: "date" },
                share_expires_at: { bsonType: "date" },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.reports.createIndex({ owner_id: 1, created_at: -1, _id: -1 });
db.reports.createIndex({ owner_id: 1, repository_id: 1, created_at: -1, _id: -1 });
db.reports.createIndex(
    { share_token_hash: 1 },
    {
        unique: true,
        partialFilterExpression: { share_token_hash: { $type: "string" } }
    }
);

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
print("- oauth_accounts");
print("- oauth_states");
print("- repositories");
print("- repo_files");
print("- commits");
print("- dependencies");
print("- documentation");
print("- code_analysis_summaries");
print("- code_facts");
print("- documentation_analysis_summaries");
print("- documentation_facts");
print("- repository_scores");
print("- repository_score_history");
print("- technical_debt_metrics");
print("- knowledge_debt_metrics");
print("- drift_findings");
print("- recommendations");
print("- reports");
print("==================================");
