package uazapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type UazapiConfig struct {
	BaseURL, APIKey string
	HTTPClient      *http.Client
}

type TxtMessage struct {
	Number      string `json:"number"`
	Text        string `json:"text"`
	LinkPreview bool   `json:"linkPreview"`
}

func (c *UazapiConfig) SendTextMessage(msg TxtMessage) error {
	send_bytes, _ := json.Marshal(msg)

	req, _ := http.NewRequest("POST", c.BaseURL+"/send/text", bytes.NewReader(send_bytes))

	req.Header.Set("token", c.APIKey)

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body_bytes, err := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		if err != nil {
			return fmt.Errorf("non-200 status code (%d) (failed to get response body)", resp.StatusCode)
		} else {
			return fmt.Errorf("non-200 status code (%d), response body: \n%v\n", resp.StatusCode, string(body_bytes))
		}
	}

	return nil
}
