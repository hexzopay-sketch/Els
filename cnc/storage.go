package main

import (
	"log"
	"time"
)

type Broadcast struct {
	ID        string    `json:"id"`
	Text      string    `json:"text"`
	EndTime   string    `json:"end_time"`
	MediaURL  string    `json:"media_url"`
	Caption   string    `json:"caption"`
	CreatedBy string    `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}

type StorageBackend interface {
	Init() error
	SaveUser(u User) error
	GetUserByUsername(username string) (User, bool)
	DeleteUser(username string) error
	GetAllUsers() ([]User, error)
	SavePlan(p Plan) error
	DeletePlan(name string) error
	GetAllPlans() ([]Plan, error)
	SaveMethod(m Method) error
	DeleteMethod(name string) error
	GetAllMethods() ([]Method, error)
	SaveOngoingAttack(a Attack) error
	DeleteOngoingAttack(id string) error
	GetAllOngoingAttacks() ([]Attack, error)
	SaveSession(token, username string) error
	GetSessionUsername(token string) (string, bool)
	SaveBot(b BotConnection) error
	GetAllBots() ([]BotConnection, error)
	SaveProof(p Proof) error
	DeleteProof(id string) error
	GetAllProofs() ([]Proof, error)
	SaveBroadcast(b Broadcast) error
	DeleteBroadcast(id string) error
	GetAllBroadcasts() ([]Broadcast, error)
	GetActiveBroadcasts() ([]Broadcast, error)
	SaveWorker(w Worker) error
	GetAllWorkers() ([]Worker, error)
	DeleteWorker(id string) error
	GetWorkerByID(id string) (Worker, bool)
	SaveGitHubConfig(cfg GitHubConfig) error
	GetGitHubConfig() (GitHubConfig, error)
}

var storage StorageBackend

func initStorage() {
	loadConfig()
	if appConfig.Database.DBPath != "" {
		dbPath = appConfig.Database.DBPath
	}
	if appConfig.UseMongoDB() {
		storage = &MongoDBBackend{}
		log.Println("[storage] using MongoDB backend")
	} else {
		storage = &SQLiteBackend{}
		log.Println("[storage] using SQLite backend")
	}
	if err := storage.Init(); err != nil {
		log.Fatalf("[storage] init failed: %v", err)
	}
}
