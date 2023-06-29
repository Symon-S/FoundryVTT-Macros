const Database = {
  Actors: game.actors.size,
  Items: game.items.size,
  Messages: game.messages.size,
  Scenes: game.scenes.size,
  Journals: game.journal.size,
  Tables: game.tables.size,
};
ChatMessage.create({content: JSON.stringify(Database, null, 2) });
