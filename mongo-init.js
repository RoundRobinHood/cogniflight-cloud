let pilot_info_schema = {
  bsonType: "object",
  required: [ "license_nr", "certification_expiry", "flight_hours" ],

  properties: {
    face_embeddings: {
      bsonType: "array",
      items: {
        bsonType: "array",
        items: {
          bsonType: "number",
        },
      },
    },

    license_nr: { bsonType: "string" },
    certification_expiry: { bsonType: "date" },
    initial_flight_hours: { bsonType: "number" },
    baseline: { bsonType: "object" },

    environment_preferences: {
      bsonType: "object",
      required: [ "noise_sensitivity", "light_sensitivity", "cabin_temperature_preferences" ],

      properties: {
        noise_sensitivity: {
          bsonType: "string",
          enum: [ "low", "medium", "high" ],
        },
        light_sensitivity: {
          bsonType: "string",
          enum: [ "low", "medium", "high" ],
        },
        cabin_temperature_preferences: {
          bsonType: "object",
          required: [ "optimal_temperature", "tolerance_range" ],
          properties: {
            optimal_temperature: { bsonType: "number" },
            tolerance_range: { bsonType: "number" },
          },
        },

      },
    },
  },
};

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [ "name", "email", "pwd", "role", "created_at" ],

      properties: {
        name: {
          bsonType: "string",
          description: "User full name / username - required",
        },

        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Valid email address - required and unique",
        },

        phone: {
          bsonType: "string",
          pattern: "^[0-9]+$",
          description: "User phone number",
        },

        pwd: {
          bsonType: "string",
          description: "Hashed password - required",
        },

        role: {
          enum: ["pilot", "atc", "sysadmin"],
          description: "User role - must be one of enum values",
        },

        pilot_info: pilot_info_schema,

        created_at: { bsonType: "date" },
      },
    }
  }
});

db.users.createIndex({ email: 1 }, { unique: true });

db.createCollection("sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [ "sess_id", "user_id", "role", "created_at", "expires_at" ],
      properties: {
        sess_id: { bsonType: "string" },
        user_id: { bsonType: "objectId" },
        role: {
          bsonType: "string",
          enum: [ "pilot", "atc", "sysadmin" ]
        },
        created_at: { bsonType: "date" },
        expires_at: { bsonType: "date" },
      },
    },
  },
});

db.sessions.createIndex({ sess_id: 1 }, { unique: true });
db.sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

db.createCollection("alerts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [ "pilot_id", "timestamp", "fusion_score", "interpretation" ],
      properties: {
        pilot_id: { bsonType: "objectId" },
        timestamp: { bsonType: "date" },
        fusion_score: { bsonType: "number" },
        interpretation: { bsonType: "string" },
        user_explanation: { bsonType: "string" },
      },
    },
  },
});

db.createCollection("key_store", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [ "salt", "hash_iterations", "key" ],
      properties: {
        salt: { bsonType: "binData" },
        hash_iterations: { bsonType: "int" },
        key: { bsonType: "binData" },
        edge_id: { bsonType: "objectId" },
      },
    },
  },
});

db.key_store.createIndex({ key: 1, hash_iterations: 1 }, { unique: 1 });

db.createCollection("edge_nodes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [ "plane_info" ],
      properties: {
        plane_info: {
          bsonType: "object",
          required: [ "tail_nr", "manufacturer", "model", "year" ],
          properties: {
            tail_nr: { bsonType: "string" },
            manufacturer: { bsonType: "string" },
            model: { bsonType: "string" },
            year: { bsonType: "int" },
          },
        },
      },
    },
  },
});

db.edge_nodes.createIndex({ 'plane_info.tail_nr': 1, 'plane_info.manufacturer': 1, 'plane_info.model': 1, 'plane_info.year': 1 }, { unique: 1 });

db.createCollection("flights", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [ "edge_id", "pilot_id", "start_time" ],
      properties: {
        edge_id: { bsonType: "objectId" },
        pilot_id: { bsonType: "objectId" },
        start_time: { bsonType: "date" },
        duration: { bsonType: "long" },
      },
    },
  },
});

db.flights.createIndex({ edge_id: 1, pilot_id: 1 });

db.createCollection("signup_tokens", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [ "tok_str", "role", "created_at", "expires_at" ],
      properties: {
        tok_str: { bsonType: "string" },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        },
        phone: {
          bsonType: "string",
          pattern: "^[0-9]+$",
        },
        role: {
          bsonType: "string",
          enum: [ "pilot", "atc", "sysadmin" ],
        },
        pilot_info: pilot_info_schema,
        created_at: { bsonType: "date" },
        expires_at: { bsonType: "date" },
      },
      anyOf: [
        { "required": [ "email" ] },
        { "required": [ "phone" ] },
      ],
    },
  },
});

db.signup_tokens.createIndex({ tok_str: 1 }, { unique: true });
db.signup_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

db.createCollection("user_images", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [ "user_id", "file_id", "filename", "mimetype", "created_at" ],
      properties: {
        user_id: { bsonType: "objectId" },
        file_id: { bsonType: "objectId" },
        filename: { bsonType: "string" },
        mimetype: { bsonType: "string" },
        created_at: { bsonType: "date" },
      },
    },
  },
});

db.user_images.createIndex({ file_id: 1 }, { unique: true });
db.user_images.createIndex({ user_id: 1 });
