migrate((db) => {
  const dao = new Dao(db);

  // 1. Extend Users Collection
  const users = dao.findCollectionByNameOrId("users");
  const usersSchema = users.schema;
  
  usersSchema.addField(new SchemaField({
    name: "points_total",
    type: "number",
    required: false
  }));
  
  usersSchema.addField(new SchemaField({
    name: "wins_total",
    type: "number",
    required: false
  }));
  
  usersSchema.addField(new SchemaField({
    name: "games_total",
    type: "number",
    required: false
  }));
  
  users.schema = usersSchema;
  // Make users public listable and viewable for the leaderboard
  users.listRule = "";
  users.viewRule = "";
  dao.saveCollection(users);

  // 2. Extend Players Collection
  const players = dao.findCollectionByNameOrId("players");
  const playersSchema = players.schema;
  
  playersSchema.addField(new SchemaField({
    name: "user_id",
    type: "text",
    required: false
  }));
  
  players.schema = playersSchema;
  dao.saveCollection(players);

  // 3. Create Match History Collection
  const matchHistory = new Collection({
    name: "match_history",
    type: "base",
    schema: [
      {
        name: "code",
        type: "text",
        required: true
      },
      {
        name: "categories",
        type: "json",
        required: false,
        options: {
          maxSize: 2000000
        }
      },
      {
        name: "players",
        type: "json",
        required: true,
        options: {
          maxSize: 2000000
        }
      },
      {
        name: "rounds",
        type: "number",
        required: true
      },
      {
        name: "ended_at",
        type: "text",
        required: true
      }
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: ""
  });
  dao.saveCollection(matchHistory);
}, (db) => {
  const dao = new Dao(db);

  // Revert match_history
  try {
    const matchHistory = dao.findCollectionByNameOrId("match_history");
    if (matchHistory) {
      dao.deleteCollection(matchHistory);
    }
  } catch (e) {}

  // Revert players
  try {
    const players = dao.findCollectionByNameOrId("players");
    const playersSchema = players.schema;
    playersSchema.removeField("user_id");
    players.schema = playersSchema;
    dao.saveCollection(players);
  } catch (e) {}

  // Revert users
  try {
    const users = dao.findCollectionByNameOrId("users");
    const usersSchema = users.schema;
    usersSchema.removeField("points_total");
    usersSchema.removeField("wins_total");
    usersSchema.removeField("games_total");
    users.schema = usersSchema;
    users.listRule = "id = @request.auth.id"; // restore original restriction if any
    users.viewRule = "id = @request.auth.id";
    dao.saveCollection(users);
  } catch (e) {}
});
