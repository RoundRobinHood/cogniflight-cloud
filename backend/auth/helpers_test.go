package auth

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/RoundRobinHood/jlogging"
	"github.com/gin-gonic/gin"
	"github.com/jeremiafourie/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FakeUserStore struct {
	Users        map[string]types.User
	CreateCalled bool
	Created      *types.User
}

func (s *FakeUserStore) GetUserByEmail(email string, ctx context.Context) (*types.User, error) {
	user, ok := s.Users[email]

	if !ok {
		return nil, types.ErrUserNotExist
	} else {
		return &user, nil
	}
}

func (s *FakeUserStore) CreateUser(User types.User, ctx context.Context) (*types.User, error) {
	if s.Users == nil {
		s.Users = map[string]types.User{}
	}

	s.Users[User.Email] = User
	s.CreateCalled = true
	s.Created = &User

	return &User, nil
}

type FakeSessionStore struct {
	Sessions     map[string]types.Session
	CreateCalled bool
	UserID       primitive.ObjectID
	Role         types.Role
	SessID       string
}

func (s *FakeSessionStore) CreateSession(UserID primitive.ObjectID, Role types.Role, ctx context.Context) (*types.Session, error) {
	s.CreateCalled = true
	s.UserID = UserID
	s.Role = Role
	sessID, err := GenerateToken()
	if err != nil {
		return nil, err
	}

	if s.Sessions == nil {
		s.Sessions = map[string]types.Session{}
	}
	s.Sessions[sessID] = types.Session{
		ID:        primitive.NewObjectID(),
		SessID:    sessID,
		UserID:    UserID,
		Role:      Role,
		CreatedAt: time.Now(),
	}

	s.SessID = sessID
	return &types.Session{
		ID:        primitive.NewObjectID(),
		UserID:    UserID,
		Role:      Role,
		CreatedAt: time.Now(),
		SessID:    sessID,
	}, nil
}

func (s FakeSessionStore) GetSession(SessID string, ctx context.Context) (*types.Session, error) {
	session, ok := s.Sessions[SessID]

	if !ok {
		return nil, types.ErrSessionNotExist
	} else {
		return &session, nil
	}
}

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
