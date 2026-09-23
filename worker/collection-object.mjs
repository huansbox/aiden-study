import { DurableObject } from "cloudflare:workers";
import "../docs/shared/collection-core.js";
const C = globalThis.KidsCollectionCore;

export class ChildCollection extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, payload TEXT NOT NULL)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS practice (id TEXT PRIMARY KEY, round_id TEXT, entry_id TEXT NOT NULL, generation INTEGER NOT NULL DEFAULT 0)");
    if (!this.sql.exec("PRAGMA table_info(practice)").toArray().some((column) => column.name === "generation")) {
      this.ctx.storage.transactionSync(() => {
        this.sql.exec("ALTER TABLE practice ADD COLUMN generation INTEGER NOT NULL DEFAULT 0");
        this.sql.exec("UPDATE practice SET generation=COALESCE((SELECT json_extract(payload,'$.generation') FROM commands WHERE commands.id=practice.id),0)");
      });
    }
  }
  readState() { const row = this.sql.exec("SELECT json FROM state WHERE id=1").toArray()[0]; return row ? JSON.parse(row.json) : C.empty(); }
  view(day) { return C.snapshot(this.readState(), day); }
  execute(command) {
    try { return this.ctx.storage.transactionSync(() => {
      C.check(command && typeof command.commandId === "string" && /^[a-zA-Z0-9:._-]{1,160}$/.test(command.commandId), "操作識別不正確");
      const payload = JSON.stringify(command), id = command.type === "round" ? "round:" + command.event?.roundId : command.commandId;
      const duplicate = this.sql.exec("SELECT payload FROM commands WHERE id=?", id).toArray()[0];
      if (duplicate) {
        // 同一回合的通知可從重開頁面再次送出，但不重算一轮。
        C.check(duplicate.payload === payload || command.type === "round" && JSON.parse(duplicate.payload).event.entryId === command.event?.entryId, "同一操作識別不能改成另一份內容", 409);
        return { snapshot: C.snapshot(this.readState()), duplicate: true };
      }
      const nextCommand = { ...command };
      if (["record", "round"].includes(command.type)) {
        C.check(!command.event?.roundId || typeof command.event.roundId === "string" && /^[a-zA-Z0-9:._-]{1,160}$/.test(command.event.roundId), "回合識別不正確");
      }
      if (command.type === "round") nextCommand.hasPractice = Boolean(this.sql.exec("SELECT id FROM practice WHERE round_id=? AND entry_id=? AND generation=? LIMIT 1", command.event?.roundId || "", command.event?.entryId || "", command.generation).toArray().length);
      const state = C.apply(this.readState(), nextCommand);
      this.sql.exec("INSERT INTO state(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json", JSON.stringify(state));
      this.sql.exec("INSERT INTO commands(id,payload) VALUES(?,?)", id, payload);
      if (command.type === "record") this.sql.exec("INSERT INTO practice(id,round_id,entry_id,generation) VALUES(?,?,?,?)", id, command.event.roundId || null, command.event.entryId, command.generation);
      return { snapshot: C.snapshot(state), duplicate: false };
    }); } catch (error) { return { error: error.message, status: error.status || 500 }; }
  }
}
