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

func (s *FakeUserStore) UpdateUser(ID primitive.ObjectID, update types.UserUpdate, ctx context.Context) (*types.User, error) {
	if s.Users == nil {
		s.Users = map[string]types.User{}
	}

	for _, user := range s.Users {
		if user.ID == ID {
			if update.Name != "" {
				user.Name = update.Name
			}
			if update.Email != "" {
				user.Email = update.Email
			}
			if update.Role != "" {
				user.Role = update.Role
			}
			if update.Phone != "" {
				user.Phone = update.Phone
			}
			if update.ProfileImage.Provided {
				user.ProfileImage = update.ProfileImage.Value
			}
			if update.PilotInfo.Provided {
				if update.PilotInfo.Value == nil {
					user.PilotInfo = nil
				} else {
					updated := *update.PilotInfo.Value
					if user.PilotInfo == nil {
						user.PilotInfo = &types.PilotInfo{
							FaceEmbeddings:     nil,
							LicenseNr:          updated.LicenseNr,
							InitialFlightHours: updated.InitialFlightHours.Value,
							Baseline:           updated.Baseline.Value,
							EnvironmentPref: types.PilotEnvPref{
								NoiseSensitivity: updated.EnvironmentPref.NoiseSensitivity,
								LightSensitivity: updated.EnvironmentPref.LightSensitivity,
								CabinTempPref: types.PilotCabintempPref{
									OptimalTemp:    updated.EnvironmentPref.CabinTempPref.OptimalTemp.Value,
									ToleranceRange: updated.EnvironmentPref.CabinTempPref.ToleranceRange.Value,
								},
							},
						}
						return &user, nil
					} else {
						if updated.LicenseNr != "" {
							user.PilotInfo.LicenseNr = updated.LicenseNr
						}
						if updated.InitialFlightHours.Provided {
							user.PilotInfo.InitialFlightHours = updated.InitialFlightHours.Value
						}
						if updated.CertificateExpiry.Provided {
							user.PilotInfo.CertificateExpiry = updated.CertificateExpiry.Value
						}
						if updated.Baseline.Provided {
							user.PilotInfo.Baseline = updated.Baseline.Value
						}
						if updated.EnvironmentPref.NoiseSensitivity != "" {
							user.PilotInfo.EnvironmentPref.NoiseSensitivity = updated.EnvironmentPref.NoiseSensitivity
						}
						if updated.EnvironmentPref.LightSensitivity != "" {
							user.PilotInfo.EnvironmentPref.LightSensitivity = updated.EnvironmentPref.LightSensitivity
						}
						if updated.EnvironmentPref.CabinTempPref.OptimalTemp.Provided {
							user.PilotInfo.EnvironmentPref.CabinTempPref.OptimalTemp = updated.EnvironmentPref.CabinTempPref.OptimalTemp.Value
						}
						if updated.EnvironmentPref.CabinTempPref.ToleranceRange.Provided {
							user.PilotInfo.EnvironmentPref.CabinTempPref.ToleranceRange = updated.EnvironmentPref.CabinTempPref.ToleranceRange.Value
						}
					}
				}
			}
			return &user, nil
		}
	}

	return nil, types.ErrUserNotExist
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
	sess := types.Session{
		ID:        ID,
		SessID:    sessID,
		UserID:    UserID,
		Role:      Role,
		ExpiresAt: time.Now().Add(time.Hour * 2),
		CreatedAt: time.Now(),
	}

	s.Sessions[sessID] = sess

	s.SessID = sessID
	return &sess, nil
}

func (s *FakeSessionStore) GetSession(SessID string, ctx context.Context) (*types.Session, error) {
	session, ok := s.Sessions[SessID]

	if !ok {
		return nil, types.ErrSessionNotExist
	} else {
		return &session, nil
	}
}

func (s *FakeSessionStore) DeleteSession(SessID string, ctx context.Context) (*types.Session, error) {
	session, ok := s.Sessions[SessID]

	if !ok {
		return nil, types.ErrSessionNotExist
	} else {
		delete(s.Sessions, SessID)
		return &session, nil
	}
}
