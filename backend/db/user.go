package db

import (
	"context"

	"github.com/RoundRobinHood/cogniflight-cloud/backend/types"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type DBUserStore struct {
	Col *mongo.Collection
}

func (s DBUserStore) GetUserByEmail(email string, ctx context.Context) (*types.User, error) {
	var result types.User
	err := s.Col.FindOne(ctx, bson.M{"email": email}).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrUserNotExist
		} else {
			return nil, err
		}
	}

	return &result, nil
}

func (s DBUserStore) GetUserByID(ID primitive.ObjectID, ctx context.Context) (*types.User, error) {
	var result types.User
	err := s.Col.FindOne(ctx, bson.M{"_id": ID}).Decode(&result)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrUserNotExist
		} else {
			return nil, err
		}
	}

	return &result, nil
}

func (s DBUserStore) CreateUser(User types.User, ctx context.Context) (*types.User, error) {
	inserted, err := s.Col.InsertOne(ctx, &User)
	if err != nil {
		return nil, err
	}
	User.ID = inserted.InsertedID.(primitive.ObjectID)

	return &User, nil
}

func (s DBUserStore) UpdateUser(ID primitive.ObjectID, update types.UserUpdate, ctx context.Context) (*types.User, error) {
	set := bson.M{}
	unset := bson.M{}
	if update.Name != "" {
		set["name"] = update.Name
	}
	if update.Email != "" {
		set["email"] = update.Email
	}
	if update.Phone != "" {
		set["phone"] = update.Phone
	}
	if update.PilotInfo.Provided {
		if update.PilotInfo.Value == nil {
			unset["pilotInfo"] = 1
		} else {
			beforeLen := len(set)
			pilotInfo := *update.PilotInfo.Value
			if pilotInfo.LicenseNr != "" {
				set["pilotInfo.licenseNr"] = pilotInfo.LicenseNr
			}
			if pilotInfo.FlightHours.Provided {
				set["pilotInfo.flightHours"] = pilotInfo.FlightHours.Value
			}
			if pilotInfo.Baseline.Provided {
				if pilotInfo.Baseline.Value == nil {
					unset["pilotInfo.baseline"] = 1
				} else {
					if len(pilotInfo.Baseline.Value) == 0 {
						set["pilotInfo.baseline"] = bson.M{}
					} else {
						for key, val := range pilotInfo.Baseline.Value {
							set["pilotInfo.baseline."+key] = val
						}
					}
				}
			}
			if pilotInfo.EnvironmentPref.CabinTempPref.OptimalTemp.Provided {
				set["pilotInfo.environmentPreferences.cabinTemperaturePreferences.optimalTemperature"] = pilotInfo.EnvironmentPref.CabinTempPref.OptimalTemp.Value
			}
			if pilotInfo.EnvironmentPref.CabinTempPref.ToleranceRange.Provided {
				set["pilotInfo.environmentPreferences.cabinTemperaturePreferences.toleranceRange"] = pilotInfo.EnvironmentPref.CabinTempPref.ToleranceRange.Value
			}
			if pilotInfo.EnvironmentPref.NoiseSensitivity != "" {
				set["pilotInfo.environmentPreferences.noiseSensitivity"] = pilotInfo.EnvironmentPref.NoiseSensitivity
			}
			if pilotInfo.EnvironmentPref.LightSensitivity != "" {
				set["pilotInfo.environmentPreferences.lightSensitivity"] = pilotInfo.EnvironmentPref.LightSensitivity
			}
			if len(set) == beforeLen {
				set["pilotInfo"] = bson.M{}
			}
		}
	}

	var updated types.User
	if err := s.Col.FindOneAndUpdate(ctx, bson.M{"_id": ID}, bson.M{"$set": set, "$unset": unset}, options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&updated); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, types.ErrUserNotExist
		} else {
			return nil, err
		}
	}

	return &updated, nil
}
