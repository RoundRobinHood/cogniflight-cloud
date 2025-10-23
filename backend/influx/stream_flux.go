package influx

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type InfluxDBConfig struct {
	URL, Token, Org string
}

func (cfg *InfluxDBConfig) StreamFlux(ctx context.Context, fluxQuery string, receive chan<- map[string]string) error {
	req, _ := http.NewRequest("POST", cfg.URL+"/api/v2/query?org="+cfg.Org, strings.NewReader(fluxQuery))
	req.Header.Set("Authorization", "Token "+cfg.Token)
	req.Header.Set("Content-Type", "application/vnd.flux")
	defer close(receive)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body_bytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("non-200 status code (%d), body: %q", resp.StatusCode, string(body_bytes))
	}

	var headers []string
	reader := csv.NewReader(resp.Body)
	reader.FieldsPerRecord = -1
	for {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		record, err := reader.Read()
		if err != nil {
			if err != io.EOF {
				return err
			} else {
				break
			}
		}

		if strings.HasPrefix(record[0], "#") {
			continue
		}

		if headers == nil || len(headers) != len(record) {
			headers = record
			continue
		}

		if len(record) == 0 {
			headers = nil
			continue
		}

		send := map[string]string{}
		for i, value := range record {
			send[headers[i]] = value
		}

		receive <- send
	}

	return nil
}
