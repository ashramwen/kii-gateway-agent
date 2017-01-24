/// <reference types="node" />
import low = require('lowdb');
import fs = require('fs');
const dir = './resource';
export function init() {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  let db = new low('./resource/db.json');
  db.defaults({ app: {}, user: {}, gateway: {}, endNodes: [] }).value();
}
init();
