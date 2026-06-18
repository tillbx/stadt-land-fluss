migrate((db) => {
  const dao = new Dao(db);
  const players = dao.findCollectionByNameOrId("players");
  const schema = players.schema;
  
  schema.addField(new SchemaField({
    name: "is_typing",
    type: "bool",
    required: false
  }));
  
  players.schema = schema;
  dao.saveCollection(players);
}, (db) => {
  const dao = new Dao(db);
  const players = dao.findCollectionByNameOrId("players");
  const schema = players.schema;
  
  schema.removeField("is_typing");
  players.schema = schema;
  dao.saveCollection(players);
});
