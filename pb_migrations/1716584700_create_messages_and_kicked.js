migrate((db) => {
  const dao = new Dao(db);

  // 1. Add is_kicked to players collection
  const players = dao.findCollectionByNameOrId("players");
  const schema = players.schema;
  
  schema.addField(new SchemaField({
    name: "is_kicked",
    type: "bool",
    required: false
  }));
  
  players.schema = schema;
  dao.saveCollection(players);

  // 2. Create messages collection
  const messages = new Collection({
    name: "messages",
    type: "base",
    schema: [
      {
        name: "room_id",
        type: "text",
        required: true
      },
      {
        name: "player_id",
        type: "text",
        required: false
      },
      {
        name: "player_name",
        type: "text",
        required: true
      },
      {
        name: "text",
        type: "text",
        required: true
      },
      {
        name: "type",
        type: "text",
        required: true
      },
      {
        name: "avatar",
        type: "text",
        required: false
      }
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: ""
  });
  dao.saveCollection(messages);
}, (db) => {
  const dao = new Dao(db);

  // 1. Remove is_kicked from players
  const players = dao.findCollectionByNameOrId("players");
  if (players) {
    const schema = players.schema;
    schema.removeField("is_kicked");
    players.schema = schema;
    dao.saveCollection(players);
  }

  // 2. Delete messages collection
  const messages = dao.findCollectionByNameOrId("messages");
  if (messages) {
    dao.deleteCollection(messages);
  }
});
