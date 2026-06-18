migrate((db) => {
  const dao = new Dao(db);
  const users = dao.findCollectionByNameOrId("users");
  const schema = users.schema;
  
  schema.addField(new SchemaField({
    name: "preset_avatar",
    type: "text",
    required: false
  }));
  
  users.schema = schema;
  dao.saveCollection(users);
}, (db) => {
  const dao = new Dao(db);
  const users = dao.findCollectionByNameOrId("users");
  const schema = users.schema;
  
  schema.removeField("preset_avatar");
  users.schema = schema;
  dao.saveCollection(users);
});
