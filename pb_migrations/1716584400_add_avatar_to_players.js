migrate((db) => {
  const dao = new Dao(db);
  const players = dao.findCollectionByNameOrId("players");
  const schema = players.schema;
  
  schema.addField(new SchemaField({
    name: "avatar",
    type: "text",
    required: false
  }));
  
  players.schema = schema;
  dao.saveCollection(players);
}, (db) => {
  const dao = new Dao(db);
  const players = dao.findCollectionByNameOrId("players");
  const schema = players.schema;
  
  schema.removeField("avatar");
  players.schema = schema;
  dao.saveCollection(players);
});
