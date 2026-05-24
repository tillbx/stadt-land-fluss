migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("rooms");
  
  const schema = collection.schema;
  let exists = false;
  try {
    const field = schema.getFieldByName("code");
    if (field) exists = true;
  } catch (e) {}

  if (!exists) {
    schema.addField(new SchemaField({
      name: "code",
      type: "text",
      required: false
    }));
    collection.schema = schema;
    dao.saveCollection(collection);
  }
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("rooms");
  const schema = collection.schema;
  schema.removeField("code");
  collection.schema = schema;
  dao.saveCollection(collection);
});
