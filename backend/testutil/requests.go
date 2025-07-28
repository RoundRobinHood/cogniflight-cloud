package testutil

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
)

func FakeRequest(t testing.TB, r *gin.Engine, method, body, uri string, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()

	req := httptest.NewRequest(method, uri, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if headers != nil {
		for key, val := range headers {
			req.Header.Set(key, val)
		}
	}

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	return w
}

func InitTestEngine() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	r.Use(jlogging.Middleware())
	return r
}
