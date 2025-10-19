package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

func ListenMQTT(ctx context.Context) *util.EventHandler[types.MQTTMessage] {
	event_handler := util.NewEventHandler[types.MQTTMessage]()
	go func() {
		messageHandler := func(client mqtt.Client, msg mqtt.Message) {
			edge_id, found := strings.CutPrefix(msg.Topic(), "cogniflight/telemetry/")
			if !found {
				log.Println("Invalid topic received: ", msg.Topic())
				return
			}

			var payload map[string]any
			if err := json.Unmarshal(msg.Payload(), &payload); err != nil {
				log.Println("Received invalid json: ", err)
				return
			}

			event_handler.Emit(types.MQTTMessage{
				EdgeUsername: edge_id,
				Payload:      payload,
			})
		}

		insecure_skip_verify := false
		if os.Getenv("MQTT_INSECURE_SKIP_VERIFY") == "true" {
			insecure_skip_verify = true
		}

		opts := mqtt.NewClientOptions().
			AddBroker(os.Getenv("MQTT_URL")).
			SetClientID(util.RandHex(20)).
			SetUsername("internal-backend-" + util.RandHex(10)).
			SetPassword(os.Getenv("MQTT_KEY")).
			SetAutoReconnect(true).
			SetConnectRetry(true).
			SetConnectRetryInterval(2 * time.Second).
			SetOnConnectHandler(func(c mqtt.Client) {
				for {
					if token := c.Subscribe("cogniflight/telemetry/+", 1, messageHandler); token.Wait() && token.Error() != nil {
						log.Println("subscribe error: ", token.Error())
						<-time.After(2 * time.Second)
					} else {
						break
					}
				}
			}).
			SetConnectionLostHandler(func(c mqtt.Client, err error) {
				log.Println("MQTT connection lost: ", err)
			}).
			SetTLSConfig(&tls.Config{
				InsecureSkipVerify: insecure_skip_verify,
			})

		client := mqtt.NewClient(opts)
		if token := client.Connect(); token.Wait() && token.Error() != nil {
			panic(fmt.Errorf("couldn't connect to broker: %w", token.Error()))
		}

		defer client.Disconnect(250)
		<-ctx.Done()
	}()

	return event_handler
}
