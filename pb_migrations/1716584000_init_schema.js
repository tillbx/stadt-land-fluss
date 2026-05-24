migrate((db) => {
  const dao = new Dao(db);

  // 1. Rooms Collection
  const rooms = new Collection({
    name: "rooms",
    type: "base",
    schema: [
      {
        name: "host_id",
        type: "text",
        required: false
      },
      {
        name: "status",
        type: "text",
        required: true
      },
      {
        name: "code",
        type: "text",
        required: true
      },
      {
        name: "settings",
        type: "json",
        required: false,
        options: {
          maxSize: 2000000
        }
      },
      {
        name: "current_round",
        type: "number",
        required: false
      },
      {
        name: "current_letter",
        type: "text",
        required: false
      },
      {
        name: "timer_ends_at",
        type: "text",
        required: false
      },
      {
        name: "timer_duration",
        type: "number",
        required: false
      },
      {
        name: "letters_used",
        type: "json",
        required: false,
        options: {
          maxSize: 2000000
        }
      },
      {
        name: "stop_triggered_by",
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
  dao.saveCollection(rooms);

  // 2. Players Collection
  const players = new Collection({
    name: "players",
    type: "base",
    schema: [
      {
        name: "room_id",
        type: "text",
        required: true
      },
      {
        name: "name",
        type: "text",
        required: true
      },
      {
        name: "is_host",
        type: "bool",
        required: false
      },
      {
        name: "is_ready",
        type: "bool",
        required: false
      },
      {
        name: "points_total",
        type: "number",
        required: false
      },
      {
        name: "last_active",
        type: "text",
        required: false
      },
      {
        name: "session_id",
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
  dao.saveCollection(players);

  // 3. Answers Collection
  const answers = new Collection({
    name: "answers",
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
        required: true
      },
      {
        name: "round_num",
        type: "number",
        required: true
      },
      {
        name: "answers",
        type: "json",
        required: false,
        options: {
          maxSize: 2000000
        }
      },
      {
        name: "points",
        type: "json",
        required: false,
        options: {
          maxSize: 2000000
        }
      },
      {
        name: "votes",
        type: "json",
        required: false,
        options: {
          maxSize: 2000000
        }
      },
      {
        name: "hearts",
        type: "json",
        required: false,
        options: {
          maxSize: 2000000
        }
      },
      {
        name: "is_submitted",
        type: "bool",
        required: false
      }
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: ""
  });
  dao.saveCollection(answers);
}, (db) => {
  const dao = new Dao(db);

  // Down migration
  const roomsCol = dao.findCollectionByNameOrId("rooms");
  if (roomsCol) dao.deleteCollection(roomsCol);

  const playersCol = dao.findCollectionByNameOrId("players");
  if (playersCol) dao.deleteCollection(playersCol);

  const answersCol = dao.findCollectionByNameOrId("answers");
  if (answersCol) dao.deleteCollection(answersCol);
});
