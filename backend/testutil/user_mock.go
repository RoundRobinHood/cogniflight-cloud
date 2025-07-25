package testutil

import (
	"context"
	"time"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"github.com/RoundRobinHood/cogniflight-cloud/backend/util"
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

func (s *FakeUserStore) GetUserByID(ID primitive.ObjectID, ctx context.Context) (*types.User, error) {
	for _, user := range s.Users {
		if user.ID == ID {
			return &user, nil
		}
	}

	return nil, types.ErrUserNotExist
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
	sessID, err := util.GenerateToken()
	if err != nil {
		return nil, err
	}

	if s.Sessions == nil {
		s.Sessions = map[string]types.Session{}
	}
	ID := primitive.NewObjectID()
	s.Sessions[sessID] = types.Session{
		ID:        ID,
		SessID:    sessID,
		UserID:    UserID,
		Role:      Role,
		CreatedAt: time.Now(),
	}

	s.SessID = sessID
	return &types.Session{
		ID:        ID,
		SessID:    sessID,
		UserID:    UserID,
		Role:      Role,
		CreatedAt: time.Now(),
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
