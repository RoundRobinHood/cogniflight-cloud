db.createCollection("vfs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [ "type", "permissions", "timestamps" ],
      properties: {
        is_root: {
          bsonType: "bool",
          description: "Indicates if this is the root directory entry",
        },

        type: {
          bsonType: "int",
          enum: [ 0, 1 ],
          description: "Entry type: 0 = File, 1 = Directory",
        },

        permissions: {
          bsonType: "object",
          required: [ "read_tags", "write_tags", "execute_tags", "updatetag_tags" ],
          properties: {
            read_tags: {
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Tags with read access",
            },
            write_tags: {
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Tags with write access",
            },
            execute_tags: {
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Tags with execute/traverse access",
            },
            updatetag_tags: {
              bsonType: "array",
              items: { bsonType: "string" },
              description: "Tags with permission to update permission tags",
            },
          },
        },

        timestamps: {
          bsonType: "object",
          required: [ "created_at", "modified_at", "accessed_at" ],
          properties: {
            created_at: { bsonType: "date" },
            modified_at: { bsonType: "date" },
            accessed_at: { bsonType: "date" },
          },
        },

        entries: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: [ "name", "ref_id" ],
            properties: {
              name: { bsonType: "string", description: "Name of the file or directory" },
              ref_id: { bsonType: "objectId", description: "Reference to the FsEntry document" },
            },
          },
          description: "Directory entries (array of references to child FsEntry documents) - only for directories",
        },

        file_ref: {
          bsonType: "objectId",
          description: "GridFS file reference (only for files, not directories)",
        },
      },
    },
  },
});

db.vfs.createIndex({ is_root: 1, type: 1 });
