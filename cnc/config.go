package main

import (
	"encoding/json"
	"log"
	"os"
)

type Config struct {
	Database DatabaseConfig `json:"database"`
	Security SecurityConfig `json:"security"`
}

type DatabaseConfig struct {
	Type       string `json:"type"`
	DBPath     string `json:"db_path"`
	MongoDBURI string `json:"mongodb_uri"`
	MongoDBDB  string `json:"mongodb_db"`
}

type SecurityConfig struct {
	RateLimitPerMin int      `json:"rate_limit_per_min"`
	MaxBodyBytes    int64    `json:"max_body_bytes"`
	AllowedOrigins  []string `json:"allowed_origins"`
	EncryptionKey   string   `json:"encryption_key"`
}

var appConfig Config

func loadConfig() {
	paths := []string{"config.json", "../config.json"}
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err == nil {
			if err := json.Unmarshal(data, &appConfig); err != nil {
				log.Fatalf("failed to parse config.json: %v", err)
			}
			log.Printf("[config] loaded from %s (database type: %s)", p, appConfig.Database.Type)
			return
		}
	}
	appConfig = Config{
		Database: DatabaseConfig{Type: "sqlite", DBPath: "db", MongoDBDB: "levl7"},
		Security: SecurityConfig{RateLimitPerMin: 20, MaxBodyBytes: 1 << 20},
	}
	log.Println("[config] no config.json found, using defaults (sqlite)")
}

func (c *Config) UseMongoDB() bool {
	return c.Database.Type == "mongodb" && c.Database.MongoDBURI != ""
}
