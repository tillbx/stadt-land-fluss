migrate((db) => {
  const dao = new Dao(db);
  const matchHistory = dao.findCollectionByNameOrId("match_history");
  if (matchHistory) {
    const categories = matchHistory.schema.getFieldByName("categories");
    if (categories) {
      categories.options = { maxSize: 2000000 };
    }
    const players = matchHistory.schema.getFieldByName("players");
    if (players) {
      players.options = { maxSize: 2000000 };
    }
    dao.saveCollection(matchHistory);
  }
}, (db) => {
  const dao = new Dao(db);
  const matchHistory = dao.findCollectionByNameOrId("match_history");
  if (matchHistory) {
    const categories = matchHistory.schema.getFieldByName("categories");
    if (categories) {
      categories.options = {};
    }
    const players = matchHistory.schema.getFieldByName("players");
    if (players) {
      players.options = {};
    }
    dao.saveCollection(matchHistory);
  }
});
